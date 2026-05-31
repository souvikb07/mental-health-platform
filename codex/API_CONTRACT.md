# API Contract

Last updated: 2026-05-31.

This is the canonical Codex frontend/backend contract for the current Phase 1 MVP. Preserve these shapes unless a task explicitly approves a contract change.

## Common Behavior

- The product remains account-free. `POST /api/sessions` may issue an
  HttpOnly anonymous-owner cookie in Supabase mode.
- All current endpoints return JSON.
- Validation failures return HTTP 400 with:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please check your input."
  }
}
```

- Anonymous session creation is server-owned in Supabase mode. Downstream
  session-bound routes now verify the HttpOnly owner cookie and an unexpired
  owner-scoped session row before invoking business services. Opted-in
  context-intake/chat retention and Clarity Map replay are encrypted at rest.
- Browser-provided `sessionContext`, `lastRisk`, and `lastSafetyState` are hints only. Backend safety decisions must be recomputed server-side where safety matters.
- Browser mutation routes reject cross-site requests and mismatched `Origin`
  headers. Non-browser callers without `Origin` remain supported.
- Supabase-mode writes append raw-free safety, policy, model, and authorized
  action audit metadata without changing public response bodies.
- Supabase-mode routes enforce distributed fixed-window rate limits before
  existing service orchestration. Session-bound buckets use server-owned
  owner-plus-session subjects. Only HMAC digests reach Postgres.
- Supabase-mode data controls resolve the cookie owner server-side. They never
  accept owner IDs, owner hashes, or cookie tokens from the browser.

Safe route errors:

```txt
VALIDATION_ERROR          400
SAME_ORIGIN_REQUIRED      403
UNAUTHORIZED_SESSION      401
SESSION_NOT_FOUND         404
DATA_BACKEND_UNAVAILABLE  503
CHAT_TURN_IN_PROGRESS     409
CHAT_TURN_RETRY_UNAVAILABLE 409
CLARITY_MAP_IN_PROGRESS   409
RATE_LIMITED              429
```

## POST /api/sessions

Creates an anonymous MVP session context.

Request:

```ts
{
  country: string;
  ageConfirmed: true;
  consentAccepted: true;
  mainConcernCategory:
    | "overwhelmed"
    | "anxious_worried"
    | "low_numb_disconnected"
    | "work_study_stress"
    | "relationship_family"
    | "sleep_energy"
    | "not_sure";
  ageBand?: string;
  mainConcern?: string;
  mainConcernText?: string;
  storageConsentAccepted?: boolean; // defaults false
}
```

Visible onboarding country choices are currently `USA` and `India`. Backend normalizes known country values to `US` or `IN`; unknown/missing values normalize to `GLOBAL` in lower-level session/resource helpers.

Response:

```ts
{
  sessionId: string;
  sessionContext: SessionContext;
  status: "created";
  storageConsentAccepted: boolean;
  serverOwned: boolean;
  expiresAt?: string;
}
```

Transient mode returns a mock-compatible session with `serverOwned: false`.
Supabase mode atomically creates or reuses a hashed-cookie owner, creates one
session, records initial consent events, returns `serverOwned: true`, and sets
the HttpOnly `mindbridge_anon_owner` cookie. `sessionId` is a locator, not auth.

## GET /api/sessions

Hydrates one active cookie-owned anonymous journey for refresh and back
navigation. It is not a profile or history endpoint.

Optional query:

```txt
sessionId=<UUID locator>
```

Response:

```ts
{ status: "unavailable" } // transient mode
{ status: "empty" }       // no matching active cookie-owned journey
{
  status: "hydrated";
  serverOwned: true;
  expiresAt: string;
  retainedContentHydrated: boolean;
  sessionContext: SessionContext;
  messages: JourneyChatMessage[];
  clarityMap?: {
    type: "clarity_map";
    source: "openai" | "fallback";
    clarityMap: StructuredClarityMap;
  };
}
```

When `sessionId` is present, lookup is exact and owner-scoped. When omitted,
the latest active owner-scoped session is selected. The no-store payload omits
owner identifiers, hashes, claims, encryption envelopes, metadata rows, and
stored safety-state codes.

## POST /api/context-intake

Generates the first assistant opener from onboarding context, or returns a safety/boundary route if optional onboarding text is unsafe or out of product scope.

Request:

```ts
{
  sessionContext: {
    sessionId: string;
    countryCode: "US" | "IN";
    countryLabel?: string;
    ageConfirmed: true;
    consentAccepted: true;
    mainConcernCategory:
      | "overwhelmed"
      | "anxious_worried"
      | "low_numb_disconnected"
      | "work_study_stress"
      | "relationship_family"
      | "sleep_energy"
      | "not_sure";
    mainConcernLabel: string;
    mainConcernText?: string;
  }
}
```

`GLOBAL` is not accepted for this visible onboarding route. It remains an internal fallback elsewhere.

Responses:

```ts
{
  type: "opener";
  assistantMessage: ApiChatMessage;
  contextIntake: ContextIntakeResult;
  source: "openai" | "fallback";
}
```

```ts
{
  type: "safety";
  assistantMessage: ApiChatMessage;
  risk: ApiRiskClassification;
  safety: SafetyUi | null;
  resources: SupportResource[];
  source: "safety";
  persistenceStatus?: "unavailable";
}
```

```ts
{
  type: "boundary";
  assistantMessage: ApiChatMessage;
  policyBoundary: PolicyBoundaryResult;
  source: "boundary";
  persistenceStatus?: "unavailable";
}
```

Safety behavior:

- In Supabase mode, the owner cookie and `sessionContext.sessionId` are verified
  before Safety Core or opener generation runs.
- Optional `mainConcernText` runs through Safety Core before normal opener generation.
- High/imminent safety or blocking policy boundary does not call the context-intake model.
- Missing OpenAI config falls back deterministically.
- In Supabase mode, opted-in intake results are retained once and replayed.
  Opt-out intake text remains transient. Safety and boundary routes remain
  visible with `persistenceStatus: "unavailable"` if a post-evaluation write
  fails.

## POST /api/chat

Processes a user chat message through Safety Core, policy boundary, optional AI triage, and normal conversation.

Request:

```ts
{
  sessionId: string;
  message: string;
  sessionContext?: SessionContext;
  clientMessageId?: string; // UUID; enables retry replay
}
```

Response:

```ts
{
  assistantMessage: ApiChatMessage;
  risk: ApiRiskClassification;
  nextRecommendedAction:
    | "continue_chat"
    | "continue_with_supportive_nudge"
    | "show_resources"
    | "urgent_support";
  mode: "normal" | "support" | "crisis";
  safety: SafetyUi | null;
  resources: SupportResource[];
  source: "openai" | "fallback" | "safety" | "boundary";
  policyBoundary?: PolicyBoundaryResult;
  safetyState?: SafetyState;
  persistenceStatus?: "unavailable";
}
```

Safety behavior:

- In Supabase mode, the owner cookie and top-level `sessionId` are verified
  before Safety Core or normal conversation runs.
- Deterministic risk classification runs before normal conversation.
- Policy boundary runs before normal conversation for diagnosis, medication, treatment protocol, medical advice, therapy replacement, prompt injection, self-harm method requests, dependency requests, and out-of-scope requests.
- High/imminent safety routes do not call the conversation agent.
- Policy-boundary routes do not call the conversation agent.
- AI triage is optional and can escalate eligible subtle cases, but cannot downgrade deterministic high/imminent safety.
- Model output is post-validated before returning.
- In Supabase mode, opted-in responses are encrypted and replayed for completed
  `clientMessageId` retries. Active duplicates and opted-out completed retries
  return safe `409` errors without a second AI call.

## POST /api/clarity-map

Supports both legacy and enhanced request shapes.

Legacy request:

```ts
{
  sessionId: string;
}
```

Legacy response:

```ts
{
  clarityMap: LegacyMockClarityMap;
}
```

This keeps older frontend/demo callers from breaking.

In Supabase mode, both legacy and enhanced requests require the owner cookie
and an unexpired owner-scoped session lookup before map logic runs.

Enhanced request:

```ts
{
  sessionId: string;
  sessionContext: SessionContext;
  messages: ApiChatMessage[];
  lastRisk?: unknown;
  lastSafetyState?: unknown;
}
```

Enhanced responses:

```ts
{
  type: "clarity_map";
  source: "openai" | "fallback";
  clarityMap: StructuredClarityMap;
}
```

```ts
{
  type: "safety_blocked";
  source: "safety";
  assistantMessage: ApiChatMessage;
  risk: ApiRiskClassification;
  safety: SafetyUi | null;
  resources: SupportResource[];
  persistenceStatus?: "unavailable";
}
```

```ts
{
  type: "boundary_blocked";
  source: "boundary";
  assistantMessage: ApiChatMessage;
  policyBoundary: PolicyBoundaryResult;
  persistenceStatus?: "unavailable";
}
```

```ts
{
  type: "insufficient_context";
  source: "fallback";
  message: string;
}
```

Safety behavior:

- Enhanced generation extracts the latest meaningful user message.
- Safety Core/policy boundary gating happens before insufficient-context handling.
- Transcript scan blocks normal generation for deterministic direct self-harm, third-party self-harm, medical emergency, harm-to-others, self-harm method request, high, or imminent risk.
- Diagnosis, medication, treatment protocol, therapy replacement, and related policy-boundary requests return `boundary_blocked`.
- Safety-blocked cases do not produce a normal Harmony Signal or `/100` score.
- Generated maps must be non-diagnostic, evidence-grounded, and based only on submitted messages.
- In Supabase mode, enhanced generation uses server-owned context and prefers
  the retained encrypted transcript when persisted chat exists.
- Opted-in retained transcripts use raw-free fingerprint claims to replay one
  encrypted map for matching content. Active duplicates return
  `CLARITY_MAP_IN_PROGRESS`.
- Opt-out maps remain transient. Blocked maps are never persisted.

Frontend storage contract:

- Only `type: "clarity_map"` is stored as a generated map.
- Storage keys:

```txt
mindbridge:clarity-map:<sessionId>
mindbridge:last-clarity-map-session
```

- `insufficient_context`, `safety_blocked`, and `boundary_blocked` stay inline in chat and do not navigate to a normal map.

## GET /api/resources

Returns app-owned static resources selected by country/topic/risk.

Query:

```ts
{
  country?: string;
  countryCode?: "US" | "IN" | "GLOBAL";
  topic?: string;
  riskLevel?: "none" | "low" | "medium" | "high" | "imminent";
}
```

Response:

```ts
{
  resources: SupportResource[];
}
```

Resource ordering:

- `US`: United States resources first, then global fallback.
- `IN`: India resources first, then global fallback.
- `GLOBAL` or unknown/missing country: global fallback only; do not default to India.

## POST /api/feedback

Receives MVP feedback.

Request:

```ts
{
  sessionId: string;
  clarityRating: 1 | 2 | 3 | 4 | 5;
  helpfulnessRating: 1 | 2 | 3 | 4 | 5;
  feltSafe?: boolean | null;
  unsafeOrUnhelpful?: boolean;
  comment?: string | null;
}
```

Response:

```ts
{
  status: "received";
}
```

Transient behavior is mock receipt only. In Supabase mode, the owner cookie and
top-level `sessionId` are verified, ratings and flags append as raw-free rows,
opted-out comments are discarded, and opted-in comments are encrypted before
storage. The receipt does not imply analytics tracking, clinical review,
emergency support, or human follow-up.

## GET /api/sessions/export

Returns a no-store JSON attachment containing every cookie-owned anonymous
journey still retained in Postgres, including expired sessions awaiting purge.
The server decrypts opted-in retained content before returning the attachment.

The export includes session context codes, consent events, retained messages,
Clarity Maps, feedback ratings/flags/comments, and raw-free safety, model, and
audit metadata. It omits owner IDs, hashes, cookie values, database row IDs
other than `sessionId`, encryption envelopes, claim rows, transcript
fingerprints, rate-limit buckets, secrets, and legacy ownerless rows.

Transient mode returns `DATA_BACKEND_UNAVAILABLE` because the server cannot
truthfully export browser-only `sessionStorage`.

## DELETE /api/sessions

Hard-deletes every journey owned by the current anonymous-owner cookie and
clears that cookie.

Response:

```ts
{
  status: "deleted";
}
```

The route is idempotent: transient mode and missing, malformed, unknown, or
already-deleted cookies return the same deletion success and clear the cookie.
Resolvable-owner backend failures and rate-limit denials do not clear the
cookie so the browser can retry.

## Shared Types

`ApiChatMessage`:

```ts
{
  id: string;
  role: "assistant" | "user";
  content: string;
  createdAt: string;
}
```

`SessionContext`:

```ts
{
  sessionId: string;
  countryCode: "US" | "IN" | "GLOBAL";
  countryLabel?: string;
  ageConfirmed?: boolean;
  consentAccepted?: boolean;
  ageBand?: string;
  mainConcern?: string;
  mainConcernCategory?: MainConcernCategory;
  mainConcernLabel?: string;
  mainConcernText?: string;
}
```

`ApiRiskClassification`:

```ts
{
  level: "none" | "low" | "medium" | "high" | "imminent";
  categories: RiskCategory[];
  requiresCrisisResponse: boolean;
  reason?: string;
  resourceTopics?: string[];
  signalTags?: RiskSignalTag[];
}
```

`RiskSignalTag` currently includes:

- `third_party_self_harm`
- `third_party_self_harm_imminent`

Do not expose raw evidence, matched phrases, regex names, model output, or secrets.

## Fields The Frontend Must Not Fake

- Risk level, risk categories, `requiresCrisisResponse`, or safety state.
- Safety cards, safety copy, or returned resources.
- Crisis routing or boundary routing.
- Clarity Map content.
- Harmony Signal score, band, label, explanation, or components.
- Resource recommendations beyond app-owned fallback data.
- Feedback persistence or review status.

## Temporary Or Mock Areas

- `/api/sessions` uses mock anonymous session IDs.
- `/api/feedback` retains its receipt-only response shape.
- Legacy `/api/clarity-map` `{ sessionId }` path returns mock-compatible map data for backward compatibility.
- Supabase migrations exist through Block 1J but have not been applied to a
  remote project.

## Open Alignment Questions

- Production auth/session ownership model.
- Feedback review workflow.
- Resource catalog governance and update process.
- Whether/when to wire Supabase database and RLS-backed resources.

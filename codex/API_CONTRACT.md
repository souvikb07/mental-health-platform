# API Contract

Last updated: 2026-05-29.

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
  ownership enforcement and durable journey persistence are not implemented
  yet.
- Browser-provided `sessionContext`, `lastRisk`, and `lastSafetyState` are hints only. Backend safety decisions must be recomputed server-side where safety matters.

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
}
```

```ts
{
  type: "boundary";
  assistantMessage: ApiChatMessage;
  policyBoundary: PolicyBoundaryResult;
  source: "boundary";
}
```

Safety behavior:

- Optional `mainConcernText` runs through Safety Core before normal opener generation.
- High/imminent safety or blocking policy boundary does not call the context-intake model.
- Missing OpenAI config falls back deterministically.

## POST /api/chat

Processes a user chat message through Safety Core, policy boundary, optional AI triage, and normal conversation.

Request:

```ts
{
  sessionId: string;
  message: string;
  sessionContext?: SessionContext;
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
}
```

Safety behavior:

- Deterministic risk classification runs before normal conversation.
- Policy boundary runs before normal conversation for diagnosis, medication, treatment protocol, medical advice, therapy replacement, prompt injection, self-harm method requests, dependency requests, and out-of-scope requests.
- High/imminent safety routes do not call the conversation agent.
- Policy-boundary routes do not call the conversation agent.
- AI triage is optional and can escalate eligible subtle cases, but cannot downgrade deterministic high/imminent safety.
- Model output is post-validated before returning.

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
}
```

```ts
{
  type: "boundary_blocked";
  source: "boundary";
  assistantMessage: ApiChatMessage;
  policyBoundary: PolicyBoundaryResult;
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

Current behavior is mock receipt only. UI and docs must not imply database persistence, analytics tracking, clinical review, emergency support, or human follow-up.

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
- `/api/feedback` returns mock receipt only.
- Legacy `/api/clarity-map` `{ sessionId }` path returns mock-compatible map data for backward compatibility.
- Supabase schema/seed files exist but are not live runtime persistence.

## Open Alignment Questions

- Production auth/session ownership model.
- Durable storage, export/delete, and retention policy.
- Rate limiting strategy for public AI/auth/write/webhook endpoints.
- Feedback persistence and review workflow.
- Resource catalog governance and update process.
- Whether/when to wire Supabase database and RLS-backed resources.

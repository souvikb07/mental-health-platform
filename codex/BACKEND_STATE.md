# Backend State

Last updated: 2026-05-31.

This is the canonical Codex backend handoff for the current MindBridge repo. Use the actual codebase as source of truth. Do not treat `docs/project-handoff/` as canonical for Codex work.

## Current Stack

- Framework: Next.js App Router, TypeScript, React.
- API layer: route handlers under `src/app/api/**/route.ts`.
- Validation: Zod schemas under `src/lib/validation`.
- Server orchestration: focused service modules under `src/lib/server`.
- AI SDK: `openai` package through server-only modules under `src/lib/ai`.
- Tests: Vitest with unit tests under `tests/unit`.
- Data persistence: Supabase-mode `POST /api/sessions` creates server-owned
  anonymous owner/session/consent rows. Opted-in context-intake/chat and Clarity
  Map content is encrypted at rest, chat and map retries use raw-free claims,
  and feedback ratings append with encrypted opted-in comments.
- Supabase: server-only client, encryption helper, migrations, and anonymous
  session creation are present. Session-bound routes enforce cookie ownership
  in Supabase mode. There is no Supabase auth or browser client.

## Backend Folder Structure

- `src/app/api`: HTTP route handlers. Keep these thin.
- `src/lib/server`: API-facing orchestration for chat, context intake, Clarity Map, resources, sessions, and feedback.
- `src/lib/validation`: request/query validation schemas.
- `src/lib/safety`: deterministic risk rules, policy boundary classifier/copy, and legacy safety routing helpers.
- `src/lib/safety-core`: Safety Playbook Engine, state machine, playbooks, AI triage adapter, and orchestrator.
- `src/lib/ai`: server-only OpenAI clients/agents, prompts, schemas, validators, and deterministic fallbacks.
- `src/lib/resources`: app-owned resource selection.
- `src/lib/session`: session context normalization and browser journey storage helpers.
- `src/types`: public/shared API types.
- `schemas`: JSON schema artifacts for some Phase 1 data contracts.
- `supabase`: migration and seed SQL for planned database/resource work.
- `tests/unit`: backend, safety, AI, API, and UI integration tests.
- `tests/evals`: synthetic eval cases and real AI smoke fixtures.

## Current APIs

All current API routes return JSON and use the common validation error shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please check your input."
  }
}
```

Current routes:

- `POST /api/sessions`
  - Handler: `src/app/api/sessions/route.ts`
  - Service: `src/lib/server/sessions.ts`
  - Validation: `src/lib/validation/sessions.ts`
  - Creates a mock-compatible transient session locally.
  - In Supabase mode, atomically creates or reuses a hashed-cookie owner,
    creates one owner-linked session, records initial consent events, and
    returns additive storage-consent, server-owned, and expiry fields.

- `POST /api/context-intake`
  - Handler: `src/app/api/context-intake/route.ts`
  - Service: `src/lib/server/context-intake.ts`
  - Requires visible onboarding context: `sessionId`, `countryCode` `US` or `IN`, `ageConfirmed: true`, `consentAccepted: true`, `mainConcernCategory`, and `mainConcernLabel`.
  - Runs Safety Core on optional onboarding text before generating a normal opener.
  - In Supabase mode, verifies the owner cookie and owner-scoped session before
    Safety Core or opener generation.
  - Retains one encrypted response after storage opt-in and merges persisted
    safety state without retaining opt-out text.

- `POST /api/chat`
  - Handler: `src/app/api/chat/route.ts`
  - Service: `src/lib/server/chat.ts`
  - Validation: `src/lib/validation/chat.ts`
  - Runs Safety Core before normal conversation. High/imminent safety and policy-boundary routes do not call the conversation agent.
  - In Supabase mode, verifies the owner cookie and owner-scoped session before
    Safety Core or conversation generation.
  - Uses raw-free retry claims, encrypted opted-in message pairs, and persisted
    safety-state continuity.

- `POST /api/clarity-map`
  - Handler: `src/app/api/clarity-map/route.ts`
  - Service: `src/lib/server/clarity-map.ts`
  - Validation: `src/lib/validation/clarity-map.ts`
  - Legacy `{ sessionId }` request returns mock-compatible `{ clarityMap }`.
  - Enhanced request with `sessionContext` and `messages` returns generated map, safety block, boundary block, or insufficient context.
  - Safety/boundary gating happens before insufficient-context handling for the latest meaningful user message.
  - In Supabase mode, verifies the owner cookie and owner-scoped session before
    legacy or enhanced map logic.
  - Enhanced Supabase requests prefer retained chat, encrypt opted-in maps, and
    replay matching transcript fingerprints without duplicate generation.

- `GET /api/resources`
  - Handler: `src/app/api/resources/route.ts`
  - Service: `src/lib/server/resources.ts`
  - Validation: `src/lib/validation/resources.ts`
  - Selects app-owned static resources by country/topic/risk.

- `POST /api/feedback`
  - Handler: `src/app/api/feedback/route.ts`
  - Service: `src/lib/server/feedback.ts`
  - Validation: `src/lib/validation/feedback.ts`
  - Keeps the receipt-only response: `{ status: "received" }`.
  - In Supabase mode, verifies ownership, appends raw-free ratings and flags,
    discards opted-out comments, and encrypts opted-in comments.

See `codex/API_CONTRACT.md` for frontend/backend request and response shapes.

## Safety And AI Services

- Deterministic risk classification starts in `src/lib/safety/risk-classifier.ts`.
- Critical direct safety rules live in `src/lib/safety/critical-risk-rules.ts`.
- General deterministic risk rules live in `src/lib/safety/risk-rules.ts`.
- Aggregation and highest-severity behavior live in `src/lib/safety/risk-aggregator.ts`.
- Policy boundary classification lives in `src/lib/safety/policy-boundary-classifier.ts`.
- Safety Core entry point is `safetyOrchestrator.evaluate` in `src/lib/safety-core/safety-orchestrator.ts`.
- Safety states/playbooks live in `src/lib/safety-core/safety-state-machine.ts` and `src/lib/safety-core/safety-playbooks.ts`.
- AI triage is optional semantic signal only. It can escalate eligible subtle cases but cannot downgrade deterministic high/imminent safety.
- Conversation, context intake, triage, and Clarity Map agents all have deterministic fallbacks when config is missing or output is invalid.
- Clarity Map generation validates structured output, recomputes Harmony Signal score/band server-side, and blocks unsafe/boundary cases before model generation.

Safety-critical details belong in `codex/SAFETY_RULES.md`.

## Supabase And Database State

- `@supabase/supabase-js` is installed.
- Additive SQL exists through
  `supabase/migrations/0005_sprint1_persisted_clarity_feedback.sql`.
  `supabase/seed/resources_seed.sql` remains historical starter data.
- Current app runtime does not use Supabase auth or a browser Supabase client.
  Server-owned session creation uses the service-role-only
  `create_anonymous_session(...)` RPC. Session-bound route guards resolve the
  cookie owner and query sessions with both `owner_id` and `sessionId`.
  Context-intake, chat, Clarity Map, safety-state merge, and feedback
  persistence use narrow service-role-only RPCs.
- If future work enables Supabase:
  - keep service-role keys server-only;
  - enable RLS before production for public schema tables;
  - use least privilege for anon/public access;
  - perform server-side ownership checks for user-owned objects;
  - use parameterized SQL, safe query builders, or RPC parameters.

## Authentication And Authorization

- Current Phase 1 MVP has no auth.
- Session IDs are anonymous/mock UX identifiers and are not authorization.
- Browser storage is UX state only.
- Frontend checks are UX only; protected operations in future must enforce authorization server-side.

## Environment Variables

`.env.example` is committed as placeholders only. Never commit `.env`, `.env.local`, real API keys, database URLs, webhook secrets, tokens, or service-role keys.

Current server-side OpenAI variables:

- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `OPENAI_TRIAGE_MODEL`
- `OPENAI_CONTEXT_INTAKE_MODEL`
- `OPENAI_CLARITY_MODEL`
- `OPENAI_RISK_MODEL` placeholder exists, but current safety routing is deterministic plus optional triage, not a separate risk model route.

Current server-only data variables:

- `MIND_BRIDGE_DATA_MODE`
- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` legacy fallback only
- `MIND_BRIDGE_DATA_ENCRYPTION_KEY_V1`
- `MIND_BRIDGE_RATE_LIMIT_HMAC_KEY`

Other planned/placeholder service variables:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `ENABLE_ANALYTICS`

Browser-exposed placeholders:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_APP_NAME`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

Anything prefixed `NEXT_PUBLIC_` is browser-exposed and must never contain secrets.

## Current Frontend Expectations

- `src/lib/api/client.ts` is the frontend API wrapper.
- Frontend must render backend-returned risk, safety, resources, Clarity Map, and boundary states.
- Frontend must not infer or override risk, invent resources, generate safety copy, or fabricate Harmony Signal values.
- `/clarity-map` renders generated map responses from `sessionStorage`; it should not silently fall back to static mock map content in the real flow.

## Known Backend TODOs And Limitations

- No accounts, safety/model/audit event persistence, delete/export, or
  hydration.
- Feedback has no durable human review workflow.
- Resources are static/app-owned and not exhaustive.
- Rate limits are not implemented yet and are required before public launch on AI, auth, write, and webhook endpoints.
- OpenAI calls are non-streaming only.
- No OpenAI moderation path is currently used.
- No payment webhook handling is active.
- Real AI smoke eval requires a running local server and local env configuration; it must use synthetic cases only.

## Commands

Install:

```bash
npm install
```

Run dev server:

```bash
npm run dev
```

Run tests:

```bash
npm test
```

Lint:

```bash
npm run lint
```

Build:

```bash
npm run build
```

Real AI smoke eval, only when local env and dev server are intentionally configured:

```bash
RUN_REAL_AI_EVALS=true EVAL_BASE_URL=http://localhost:3000 npm run eval:ai:smoke
```

Diff whitespace check:

```bash
git diff --check
```

There is no active migration command wired into `package.json`.

## Rules For Future Backend Changes

- Read `AGENTS.md`, `codex/CURRENT_STATUS.md`, this file, `codex/API_CONTRACT.md`, and `codex/SAFETY_RULES.md` before changing backend behavior.
- Keep route handlers thin.
- Keep business logic out of page/client components.
- Preserve API contracts unless contract changes are explicitly approved.
- Preserve Safety Core authority and run deterministic safety before normal AI paths.
- Keep server-only modules out of client components.
- Do not log raw mental-health messages.
- Do not expose secrets to frontend code.
- Do not add dependencies without explaining why.
- Update `codex/CURRENT_STATUS.md` and any relevant handoff files before finishing.

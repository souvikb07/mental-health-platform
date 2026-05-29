# Backend State

Last updated: 2026-05-29.

This is the canonical Codex backend handoff for the current MindBridge repo. Use the actual codebase as source of truth. Do not treat `docs/project-handoff/` as canonical for Codex work.

## Current Stack

- Framework: Next.js App Router, TypeScript, React.
- API layer: route handlers under `src/app/api/**/route.ts`.
- Validation: Zod schemas under `src/lib/validation`.
- Server orchestration: focused service modules under `src/lib/server`.
- AI SDK: `openai` package through server-only modules under `src/lib/ai`.
- Tests: Vitest with unit tests under `tests/unit`.
- Data persistence: no active app database writes in the current runtime path.
- Supabase: dependency and SQL files exist, but Supabase auth/database integration is not live.

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
  - Creates a mock anonymous session ID and typed `SessionContext`.

- `POST /api/context-intake`
  - Handler: `src/app/api/context-intake/route.ts`
  - Service: `src/lib/server/context-intake.ts`
  - Requires visible onboarding context: `sessionId`, `countryCode` `US` or `IN`, `ageConfirmed: true`, `consentAccepted: true`, `mainConcernCategory`, and `mainConcernLabel`.
  - Runs Safety Core on optional onboarding text before generating a normal opener.

- `POST /api/chat`
  - Handler: `src/app/api/chat/route.ts`
  - Service: `src/lib/server/chat.ts`
  - Validation: `src/lib/validation/chat.ts`
  - Runs Safety Core before normal conversation. High/imminent safety and policy-boundary routes do not call the conversation agent.

- `POST /api/clarity-map`
  - Handler: `src/app/api/clarity-map/route.ts`
  - Service: `src/lib/server/clarity-map.ts`
  - Validation: `src/lib/validation/clarity-map.ts`
  - Legacy `{ sessionId }` request returns mock-compatible `{ clarityMap }`.
  - Enhanced request with `sessionContext` and `messages` returns generated map, safety block, boundary block, or insufficient context.
  - Safety/boundary gating happens before insufficient-context handling for the latest meaningful user message.

- `GET /api/resources`
  - Handler: `src/app/api/resources/route.ts`
  - Service: `src/lib/server/resources.ts`
  - Validation: `src/lib/validation/resources.ts`
  - Selects app-owned static resources by country/topic/risk.

- `POST /api/feedback`
  - Handler: `src/app/api/feedback/route.ts`
  - Service: `src/lib/server/feedback.ts`
  - Validation: `src/lib/validation/feedback.ts`
  - Current behavior is mock receipt only: `{ status: "received" }`.

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
- SQL exists in `supabase/migrations/0001_phase1_schema.sql` and `supabase/seed/resources_seed.sql`.
- Current app runtime does not use Supabase auth, Supabase database writes, RLS-backed user data, or service-role operations.
- Do not add Supabase auth/database persistence without explicit approval.
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

Current planned/placeholder service variables:

- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `ENABLE_CHAT_STORAGE`
- `ENABLE_ANALYTICS`

Browser-exposed placeholders:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_APP_NAME`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

Anything prefixed `NEXT_PUBLIC_` is browser-exposed and must never contain secrets.

## Current Frontend Expectations

- `src/lib/api/client.ts` is the frontend API wrapper.
- Frontend must render backend-returned risk, safety, resources, Clarity Map, and boundary states.
- Frontend must not infer or override risk, invent resources, generate safety copy, or fabricate Harmony Signal values.
- `/clarity-map` renders generated map responses from `sessionStorage`; it should not silently fall back to static mock map content in the real flow.

## Known Backend TODOs And Limitations

- No production persistence, auth, ownership checks, delete/export, or account data.
- Feedback is mock receipt only and has no durable review workflow.
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

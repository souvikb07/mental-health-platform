# Current Status

Last updated: 2026-05-30.

This is the canonical Codex status file. `docs/project-handoff/` is ChatGPT-web history and is not the Codex source of truth.

## Completed Backend Work

- Next.js App Router API routes exist under `src/app/api`.
- API route handlers are thin and delegate to `src/lib/server/**`.
- Zod validation exists for chat, Clarity Map, sessions, resources, and feedback.
- `/api/sessions` creates a mock anonymous session and typed `SessionContext`.
- `/api/context-intake` validates complete onboarding context, gates optional onboarding text through Safety Core, and returns an opener, safety route, or boundary route.
- `/api/chat` runs Safety Core before normal conversation and preserves the stable chat response shape.
- OpenAI conversation path uses server-only modules, non-streaming Responses API behavior, `store: false`, model env config, post-response validation, and deterministic fallback when config/output fails.
- Policy boundary guardrails block diagnosis, medication, treatment protocol, therapy replacement, prompt injection, unsafe self-harm method requests, and related out-of-scope requests.
- Safety Core / Safety Playbook Engine controls safety states, normal chat permission, Clarity Map permission, safety card visibility, resources, mode, and next actions.
- Deterministic safety covers direct self-harm, imminent self-harm, self-safety language, third-party self-harm, medical emergency, harm-to-others, elevated distress, and key false-positive protections.
- Optional AI triage is wired into Safety Core as an escalation signal for eligible subtle cases; it cannot downgrade deterministic high/imminent safety.
- Resource routing is country-aware: `US` first, `IN` first, or `GLOBAL` fallback only.
- `/api/clarity-map` supports legacy `{ sessionId }` mock-compatible responses and enhanced transcript-based generation.
- Enhanced Clarity Map generation is safety/boundary gated, structured, non-diagnostic, evidence-grounded, and falls back deterministically when OpenAI config/output fails.
- Harmony Signal scoring V2 is centralized in `src/lib/ai/clarity-map/harmony-signal.ts`; backend computes score/band from components.
- Real AI smoke eval harness exists under `scripts/evals/run-real-ai-smoke.mjs` and synthetic eval cases live under `tests/evals`.

## Completed Frontend Work

- Core routes are implemented:
  - `/`
  - `/onboarding`
  - `/chat`
  - `/clarity-map`
  - `/resources`
  - `/feedback`
  - `/demo`
- Global layout exists in `src/components/layout`.
- Visual baseline exists in `src/app/globals.css`.
- Onboarding requires support location, main reason, 18+ confirmation, and product/safety consent.
- Chat starts with a context-aware opener, hydrates active journey state from `sessionStorage`, renders safety/resources, and sends real messages to `/api/chat`.
- Generate Clarity Map sends current session context and chat transcript to enhanced `/api/clarity-map`.
- `/clarity-map` renders generated `type: "clarity_map"` responses from `sessionStorage`; no stored generated map shows CTA back to chat.
- Resources page uses the backend resources API and app-owned fallback data.
- Feedback page submits to the feedback API and uses safe generic UI states.

## Incomplete Or Limited Areas

- No auth, profile, account history, persistent user database, payments, community, long-term memory, voice mode, mobile app, or production deployment hardening.
- Supabase dependency, migration SQL, and seed SQL exist, but Supabase is not wired into live runtime persistence/auth.
- Sprint 1 Block 1A documents the planned production data foundation. It does not implement migrations, runtime persistence, anonymous-owner cookies, ownership guards, encryption, rate limiting, export/delete endpoints, purge scheduling, or server hydration.
- No remote Supabase project exists yet. Future migration work must start with a disposable verification project.
- Feedback backend returns mock `status: "received"` only; do not imply durable persistence or human review.
- Resources are static/app-owned and not exhaustive.
- Rate limits are not implemented yet.
- No OpenAI moderation path is active.
- No payment webhook handling is active.
- Real AI smoke eval requires local env and a running local server; it uses synthetic cases only.
- Browser storage is session-scoped UX state, not secure persistence or authorization.

## Important Next Backend Tasks

- Keep tightening deterministic safety coverage from manual QA and eval findings.
- Implement Sprint 1 Block 1B as additive migration design only after encoding session-relative retention and raw-free opt-out fields.
- Add production rate limiting before any public launch on AI and write endpoints.
- Keep Supabase persistence server-owned and explicitly scoped by the anonymous-owner cookie; `sessionId` must remain a locator only.
- Continue maintaining synthetic eval coverage for chat, safety, boundary, context intake, Clarity Map, and resource routing.

## Sprint 1 Production Data Foundation

- Block 1A documentation is complete on `docs/sprint1-data-foundation-decisions`.
- Locked decisions live in `docs/adr/ADR-0004-production-anonymous-data-foundation.md` and `docs/architecture/10-production-data-foundation.md`.
- A full implementation spike exists on `spike/sprint1-production-data-foundation-full-codex` at commit `9e196a1`. It is reference-only, not merge-ready, and must not be copied wholesale.
- Future implementation must fix three P1 findings from the spike:
  1. Storage opt-out must not persist arbitrary plaintext free text.
  2. Retention must be 30 days from each session's creation, not from owner creation.
  3. IP rate limiting must not trust spoofable forwarding headers without a trusted deployment policy.
- No application code, migrations, scripts, tests, environment templates, or package files changed in Block 1A.

## Frontend/API Dependencies

- Frontend API calls are centralized in `src/lib/api/client.ts`.
- Frontend must not infer risk, override safety decisions, invent resources, or hardcode Clarity Map output.
- Safety cards, resources, and Clarity Map blocking states come from backend responses.
- Chat and Clarity Map rely on session context from onboarding and active journey storage.

## Risks And Assumptions

- The app is a pre-production Phase 1 MVP.
- Model output is untrusted and must be validated/post-processed.
- Raw chat should not be logged or sent to analytics.
- `NEXT_PUBLIC_` variables are browser-exposed and must not contain secrets.
- `reference/stitch/` is visual reference only; do not import or iframe it.
- `docs/project-handoff/` may be stale relative to current Codex state.

## Read First Next Time

1. `AGENTS.md`
2. `codex/CURRENT_STATUS.md`
3. Backend/API work: `codex/BACKEND_STATE.md`
4. API contract work: `codex/API_CONTRACT.md`
5. Safety-sensitive work: `codex/SAFETY_RULES.md`
6. Frontend work: `codex/FRONTEND_STATE.md`
7. Durable precedent: `codex/DECISIONS.md`

## Avoid Changing Casually

- `docs/project-handoff/`
- `src/app/api/**`
- `src/lib/server/**`
- `src/lib/safety/**`
- `src/lib/safety-core/**`
- `src/lib/ai/**`
- `src/lib/validation/**`
- `src/lib/resources/**`
- `src/lib/api/client.ts`
- `src/lib/session/journey-storage.ts`
- `src/lib/session/session-context.ts`
- `supabase/**` unless the task explicitly covers database work
- storage keys documented in `codex/API_CONTRACT.md` and `codex/FRONTEND_STATE.md`

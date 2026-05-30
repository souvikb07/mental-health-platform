# Current Status

Last updated: 2026-05-31.

This is the canonical Codex status file. `docs/project-handoff/` is ChatGPT-web history and is not the Codex source of truth.

## Completed Backend Work

- Next.js App Router API routes exist under `src/app/api`.
- API route handlers are thin and delegate to `src/lib/server/**`.
- Zod validation exists for chat, Clarity Map, sessions, resources, and feedback.
- `/api/sessions` creates a mock-compatible transient session locally. In
  Supabase mode it atomically creates or reuses a hashed-cookie anonymous
  owner, creates one session, records initial consent events, and issues an
  HttpOnly owner cookie.
- `/api/context-intake` validates complete onboarding context, gates optional onboarding text through Safety Core, and returns an opener, safety route, or boundary route.
- `/api/chat` runs Safety Core before normal conversation and preserves the stable chat response shape.
- In Supabase mode, context intake, chat, Clarity Map, and feedback routes now
  verify the HttpOnly owner cookie and an unexpired owner-scoped session before
  invoking their existing business services.
- In Supabase mode, opted-in context-intake responses and chat turns are
  retained as encrypted payloads. Raw-free chat-turn claims provide replay,
  active-conflict handling, and five-minute stale recovery. Stored safety state
  is loaded before chat evaluation and merged after context-intake/chat writes.
- In Supabase mode, enhanced Clarity Maps prefer the retained server transcript
  when persisted chat exists. Opted-in maps are encrypted, raw-free fingerprint
  claims replay completed generation safely, and blocked maps never persist.
- In Supabase mode, feedback ratings and flags append without sensitive-content
  opt-in. Free-text comments are discarded after opt-out and encrypted after
  opt-in.
- In Supabase mode, raw-free safety, policy, model, and authorized-action audit
  metadata commits atomically with retained writes or safety-state merges.
- In Supabase mode, API routes enforce distributed fixed-window rate limits
  before existing services run. Session-bound buckets use window-scoped
  owner-plus-session HMAC subjects. Session creation and resources use trusted
  Vercel IP subjects without storing raw IP addresses.
- In Supabase mode, `GET /api/sessions/export` returns a no-store JSON
  attachment for every cookie-owned retained journey. Retained sensitive
  payloads decrypt only server-side, and internal hashes, claims, envelopes,
  and rate buckets are omitted.
- `DELETE /api/sessions` is idempotent, clears the anonymous-owner cookie after
  success, and removes every cookie-owned journey through one narrow cascade
  RPC. A scheduler-ready purge runner reuses the session-relative purge RPC.
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
- Supabase-mode anonymous session creation, owner-scoped route guards, encrypted
  context-intake/chat retention, encrypted Clarity Map replay, and consent-aware
  feedback persistence are wired. Supabase auth remains absent.
- Sprint 1 Blocks 1A through 1J document the production data contract, add
  unapplied additive database migrations, add server-only
  Supabase/config/encryption infrastructure, and wire anonymous session
  creation, enforce ownership on session-bound routes, persist encrypted
  opted-in journey content plus authoritative safety state, append structured
  raw-free event metadata, enforce distributed rate limits, and add server-owned
  export/delete plus a purge runner. Purge scheduling and server hydration are
  not implemented.
- No remote Supabase project exists yet. Future migration work must start with a disposable verification project.
- Feedback still returns `status: "received"` only. Supabase mode persists
  anonymous ratings and flags, but no human review workflow exists.
- Resources are static/app-owned and not exhaustive.
- Public deployment still requires direct Vercel-ingress verification for the
  trusted-IP rate-limit policy.
- No OpenAI moderation path is active.
- No payment webhook handling is active.
- Real AI smoke eval requires local env and a running local server; it uses synthetic cases only.
- Browser storage is session-scoped UX state, not secure persistence or authorization.

## Important Next Backend Tasks

- Keep tightening deterministic safety coverage from manual QA and eval findings.
- Implement Sprint 1 Block 1K: frontend compatibility and hydration.
- Verify direct Vercel ingress and exposed Vercel system variables before
  public launch.
- Keep Supabase persistence server-owned and explicitly scoped by the anonymous-owner cookie; `sessionId` must remain a locator only.
- Continue maintaining synthetic eval coverage for chat, safety, boundary, context intake, Clarity Map, and resource routing.

## Sprint 1 Production Data Foundation

- Blocks 1A through 1J are complete. The additive migrations through
  `supabase/migrations/0008_sprint1_data_controls_hardening.sql` have
  not been applied to a remote project.
- Locked decisions live in `docs/adr/ADR-0004-production-anonymous-data-foundation.md` and `docs/architecture/10-production-data-foundation.md`.
- A full implementation spike exists on `spike/sprint1-production-data-foundation-full-codex` at commit `9e196a1`. It is reference-only, not merge-ready, and must not be copied wholesale.
- The narrow Sprint 1 implementation addresses three P1 findings from the spike:
  1. Storage opt-out must not persist arbitrary plaintext free text.
  2. Retention must be 30 days from each session's creation, not from owner creation.
  3. IP rate limiting must not trust spoofable forwarding headers without a trusted deployment policy.
- Block 1B encodes the first two P1 protections in SQL: owner-linked plaintext writes are rejected and each session receives its own 30-day expiry. Its rate-limit schema stores HMAC digests only.
- Block 1C adds server-only, currently unwired infrastructure: validated transient/Supabase data modes, a backend-only cached Supabase client, AES-256-GCM sensitive JSON envelopes, SHA-256 owner-token hashing, and HMAC-SHA-256 helpers. No API route, business service, Safety Core, AI/OpenAI module, frontend component, journey-storage module, migration, or package file changed in Block 1C.
- Block 1D wires server-owned anonymous session creation only. The owner cookie
  is opaque and HttpOnly, Postgres stores only its SHA-256 hash, each session
  retains SQL-derived session-relative expiry, opted-out free text stays out of
  Postgres, and opted-in onboarding context is encrypted. Ownership enforcement
  for downstream routes lands in Block 1E.
- Block 1E adds same-origin mutation checks and Supabase-mode owner-scoped
  session guards before context intake, chat, Clarity Map, and feedback
  services. Unknown and cross-owner session locators intentionally share the
  same `SESSION_NOT_FOUND` response.
- Block 1F adds consent-aware encrypted context-intake/chat retention,
  raw-free idempotent chat-turn claims, and persisted safety-state continuity.
  Opt-out sessions retain no user or assistant text.
- Block 1G adds consent-aware encrypted Clarity Map retention, raw-free
  fingerprint replay claims with five-minute stale recovery, server-transcript
  preference when retained chat exists, and append-only feedback ratings with
  encrypted opted-in comments.
- Block 1H adds owner-scoped transactional wrappers for append-only raw-free
  safety, policy, model, and authorized-action audit metadata. Safety Core
  behavior and AI/OpenAI modules remain unchanged.
- Block 1I wires distributed RPC-backed route rate limits, stores only
  window-scoped HMAC digests, and resolves the final P1 trusted-header issue:
  Vercel-overwritten `x-forwarded-for` is read only behind the explicit
  direct-Vercel policy gate.
- Block 1J adds cookie-owner-scoped no-store JSON export, idempotent anonymous
  hard delete through a narrow cascade RPC, owner-only export/delete rate
  limits, and a scheduler-ready purge runner that prints deletion counts only.

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

# Decisions

Last updated: 2026-05-30.

## Codex Handoff Lives In `codex/`

- Decision: `codex/` is the canonical handoff source for Codex chats.
- Reason: `docs/project-handoff/` was created for ChatGPT-web project work and may not reflect current Codex context.
- Consequence: future Codex chats should read and update `codex/` files first.

## Stitch Is Visual Reference Only

- Decision: `reference/stitch/` guides visual direction but is not production code.
- Reason: Stitch HTML includes static references, external fonts/icons/scripts, and mock/demo patterns.
- Consequence: translate visuals into real React/Next.js/Tailwind components; do not import, iframe, paste, or render Stitch HTML.

## Preserve Backend Safety Authority

- Decision: frontend renders backend safety decisions and does not infer or override risk.
- Reason: Safety Core and server-side routing are the safety authority.
- Consequence: UI polish cannot hardcode safety states, resources, risk levels, or Clarity Map blocking behavior.

## Keep API Route Handlers Thin

- Decision: App Router handlers under `src/app/api/**/route.ts` should validate input and delegate to `src/lib/server/**`.
- Reason: Safety, AI, resources, and Clarity Map behavior need focused tests and should not be scattered through route handlers.
- Consequence: future backend work should add service/domain helpers instead of route-level branching.

## Deterministic Safety Runs Before AI

- Decision: deterministic risk classification, Safety Core, and policy-boundary checks run before normal OpenAI conversation or Clarity Map generation.
- Reason: high/imminent safety and prohibited requests must not depend on model output.
- Consequence: high/imminent safety, policy-boundary, and safety-blocked Clarity Map routes must not call normal generation agents.

## AI Triage Is Optional Escalation Only

- Decision: AI triage can provide an optional semantic signal for eligible subtle cases.
- Reason: deterministic rules cover obvious safety cases, while triage can help with ambiguous phrasing.
- Consequence: AI triage may escalate none/low/medium cases but cannot downgrade deterministic high/imminent safety.

## OpenAI Modules Are Server-Only With Fallbacks

- Decision: modules that read OpenAI env vars or call OpenAI stay server-only and return deterministic fallbacks when config/output/API fails.
- Reason: secrets must not reach the browser and the MVP must run without local API keys.
- Consequence: do not import OpenAI/server-only modules into client components; preserve fallback behavior.

## Clarity Map Has Legacy And Enhanced Paths

- Decision: `/api/clarity-map` supports legacy `{ sessionId }` mock-compatible responses and enhanced transcript-based responses.
- Reason: frontend integration was staged and older callers should not break.
- Consequence: preserve the legacy response until explicitly removed; enhanced generation remains additive.

## Harmony Signal Is Non-Clinical And Backend-Computed

- Decision: Harmony Signal is a non-clinical reflection signal based only on the submitted conversation, with backend-computed score/band from validated components.
- Reason: the score must not appear clinical, diagnostic, or model-invented.
- Consequence: do not present it as a mental-health, depression, anxiety, clinical, or severity score.

## Phase 1 Has No Auth/Profile/History

- Decision: current product remains anonymous-session MVP.
- Reason: Phase 1 scope is the core reflection journey, not account infrastructure.
- Consequence: do not add auth, profile, account history, community, payments, long-term memory, or database-backed user history without explicit approval.

## Supabase Session Ownership Is Partially Wired

- Decision: Supabase-mode anonymous session creation and owner-scoped
  session-bound route guards are wired, but durable journey-content
  persistence and Supabase auth are not.
- Reason: session ownership must be enforced before later persistence expands.
- Consequence: do not assume message, Clarity Map, feedback, or authoritative
  safety-state persistence exists; future Supabase writes must remain explicit
  and server-authorized.

## Current Journey Uses `sessionStorage`

- Decision: active journey persistence uses browser `sessionStorage`.
- Reason: refresh/back navigation should preserve current-session chat, safety UI state, and generated Clarity Map without adding backend persistence.
- Consequence: do not store raw chat in localStorage; do not treat browser storage as authorization.

## Clarity Map Is Generated-Only

- Decision: `/clarity-map` renders only stored generated `type: "clarity_map"` responses.
- Reason: the product should not show fake/static Clarity Maps when real generation has not happened.
- Consequence: missing or blocked map data shows CTA/inline states, not normal map UI.

## Resources Are App-Owned

- Decision: resources come from app-owned data/API flow and frontend fallback data.
- Reason: resource recommendations must not be model-invented.
- Consequence: do not add client-side resource invention or external resource APIs without explicit approval.

## Feedback Is MVP Receipt Only

- Decision: feedback submission currently posts to `/api/feedback` and receives `status: "received"`.
- Reason: no durable production persistence or human review is implemented.
- Consequence: UI must not imply database storage, analytics tracking, clinical review, emergency monitoring, or human follow-up.

## Route-Level Polish Should Stay Narrow

- Decision: frontend polish blocks should usually touch only the route/component in scope.
- Reason: the app has many safety-sensitive flows and shared behavior.
- Consequence: avoid broad refactors, global CSS churn, package additions, or shared component changes unless explicitly approved.

## Sprint 1 Production Data Foundation Lands In Narrow Blocks

- Decision: Sprint 1 adds a server-owned anonymous persistence foundation
  through small reviewable blocks. Blocks 1A through 1E record the contract,
  add the unapplied SQL foundation, add server-only client/config/encryption
  infrastructure, wire anonymous session creation, and enforce owner-scoped
  route guards.
- Reason: sensitive journey retention needs an explicit privacy and security contract before SQL or runtime work begins.
- Consequence: do not describe durable journey-content persistence,
  rate-limit enforcement, export/delete, or hydration as implemented until
  their later blocks land.

## Sprint 1 Server Data Infrastructure

- Decision: server persistence configuration is resolved only when a backend helper is called. Local development and tests default to transient mode; production defaults to Supabase mode and rejects explicit transient mode.
- Reason: CI builds and local transient development must remain configuration-free, while production must fail closed rather than silently lose retained data.
- Consequence: routes remain unchanged until later blocks wire the infrastructure. No persistence helper validates configuration at module import time.
- Decision: prefer `SUPABASE_SECRET_KEY` for server-only Supabase access while temporarily accepting `SUPABASE_SERVICE_ROLE_KEY` as a legacy fallback.
- Reason: the modern backend secret naming is clearer, but existing private deployment configuration may still use the legacy name.
- Consequence: never add browser Supabase credentials, export secret values, or create a browser Supabase client.
- Decision: sensitive JSON encryption uses server-only Node crypto with AES-256-GCM envelopes containing `kid`, `algorithm`, `iv`, `authTag`, and `ciphertext`. Encryption and rate-limit HMAC keys must be canonical base64 strings decoding to exactly 32 bytes.
- Reason: application-level encryption and strict key validation prevent malformed secrets and plaintext retained-content writes from reaching later persistence paths.
- Consequence: later repositories must use the Block 1C helper for retained sensitive content and must keep plaintext, ciphertext, keys, and secret-bearing configuration out of logs.

## Sprint 1 Anonymous Ownership And Consent

- Decision: use a hashed opaque HttpOnly anonymous-owner cookie and treat `sessionId` only as a locator.
- Reason: a public session identifier is not authorization.
- Consequence: future sensitive operations must resolve the cookie owner and scope database access by that owner.
- Decision: keep required product-boundary consent separate from optional `storageConsentAccepted` sensitive-content retention under policy version `sensitive_storage.v1`.
- Reason: using the reflection tool must not silently imply consent to retain free-form mental-health text.
- Consequence: without opt-in, persist only minimal raw-free metadata; with opt-in, encrypt retained notes, messages, Clarity Maps, and feedback comments server-side.
- Decision: create or reuse the hashed anonymous owner, create the session, and
  record initial `product_boundary.v1` and `sensitive_storage.v1` consent events
  inside one service-role-only Postgres RPC.
- Reason: initial ownership and consent rows must commit or roll back together.
- Consequence: owners remain expiry-neutral, the existing SQL trigger derives
  each session's expiry, and downstream ownership enforcement remains a
  separate Block 1E responsibility.
- Decision: in Supabase mode, session-bound route guards resolve the HttpOnly
  cookie owner and query sessions with both `owner_id` and `sessionId` before
  invoking business services. Unknown and cross-owner locators return the same
  `SESSION_NOT_FOUND` response.
- Reason: service-role clients bypass RLS and public session identifiers are
  locators only, never authorization.
- Consequence: do not add unscoped session fallback lookups or trust
  browser-submitted context for authorization.
- Decision: browser mutation routes reject cross-site requests and mismatched
  origins while allowing absent `Origin` for non-browser callers.
- Reason: anonymous-owner cookies need a narrow CSRF guard without breaking the
  existing server-side smoke harness.
- Consequence: keep relative same-origin frontend API calls unchanged.
- Decision: opted-in context-intake responses and chat turns are stored only as
  encrypted envelopes. Opted-out chat-turn claims remain raw-free.
- Reason: retry control and safety-state continuity must not silently retain
  sensitive message text.
- Consequence: completed opted-in retries replay the retained response;
  completed opted-out retries return `CHAT_TURN_RETRY_UNAVAILABLE`.
- Decision: active duplicate chat turns return `CHAT_TURN_IN_PROGRESS`, and an
  abandoned processing claim may be reclaimed after five minutes.
- Reason: concurrent requests must not trigger duplicate AI calls, while
  crashed workers must recover without manual cleanup.
- Consequence: only stale-reclaimed claims may regenerate a response.
- Decision: if a post-evaluation persistence write fails, safety and boundary
  routes remain visible with `persistenceStatus: "unavailable"`.
- Reason: storage failure must never suppress urgent local safety resources.
- Consequence: normal opener/chat responses still fail closed with a safe
  backend-unavailable error when required persistence fails.

## Sprint 1 Retention, Controls, And Runtime

- Decision: retain each anonymous session for 30 days from that session's creation, not owner creation.
- Reason: a newer journey must not inherit an almost-expired owner window.
- Consequence: Block 1B migration design must model session-relative expiry and owner cleanup safely.
- Decision: add JSON export and hard delete for every cookie-owned anonymous journey, while keeping resources on the static TypeScript runtime.
- Reason: Sprint 1 needs privacy controls without expanding into history UI or a database-backed resource runtime.
- Consequence: frontend additions stay limited to hydration plus small export/delete controls.
- Decision: local development may fall back to transient mode, but production fails closed without valid Supabase persistence configuration.
- Reason: development ergonomics must not become a production data-loss mode.
- Consequence: Supabase service-role credentials and encryption keys remain server-only.

## Sprint 1 Rate-Limit Foundation

- Decision: plan Postgres RPC fixed-window buckets and short-lived HMAC identifiers for pre-cookie IP subjects.
- Reason: distributed abuse protection is needed without retaining raw IP addresses.
- Consequence: do not store or log raw IPs, and do not trust spoofable forwarding headers until a deployment-specific trusted-header policy is documented.

## Sprint 1 Reference Spike Is Not Merge-Ready

- Decision: treat `spike/sprint1-production-data-foundation-full-codex` at `9e196a1` as reference-only.
- Reason: review found plaintext opt-out persistence, owner-relative retention, and spoofable forwarded-IP assumptions.
- Consequence: do not merge or copy the spike wholesale. Reimplement narrower blocks with the P1 findings fixed.

## Sprint 1 Scope Exclusions

- Decision: Sprint 1 does not add RAG, agents, a vector database, payments, an admin dashboard, OAuth-first login, profile/history UI, a major frontend redesign, client-side safety classification, model-generated crisis resources, or diagnosis, treatment, or medication behavior.
- Reason: Sprint 1 is the production data foundation only.
- Consequence: keep later implementation blocks narrow.

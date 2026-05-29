# Decisions

Last updated: 2026-05-29.

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

## Supabase Is Present But Not Live Runtime Persistence

- Decision: Supabase dependency and SQL files exist, but live app behavior does not use Supabase auth/database writes yet.
- Reason: security guardrails, safety, AI, and MVP flow came before production persistence.
- Consequence: do not assume database persistence or RLS-backed ownership exists; future Supabase work must be explicit and server-authorized.

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

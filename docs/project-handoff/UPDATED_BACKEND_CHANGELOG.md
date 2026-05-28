# UPDATED_BACKEND_CHANGELOG.md

_Last updated: 2026-05-28 after Block 5C_

This changelog covers the backend/product changes added after the previous handoff documentation. It focuses on the latest Clarity Map and safety updates.

---

## Summary

The latest backend update completed the Clarity Map product loop and improved the safety/quality layer around it.

Major outcomes:

- Added enhanced transcript-based `/api/clarity-map` generation.
- Preserved legacy `{ sessionId } -> { clarityMap }` compatibility.
- Added structured AI Clarity Map schema, prompt, agent, fallback, and validation.
- Added Safety Core and policy-boundary gating before Clarity Map generation.
- Wired the frontend Generate Clarity Map flow to send the real chat transcript.
- Rendered generated Clarity Maps from `sessionStorage` instead of the old mock default.
- Fixed a self-safety language regression: “I do not feel safe with myself tonight.” now routes to imminent safety and blocks normal map generation.
- Added Harmony Signal Scoring V2 to avoid repetitive `60 / mixed` results.
- Latest tests/evals/build all pass.

---

## Files Changed

| File | Change description |
|---|---|
| `src/lib/ai/clarity-map/clarity-map-schema.ts` | Added/updated strict `clarity_map.v1` schema/parser, unsafe-language validation, evidence validation, Harmony Signal normalization. |
| `src/lib/ai/clarity-map/clarity-map-prompt.ts` | Added Clarity Map prompt; updated with non-clinical Harmony Signal guidance and component-value guidance. |
| `src/lib/ai/clarity-map/clarity-map-agent.ts` | Added server-only OpenAI Responses API clarity map agent with `store:false`, non-streaming behavior, and fallback handling. |
| `src/lib/ai/clarity-map/clarity-map-fallback.ts` | Added deterministic fallback; updated to vary by scenario/category/transcript signals. |
| `src/lib/ai/clarity-map/harmony-signal.ts` | New module for V2 Harmony Signal scoring, band derivation, normalization, and fallback component derivation. |
| `src/lib/ai/clarity-map/index.ts` | Exported clarity-map AI modules. |
| `src/types/clarity-map.ts` | Added enhanced structured Clarity Map types and response union while preserving legacy map compatibility. |
| `src/lib/validation/clarity-map.ts` | Added enhanced request validation for `sessionContext` + `messages`, while keeping legacy request support. |
| `src/lib/server/clarity-map.ts` | Added transcript-based generation, Safety Core gating, boundary gating, insufficient-context handling, fallback/OpenAI path, and fixed gating order. |
| `src/app/api/clarity-map/route.ts` | Exposed enhanced and legacy route behavior. |
| `src/lib/api/client.ts` | Added/updated enhanced Clarity Map client helper. |
| `src/components/product/chat-panel.tsx` | Generate Clarity Map now sends real chat messages and session context, stores successful maps in `sessionStorage`, and handles blocked states inline. |
| `src/components/product/clarity-map-loader.tsx` | Real `/clarity-map` page now reads generated map from `sessionStorage` and shows CTA if missing. |
| `src/components/product/clarity-map-card.tsx` | Basic structured Clarity Map renderer added/updated. |
| `src/lib/safety/risk-rules.ts` | Added deterministic self-safety language coverage such as “I do not feel safe with myself tonight.” |
| `tests/unit/clarity-map-schema.test.ts` | Added/updated structured map validation tests. |
| `tests/unit/clarity-map-agent.test.ts` | Added/updated OpenAI clarity map agent tests. |
| `tests/unit/clarity-map-service.test.ts` | Added/updated service tests for enhanced, legacy, safety-blocked, boundary-blocked, and insufficient-context flows. |
| `tests/unit/clarity-map-route.test.ts` | Added/updated route-level tests, including boundary-before-insufficient regression. |
| `tests/unit/chat-panel.test.tsx` | Added/updated Generate Clarity Map frontend integration tests. |
| `tests/unit/clarity-map-loader.test.tsx` | Added `/clarity-map` rendering/CTA tests. |
| `tests/unit/harmony-signal.test.ts` | Added V2 formula/band/normalization tests. |
| `tests/unit/clarity-map-fallback.test.ts` | Added fallback variation tests. |
| `CODEX_BUILD_LOG.md` | Added entries for Block 5A, 5A fix, 5B, 5B.1, and 5C. |

---

## Behavioral Changes

### User-facing behavior

- Clicking **Generate Clarity Map** now sends the actual current chat transcript and session context to `/api/clarity-map`.
- Generated maps are stored in `sessionStorage` and rendered on `/clarity-map?sessionId=...`.
- The real `/clarity-map` page no longer silently renders the old static mock map by default.
- If the conversation is too thin, the user sees an inline insufficient-context message instead of a fake map.
- If the conversation contains high/imminent safety content, normal map generation is blocked.
- If the conversation asks for diagnosis/medication/treatment/therapy replacement, normal map generation is boundary-blocked.
- Harmony Signal scores now vary by scenario and no longer cluster around `60 / mixed`.
- Safety phrases such as “I do not feel safe with myself tonight.” now route to urgent safety and block normal Clarity Map generation.

### Example current Clarity Map scoring behavior

Latest manual/API examples after Block 5C:

```txt
Work overload: 57 / mixed
Relationship conflict: 54 / strained
Low energy/disconnection: 38 / strained
Worry loop: 57 / mixed
Unclear/not sure: 35 / strained
Safety phrase: safety_blocked, no normal score
```

---

## API Changes

### `POST /api/clarity-map`

Changed from legacy-only mock response to dual behavior:

1. Legacy request:

```json
{ "sessionId": "session_123" }
```

Still returns:

```json
{ "clarityMap": { ...legacy mock-compatible map... } }
```

2. Enhanced request:

```json
{
  "sessionId": "session_123",
  "sessionContext": { ... },
  "messages": [ ... ]
}
```

Returns one of:

```txt
clarity_map
safety_blocked
boundary_blocked
insufficient_context
```

This is backward-compatible because the legacy `{ sessionId }` request still works.

### `StructuredClarityMap`

Added/updated fields:

- `schemaVersion`
- `status`
- `disclaimer`
- `harmonySignal`
- `keyInsight`
- `boundaryFocus`
- `actionPlan`
- `supportPath`
- `confidence`

### `HarmonySignal`

Uses deterministic backend scoring:

```txt
score = weighted score from emotionalLoad, triggerClarity, supportConnection, actionReadiness, safetyStability
band = steady | mixed | strained | support_first
```

The score is non-clinical and based only on the current conversation.

---

## Safety Changes

### Clarity Map safety gating

Enhanced `/api/clarity-map` now:

1. extracts latest meaningful user message
2. runs Safety Core and policy-boundary gating
3. deterministically scans transcript for blocking high/imminent signals
4. returns `safety_blocked` or `boundary_blocked` before model generation
5. only then checks `insufficient_context`
6. only then generates a normal map

### Boundary-before-insufficient fix

A one-message request like:

```txt
Can you diagnose me with depression?
```

now returns:

```txt
boundary_blocked
```

not:

```txt
insufficient_context
```

### Self-safety regression fix

A message like:

```txt
I do not feel safe with myself tonight.
```

now returns:

```txt
source = safety
risk.level = imminent
nextRecommendedAction = urgent_support
mode = crisis
safetyState = imminent_risk
```

and `/api/clarity-map` returns:

```txt
safety_blocked
```

### Harmony Signal safety rule

Safety-blocked cases do not return a normal Harmony Signal or `/100` score.

---

## Tests/Evals

Latest reported validation after Block 5C:

```txt
npm test: passed, 24 files / 253 tests
npm run lint: passed
npm run build: passed
RUN_REAL_AI_EVALS=true EVAL_BASE_URL=http://localhost:3000 npm run eval:ai:smoke: passed 13/13, 0 failed, 6 warnings
```

Current real AI smoke eval status:

```txt
Passed: 13/13
Failed: 0
Warnings: 6
OpenAI-backed sources appeared: true
Safety routes passed: true
Boundary routes passed: true
```

Important test coverage added/updated:

- structured Clarity Map schema validation
- Clarity Map OpenAI agent fallback behavior
- Clarity Map service routing
- Clarity Map route behavior
- ChatPanel transcript submission and response handling
- Clarity Map loader sessionStorage rendering
- self-safety language routing
- Harmony Signal formula and band thresholds
- fallback score variation across scenarios

---

## Remaining Work

Recommended next work:

1. Start a frontend-focused chat for demo polish.
2. Improve visual design of:
   - landing page
   - onboarding
   - chat
   - safety cards
   - Clarity Map
   - resources
3. Add public demo script and walkthrough.
4. Add rate limiting before any public deployment.
5. Add production environment validation.
6. Plan Supabase persistence and RLS if moving beyond hackathon MVP.
7. Add auth/session ownership before storing user data long-term.
8. Add delete/export path before storing sensitive mental-health content.
9. Improve third-party resource card copy so it does not reuse self-directed generic resource text.
10. Expand evals for multilingual, abuse/coercion, harm-to-others, and medical-emergency cases.


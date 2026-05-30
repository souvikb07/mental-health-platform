# Safety Rules

Last updated: 2026-05-29.

This file documents backend-owned safety constraints and frontend rendering rules for the current MVP. Safety behavior must remain grounded in deterministic rules, Safety Core, policy boundaries, and app-owned resources.

## Product Boundary

MindBridge is for reflection and support routing. It is not:

- therapy
- diagnosis
- treatment
- medical advice
- a crisis service
- a replacement for professional care

Use cautious language such as:

- "reflection"
- "support options"
- "patterns that may be present"
- "based only on this conversation"
- "this is not a diagnosis"
- "a qualified professional may be able to help you explore this"
- "non-clinical reflection signal"

Avoid language such as:

- "you have depression"
- "treatment plan"
- "clinical score"
- "severity score"
- "mental health score"
- "guaranteed"
- "we keep you safe"
- "therapy replacement"

## Safety Data Flow

Normal chat flow:

1. Route validates the request and, in Supabase mode, verifies cookie ownership
   of the session locator.
2. `src/lib/server/chat.ts` calls `safetyOrchestrator.evaluate`.
3. Safety Core runs deterministic risk classification.
4. Safety Core runs policy-boundary classification.
5. Blocking deterministic high/imminent safety and clear policy boundaries short-circuit before normal conversation.
6. Optional AI triage may run only for eligible subtle messages and may escalate, never downgrade, deterministic safety.
7. If normal chat is allowed, the conversation agent or fallback runs.
8. Model output is post-validated before returning.
9. In Supabase mode, the server loads persisted `previousState` before
   evaluation and merges the returned state after completion. A storage failure
   does not hide safety or boundary routes.

Context intake flow:

1. `/api/context-intake` validates complete visible onboarding context and, in
   Supabase mode, verifies cookie ownership of the session locator.
2. Optional `mainConcernText` runs through Safety Core before opener generation.
3. Safety or boundary routes return local responses and do not call the context-intake model.
4. Missing model config returns deterministic fallback opener.

Clarity Map flow:

1. `/api/clarity-map` validates the request and, in Supabase mode, verifies
   cookie ownership of the session locator.
2. Enhanced `/api/clarity-map` extracts meaningful user messages.
3. Safety Core/policy boundary gating runs on the latest meaningful user message before insufficient-context handling.
4. Submitted user messages are also scanned for deterministic blocking safety signals.
5. Safety or boundary routes block generation before any Clarity Map model call.
6. Normal generated maps are structured, validated, non-diagnostic, and evidence-grounded.
7. Safety-blocked cases do not return a normal Harmony Signal or `/100` score.

## Risk Categories

Use only these current risk categories:

- `self_harm`
- `harm_to_others`
- `abuse`
- `psychosis_or_mania_signal`
- `substance_use`
- `minor_safety`
- `medical_emergency`

Risk levels:

- `none`
- `low`
- `medium`
- `high`
- `imminent`

Type-safe signal tags currently include:

- `third_party_self_harm`
- `third_party_self_harm_imminent`

Do not infer third-party self-harm by parsing human-readable reason text. Safety Core maps structured signal tags to `third_party_self_harm`.

## Safety States

Current Safety Core states:

- `normal_support`
- `elevated_distress`
- `passive_suicidal_ideation`
- `active_suicidal_ideation`
- `imminent_risk`
- `self_harm_method_request`
- `medical_emergency`
- `harm_to_others`
- `abuse_or_coercion`
- `policy_boundary`
- `third_party_self_harm`

Playbooks control:

- normal conversation permission
- Clarity Map permission
- next recommended action
- mode
- safety card visibility
- resource visibility
- resource topics

High/imminent direct safety, third-party self-harm, self-harm method requests, medical emergency, and harm-to-others states must not continue normal reflective chat.

## Policy Boundary Categories

Use these policy-boundary categories:

- `diagnosis_request`
- `medication_request`
- `treatment_protocol_request`
- `medical_advice_request`
- `therapy_replacement_request`
- `self_harm_method_request`
- `prompt_injection`
- `dependency_request`
- `out_of_scope`

Boundary behavior:

- Diagnosis requests must say MindBridge cannot diagnose.
- Medication requests must not recommend medication or dosing.
- Treatment protocol requests must not create treatment plans or protocols.
- Therapy replacement requests must say MindBridge cannot replace professional care.
- Prompt injection must not override product boundaries.
- Self-harm method requests route to safety, not normal boundary-only copy, and must not include method details.

## Resource Rules

- Resources come from app-owned static data and backend/resource selection.
- Do not let model output invent resources.
- `US` context: United States resources first, then global fallback.
- `IN` context: India resources first, then global fallback.
- `GLOBAL` or unknown/missing context: global fallback only; do not default to India.
- Use conservative availability wording.
- Do not imply resources are exhaustive, guaranteed, clinician-reviewed, emergency monitoring, or a replacement for local emergency/professional support.
- Third-party self-harm states must avoid self-directed wording when support is for someone else.

## Clarity Map Safety

- Clarity Map is a non-diagnostic reflection artifact.
- It is based only on submitted conversation context.
- It must not produce diagnosis, medication advice, treatment protocols, unsafe reassurance, therapy-replacement language, or self-harm method details.
- Enhanced generation must block high/imminent safety and policy-boundary requests before model calls.
- Generated maps must ground evidence in submitted message IDs.
- Harmony Signal is a non-clinical reflection signal, not a clinical score.
- Backend recomputes Harmony Signal score/band from validated components.
- Supabase-mode enhanced generation prefers the retained encrypted transcript
  when persisted chat exists. Blocked responses never persist as normal maps.

## Frontend Safety Behavior

- Frontend must render backend safety decisions and must not infer or override risk.
- Safety cards remain visible when `safety.showInlineSafetyCard` is true.
- If `safety.disableNormalNextStep` is true, Generate Clarity Map must be disabled, paused, or clearly deprioritized.
- `insufficient_context`, `safety_blocked`, and `boundary_blocked` Clarity Map responses stay inline in chat.
- Only `type: "clarity_map"` may render as a normal generated map.
- Empty `/clarity-map` must show CTA back to chat, not static/mock content.

## Rendering And Privacy Guardrails

- Render user/model/generated text as plain React text.
- Do not use `dangerouslySetInnerHTML`.
- Do not render model output as HTML.
- Do not log raw mental-health messages.
- Do not send raw mental-health content to analytics providers.
- Do not expose server-only secrets to frontend code.
- Raw chat content remains in `sessionStorage` for the active browser journey.
  After storage opt-in, retained server copies of chat, Clarity Maps, and
  feedback comments are encrypted before database writes.
- Browser storage is not secure persistence or authorization.

## Known Safety Gaps Or TODOs

- No production rate limits yet.
- No accounts, event-level safety metadata persistence, or delete/export
  controls yet.
- No OpenAI moderation path currently used.
- Safety rules are deterministic plus optional triage and require continued regression tests for new phrasing.
- Resource catalog is static and not exhaustive.
- Real-world emergency support availability varies by location and must be described conservatively.

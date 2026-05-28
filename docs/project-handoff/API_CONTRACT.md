# API_CONTRACT.md

_Last updated: 2026-05-28 after Block 5C_

This is the current frontend-facing API contract for the MindBridge MVP backend.

General rules:

- Local base URL: `http://localhost:3000`
- JSON endpoints expect `Content-Type: application/json` unless otherwise noted.
- Current MVP has no auth requirement.
- Do not send OpenAI keys from the frontend.
- Do not expose `.env.local` contents.
- Do not render model/user text with `dangerouslySetInnerHTML`.
- Frontend must not infer or override safety. Render backend safety decisions.
- If an exact implementation detail is not verified, it is marked `Needs verification`.

---

## Endpoint Index

```txt
POST /api/sessions
POST /api/context-intake
POST /api/chat
POST /api/clarity-map
GET  /api/resources
POST /api/feedback
```

---

## API Changes Since Previous Version

| Endpoint/Schema | Change | Reason | Frontend impact | Backward compatible? |
|---|---|---|---|---|
| `POST /api/clarity-map` | Added enhanced transcript-based request and response union. | Generate real structured Clarity Maps from chat. | Frontend should send `sessionContext` + `messages` from ChatPanel. | Yes; legacy `{ sessionId }` still returns `{ clarityMap }`. |
| `ClarityMapApiResponse` | Added union: `clarity_map`, `safety_blocked`, `boundary_blocked`, `insufficient_context`. | Model result and safety states need different rendering. | Frontend must branch by `type`. | Additive. |
| `StructuredClarityMap` | Added structured map model with Harmony Signal, Key Insight, Boundary Focus, Action Plan, Support Path. | Replace old static map in real flow. | `/clarity-map` renders structured sections. | Additive. |
| `HarmonySignal` | Added weighted V2 scoring and banding. | Avoid repetitive 60/Mixed and keep non-clinical signal. | Frontend renders score/band/label from backend. | Shape remains within generated map. |
| `POST /api/chat` risk object | Added/uses `signalTags?: RiskSignalTag[]` for third-party self-harm. | Structured internal/public-safe routing metadata. | Frontend may display/debug if needed, but should not decide risk. | Additive. |
| `ChatPanel` clarity flow | Now calls enhanced `/api/clarity-map`; stores generated maps in `sessionStorage`. | Use real transcript for map. | Generate button now functional. | Existing chat still works. |
| `/clarity-map` page | Reads generated map from `sessionStorage`; no default static mock fallback. | Avoid fake map after real flow. | Show CTA if no generated map exists. | Demo/mock may still use mock elsewhere. |

---

# 1. POST `/api/sessions`

## Purpose

Create/normalize an anonymous onboarding session for the MVP.

## Current implementation status

Implemented. Exact response shape should be verified against:

```txt
src/lib/validation/sessions.ts
src/lib/server/sessions.ts
src/components/product/onboarding-form.tsx
```

## Required headers

```http
Content-Type: application/json
```

## Auth requirements

None currently.

## Request JSON schema

Expected current shape:

```json
{
  "countryCode": "US",
  "countryLabel": "USA",
  "ageConfirmed": true,
  "consentAccepted": true,
  "mainConcernCategory": "overwhelmed",
  "mainConcernLabel": "Overwhelmed",
  "mainConcernText": "Optional extra note"
}
```

Allowed `countryCode` from visible onboarding:

```txt
US
IN
```

Allowed `mainConcernCategory`:

```txt
overwhelmed
anxious_worried
low_numb_disconnected
work_study_stress
relationship_family
sleep_energy
not_sure
```

## Response JSON schema

Expected response may be:

```json
{
  "sessionId": "mock_session_1779973000000",
  "status": "created",
  "sessionContext": {
    "sessionId": "mock_session_1779973000000",
    "countryCode": "US",
    "countryLabel": "USA",
    "ageConfirmed": true,
    "consentAccepted": true,
    "mainConcernCategory": "overwhelmed",
    "mainConcernLabel": "Overwhelmed",
    "mainConcernText": "Optional extra note"
  }
}
```

Needs verification:

- Whether response always includes full `sessionContext`.
- Whether legacy fields like `country`, `ageBand`, or `mainConcern` are still accepted.

## Example request

```bash
curl -s http://localhost:3000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "countryCode": "US",
    "countryLabel": "USA",
    "ageConfirmed": true,
    "consentAccepted": true,
    "mainConcernCategory": "overwhelmed",
    "mainConcernLabel": "Overwhelmed"
  }' | python3 -m json.tool
```

## Example response

```json
{
  "sessionId": "mock_session_1779973000000",
  "status": "created",
  "sessionContext": {
    "sessionId": "mock_session_1779973000000",
    "countryCode": "US",
    "countryLabel": "USA",
    "ageConfirmed": true,
    "consentAccepted": true,
    "mainConcernCategory": "overwhelmed",
    "mainConcernLabel": "Overwhelmed"
  }
}
```

## Error responses

Validation error shape is likely:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please check your input."
  }
}
```

Needs verification for exact response/status.

## Frontend notes

- Call from `/onboarding` after required fields/checks are complete.
- Store returned session context locally for MVP.
- Client-held session context is not authorization.

---

# 2. POST `/api/context-intake`

## Purpose

Generate the first assistant opener for `/chat` from onboarding context.

Also runs Safety Core preflight against optional onboarding text before normal opener generation.

## Current implementation status

Implemented.

## Required headers

```http
Content-Type: application/json
```

## Auth requirements

None currently.

## Request JSON schema

```json
{
  "sessionContext": {
    "sessionId": "session_123",
    "countryCode": "US",
    "countryLabel": "USA",
    "ageConfirmed": true,
    "consentAccepted": true,
    "mainConcernCategory": "overwhelmed",
    "mainConcernLabel": "Overwhelmed",
    "mainConcernText": "Optional extra note"
  }
}
```

Validation rules:

- `sessionContext.sessionId` required
- `countryCode` must be `US` or `IN`
- `ageConfirmed` must be `true`
- `consentAccepted` must be `true`
- `mainConcernCategory` required
- `mainConcernLabel` required
- `mainConcernText` optional/length-constrained
- `GLOBAL` is rejected at this route

## Response JSON schema: opener

```json
{
  "type": "opener",
  "assistantMessage": {
    "id": "context_intake_1779973000000",
    "role": "assistant",
    "content": "You mentioned feeling overwhelmed. What has felt most overloaded recently?",
    "createdAt": "2026-05-28T13:00:00.000Z"
  },
  "contextIntake": {
    "schemaVersion": "context_intake.v1",
    "openingMessage": "You mentioned feeling overwhelmed. What has felt most overloaded recently?",
    "inferredFocusAreas": ["overwhelm"],
    "firstQuestionType": "clarify_main_pressure",
    "tone": "warm_grounded",
    "safetyNoteNeeded": false,
    "shouldMentionProfessionalSupport": false,
    "confidence": "medium"
  },
  "source": "openai"
}
```

`source` may be:

```txt
openai
fallback
```

## Response JSON schema: safety

```json
{
  "type": "safety",
  "assistantMessage": {
    "id": "context_intake_1779973000000",
    "role": "assistant",
    "content": "...safe support response...",
    "createdAt": "2026-05-28T13:00:00.000Z"
  },
  "risk": {
    "level": "high",
    "categories": ["self_harm"],
    "requiresCrisisResponse": true,
    "resourceTopics": ["self_harm", "crisis", "support"]
  },
  "safety": {
    "showInlineSafetyCard": true,
    "disableNormalNextStep": true,
    "title": "Support now",
    "message": "...",
    "tone": "support"
  },
  "resources": [],
  "source": "safety"
}
```

## Response JSON schema: boundary

```json
{
  "type": "boundary",
  "assistantMessage": {
    "id": "context_intake_1779973000000",
    "role": "assistant",
    "content": "MindBridge cannot diagnose...",
    "createdAt": "2026-05-28T13:00:00.000Z"
  },
  "policyBoundary": {
    "action": "answer_with_boundary",
    "categories": ["diagnosis_request"]
  },
  "source": "boundary"
}
```

## Example request

```bash
curl -s http://localhost:3000/api/context-intake \
  -H "Content-Type: application/json" \
  -d '{
    "sessionContext": {
      "sessionId": "session_123",
      "countryCode": "US",
      "countryLabel": "USA",
      "ageConfirmed": true,
      "consentAccepted": true,
      "mainConcernCategory": "overwhelmed",
      "mainConcernLabel": "Overwhelmed"
    }
  }' | python3 -m json.tool
```

## Error responses

Validation error likely:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please check your input."
  }
}
```

## Frontend notes

- `/chat` should call this once per session.
- Cache opener to avoid duplicates.
- If no session context, show CTA back to onboarding.
- If `type` is safety/boundary, render that instead of normal opener.

---

# 3. POST `/api/chat`

## Purpose

Process a user chat message through Safety Core and, when allowed, AI conversation.

## Current implementation status

Implemented.

## Required headers

```http
Content-Type: application/json
```

## Auth requirements

None currently.

## Request JSON schema

```json
{
  "sessionId": "session_123",
  "message": "I feel overwhelmed at work.",
  "sessionContext": {
    "sessionId": "session_123",
    "countryCode": "US",
    "countryLabel": "USA",
    "ageConfirmed": true,
    "consentAccepted": true,
    "mainConcernCategory": "overwhelmed",
    "mainConcernLabel": "Overwhelmed",
    "mainConcernText": "Optional note"
  }
}
```

## Response JSON schema: normal

```json
{
  "assistantMessage": {
    "id": "mock_assistant_1779973000000",
    "role": "assistant",
    "content": "That sounds heavy. What feels most overloaded right now?",
    "createdAt": "2026-05-28T13:00:00.000Z"
  },
  "risk": {
    "level": "low",
    "categories": [],
    "requiresCrisisResponse": false,
    "reason": "No immediate safety concern detected."
  },
  "nextRecommendedAction": "continue_chat",
  "mode": "normal",
  "safety": null,
  "resources": [],
  "source": "openai",
  "safetyState": "normal_support"
}
```

`source` may be `openai` or `fallback` for normal allowed chat.

## Response JSON schema: elevated distress

```json
{
  "assistantMessage": {
    "id": "mock_assistant_1779973000000",
    "role": "assistant",
    "content": "That sounds really heavy. When you say you don’t know if you can keep doing this, do you mean the situation feels unsustainable, or are you feeling unsafe right now?",
    "createdAt": "2026-05-28T13:00:00.000Z"
  },
  "risk": {
    "level": "medium",
    "categories": [],
    "requiresCrisisResponse": false
  },
  "nextRecommendedAction": "continue_with_supportive_nudge",
  "mode": "support",
  "safety": null,
  "resources": [],
  "source": "fallback",
  "safetyState": "elevated_distress"
}
```

## Response JSON schema: safety

```json
{
  "assistantMessage": {
    "id": "mock_assistant_1779973000000",
    "role": "assistant",
    "content": "...safety response...",
    "createdAt": "2026-05-28T13:00:00.000Z"
  },
  "risk": {
    "level": "imminent",
    "categories": ["self_harm"],
    "requiresCrisisResponse": true,
    "reason": "...",
    "resourceTopics": ["self_harm", "crisis", "emergency"],
    "signalTags": []
  },
  "nextRecommendedAction": "urgent_support",
  "mode": "crisis",
  "safety": {
    "showInlineSafetyCard": true,
    "disableNormalNextStep": true,
    "title": "Immediate support",
    "message": "...",
    "tone": "urgent"
  },
  "resources": [],
  "source": "safety",
  "safetyState": "imminent_risk"
}
```

## Response JSON schema: third-party self-harm

```json
{
  "assistantMessage": {
    "id": "mock_assistant_1779973558786",
    "role": "assistant",
    "content": "That sounds serious. If this person may be in immediate danger, contact local emergency services or a trusted person near them. If you can, stay connected with them and encourage immediate support.",
    "createdAt": "2026-05-28T13:05:58.786Z"
  },
  "risk": {
    "level": "high",
    "categories": ["self_harm"],
    "requiresCrisisResponse": true,
    "reason": "Message reports self-harm intent for another person.",
    "resourceTopics": ["self_harm", "crisis", "support"],
    "signalTags": ["third_party_self_harm"]
  },
  "nextRecommendedAction": "show_resources",
  "mode": "support",
  "safety": {
    "showInlineSafetyCard": true,
    "disableNormalNextStep": true,
    "title": "Support for someone else",
    "message": "That sounds serious...",
    "tone": "support"
  },
  "resources": [],
  "source": "safety",
  "safetyState": "third_party_self_harm"
}
```

## Response JSON schema: policy boundary

```json
{
  "assistantMessage": {
    "id": "mock_assistant_1779973000000",
    "role": "assistant",
    "content": "MindBridge cannot diagnose. I can help you organize what you are noticing and what may be worth discussing with a qualified professional.",
    "createdAt": "2026-05-28T13:00:00.000Z"
  },
  "risk": {
    "level": "none",
    "categories": [],
    "requiresCrisisResponse": false
  },
  "nextRecommendedAction": "continue_with_supportive_nudge",
  "mode": "support",
  "safety": null,
  "resources": [],
  "source": "boundary",
  "policyBoundary": {
    "action": "answer_with_boundary",
    "categories": ["diagnosis_request"]
  },
  "safetyState": "policy_boundary"
}
```

## Safety/risk fields returned

Important fields:

```txt
source
risk.level
risk.categories
risk.signalTags
risk.requiresCrisisResponse
nextRecommendedAction
mode
safety
resources
policyBoundary
safetyState
```

## Error responses

Validation error likely:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please check your input."
  }
}
```

Server error shape needs verification.

## Frontend usage notes

- Always send `sessionContext` when available.
- Render safety/boundary according to backend fields.
- Do not infer risk client-side.
- If `safety.disableNormalNextStep` is true, pause/deprioritize Clarity Map.

---

# 4. POST `/api/clarity-map`

## Purpose

Generate or retrieve a Clarity Map for a session.

There are two paths:

1. **Legacy path**: `{ sessionId }` returns old mock-compatible `{ clarityMap }`.
2. **Enhanced path**: `{ sessionId, sessionContext, messages }` generates transcript-based structured Clarity Map or blocked/insufficient response.

## Current implementation status

Implemented.

- Legacy compatibility preserved.
- Enhanced transcript-based generation implemented.
- OpenAI/fallback generation implemented.
- Safety/boundary gating implemented.
- Frontend integration implemented.
- Harmony Signal V2 implemented.

## Required headers

```http
Content-Type: application/json
```

## Auth requirements

None currently.

## Request JSON schema: legacy

```json
{
  "sessionId": "session_123"
}
```

## Response JSON schema: legacy

```json
{
  "clarityMap": {
    "headline": "Stress and disconnection may be the main patterns to explore.",
    "riskLevel": "low",
    "nonDiagnosisNotice": "This is not a diagnosis...",
    "patterns": [],
    "focusAreas": [],
    "next24Hours": [],
    "next7Days": [],
    "suggestedSupportPath": "...",
    "resources": []
  }
}
```

This is retained for backward compatibility only. The real user flow should use the enhanced request.

## Request JSON schema: enhanced

```json
{
  "sessionId": "session_123",
  "sessionContext": {
    "sessionId": "session_123",
    "countryCode": "US",
    "countryLabel": "USA",
    "ageConfirmed": true,
    "consentAccepted": true,
    "mainConcernCategory": "overwhelmed",
    "mainConcernLabel": "Overwhelmed",
    "mainConcernText": "Optional note"
  },
  "messages": [
    {
      "id": "m1",
      "role": "assistant",
      "content": "You mentioned feeling overwhelmed. What has felt most overloaded recently?",
      "createdAt": "2026-05-28T00:00:00.000Z"
    },
    {
      "id": "m2",
      "role": "user",
      "content": "I feel overwhelmed after work and keep replaying conversations.",
      "createdAt": "2026-05-28T00:01:00.000Z"
    }
  ],
  "lastRisk": null,
  "lastSafetyState": null
}
```

`lastRisk` and `lastSafetyState` are optional hints only. Backend reruns safety and does not blindly trust them.

## Enhanced response union

### 4.1 `type: "clarity_map"`

```json
{
  "type": "clarity_map",
  "source": "openai",
  "clarityMap": {
    "schemaVersion": "clarity_map.v1",
    "status": "generated",
    "disclaimer": "This is not a diagnosis. It is a reflection map based only on what you shared here.",
    "harmonySignal": {
      "label": "The pattern is clearer than the recovery path",
      "score": 57,
      "band": "mixed",
      "explanation": "A non-clinical reflection signal based only on this conversation.",
      "components": {
        "emotionalLoad": 3,
        "triggerClarity": 3,
        "supportConnection": 2,
        "actionReadiness": 2,
        "safetyStability": 3
      }
    },
    "keyInsight": {
      "title": "Work pressure may be carrying into recovery time",
      "summary": "Patterns that may be present...",
      "evidence": [
        {
          "point": "The user described replaying work conversations after work.",
          "evidenceMessageIds": ["m2"]
        }
      ]
    },
    "boundaryFocus": {
      "title": "Protect one small recovery boundary",
      "boundaryType": "work_boundary",
      "insights": [
        "The pressure appears to continue after work ends.",
        "A small decompression boundary may help create separation."
      ],
      "smallExperiment": "Choose one 20-minute after-work window without checking work messages."
    },
    "actionPlan": {
      "next24Hours": [
        {
          "action": "Write down the one work thought that keeps replaying.",
          "whyThisHelps": "Externalizing it can make it easier to contain."
        }
      ],
      "next7Days": [
        {
          "action": "Track which work triggers follow you home most often.",
          "whyThisHelps": "A short pattern log can clarify what boundary would help."
        }
      ]
    },
    "supportPath": {
      "recommendation": "Start with small reflection and trusted-person support.",
      "suggestedResourceTopics": ["stress", "support", "professional_support"],
      "professionalSupportNote": "A qualified professional may help you explore this if it continues."
    },
    "confidence": "medium"
  }
}
```

`source` can be:

```txt
openai
fallback
```

### 4.2 `type: "insufficient_context"`

```json
{
  "type": "insufficient_context",
  "source": "fallback",
  "message": "We need a little more conversation to build a useful map. Share one or two more messages first."
}
```

### 4.3 `type: "safety_blocked"`

```json
{
  "type": "safety_blocked",
  "source": "safety",
  "assistantMessage": {
    "id": "clarity_map_block_1779977665371",
    "role": "assistant",
    "content": "...urgent safety message...",
    "createdAt": "2026-05-28T14:14:25.371Z"
  },
  "risk": {
    "level": "imminent",
    "categories": ["self_harm"],
    "requiresCrisisResponse": true,
    "resourceTopics": ["self_harm", "crisis", "emergency"]
  },
  "safety": {
    "showInlineSafetyCard": true,
    "disableNormalNextStep": true,
    "title": "Immediate support",
    "message": "...",
    "tone": "urgent"
  },
  "resources": []
}
```

Safety-blocked responses do **not** include a normal Harmony Signal or `/100` score.

### 4.4 `type: "boundary_blocked"`

```json
{
  "type": "boundary_blocked",
  "source": "boundary",
  "assistantMessage": {
    "id": "clarity_map_boundary_...",
    "role": "assistant",
    "content": "MindBridge cannot create a diagnostic or treatment-style map...",
    "createdAt": "2026-05-28T14:14:25.371Z"
  },
  "policyBoundary": {
    "action": "answer_with_boundary",
    "categories": ["diagnosis_request"]
  }
}
```

## Enhanced generation safety rules

Backend order:

1. Extract latest meaningful user message.
2. Run Safety Core / policy-boundary gating.
3. If safety -> `safety_blocked`.
4. If boundary -> `boundary_blocked`.
5. Then check insufficient context.
6. Then generate map.

## Harmony Signal scoring

Harmony Signal is non-clinical and based only on this conversation.

Components:

```txt
emotionalLoad: 0-4          higher lowers score
triggerClarity: 0-4         higher raises score
supportConnection: 0-4      higher raises score
actionReadiness: 0-4        higher raises score
safetyStability: 0-4        higher raises score
```

V2 formula:

```ts
score = round(
  (
    ((4 - emotionalLoad) * 0.25) +
    (triggerClarity * 0.20) +
    (supportConnection * 0.18) +
    (actionReadiness * 0.19) +
    (safetyStability * 0.18)
  ) / 4 * 100
)
```

Bands:

```txt
75-100: steady
55-74: mixed
35-54: strained
0-34: support_first
```

`support_first` is for non-crisis generated maps where support should be prioritized. High/imminent safety cases should be `safety_blocked`, not scored.

## Example request: enhanced normal

```bash
curl -s http://localhost:3000/api/clarity-map \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "manual_clarity_normal",
    "sessionContext": {
      "sessionId": "manual_clarity_normal",
      "countryCode": "US",
      "countryLabel": "USA",
      "ageConfirmed": true,
      "consentAccepted": true,
      "mainConcernCategory": "overwhelmed",
      "mainConcernLabel": "Overwhelmed"
    },
    "messages": [
      {
        "id": "m1",
        "role": "assistant",
        "content": "You mentioned feeling overwhelmed. What has felt most overloaded recently?",
        "createdAt": "2026-05-28T00:00:00.000Z"
      },
      {
        "id": "m2",
        "role": "user",
        "content": "I feel overwhelmed after work and keep replaying conversations in my head.",
        "createdAt": "2026-05-28T00:01:00.000Z"
      },
      {
        "id": "m3",
        "role": "user",
        "content": "I think I do not have a clean boundary between work time and home time.",
        "createdAt": "2026-05-28T00:02:00.000Z"
      }
    ]
  }' | python3 -m json.tool
```

## Example request: safety-blocked

```bash
curl -s http://localhost:3000/api/clarity-map \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "manual_clarity_safety",
    "sessionContext": {
      "sessionId": "manual_clarity_safety",
      "countryCode": "US",
      "countryLabel": "USA",
      "ageConfirmed": true,
      "consentAccepted": true,
      "mainConcernCategory": "not_sure",
      "mainConcernLabel": "I’m not sure"
    },
    "messages": [
      {
        "id": "m1",
        "role": "user",
        "content": "I do not feel safe with myself tonight.",
        "createdAt": "2026-05-28T00:01:00.000Z"
      }
    ]
  }' | python3 -m json.tool
```

Expected:

```json
{
  "type": "safety_blocked",
  "source": "safety"
}
```

## Frontend usage notes

- Real ChatPanel should send enhanced request with messages.
- Store only successful `type: clarity_map` responses in `sessionStorage`.
- Navigate to `/clarity-map?sessionId=...` only for `type: clarity_map`.
- Keep `insufficient_context`, `safety_blocked`, and `boundary_blocked` inline in chat.
- Do not render old static mock map as default real `/clarity-map` content.

---

# 5. GET `/api/resources`

## Purpose

Return deterministic support resources.

## Current implementation status

Implemented using static app-owned resource data.

## Required headers

None for GET.

## Auth requirements

None currently.

## Query parameters

Needs verification in `src/lib/validation/resources.ts`.

Expected/likely:

```txt
countryCode=US|IN|GLOBAL
topic=crisis|support|self_harm|abuse|professional_support|...
riskLevel=medium|high|imminent
```

May also accept:

```txt
country=USA|India|global
```

## Example request

```txt
GET /api/resources?countryCode=US&topic=crisis
```

## Example response

```json
{
  "resources": [
    {
      "id": "us-988-lifeline",
      "title": "United States 988 Lifeline",
      "description": "In the United States, 988 can connect people with crisis support by call, text, or chat.",
      "type": "crisis",
      "country": "US",
      "topics": ["emergency", "crisis", "self_harm", "support"],
      "riskLevels": ["high", "imminent"],
      "actionLabel": "Call or text 988",
      "href": "tel:988",
      "phone": "988",
      "priority": 1,
      "availabilityNote": "United States crisis support access point; availability and fit can vary by situation."
    }
  ]
}
```

## Frontend notes

- `/api/chat` and `/api/clarity-map` safety responses already return resources.
- `/resources` page can call this endpoint.
- Frontend must not invent resources.

---

# 6. POST `/api/feedback`

## Purpose

Accept MVP feedback for a session.

## Current implementation status

Implemented as mock/stub. No database persistence yet.

## Required headers

```http
Content-Type: application/json
```

## Auth requirements

None currently.

## Request JSON schema

```json
{
  "sessionId": "session_123",
  "clarityRating": 4,
  "helpfulnessRating": 5,
  "comment": "This helped me organize what I am feeling."
}
```

## Response JSON schema

```json
{
  "status": "received"
}
```

Needs verification for exact validation limits.

## Frontend notes

- Use after Clarity Map/resources.
- Do not promise persistent storage yet.
- Do not send raw mental-health content to external analytics.

---

## Common Frontend Rendering Rules

### Render by `source`

```txt
openai   -> normal AI/generated response
fallback -> deterministic fallback response
safety   -> safety support route; show safety/resources
boundary -> product-boundary response; do not treat as normal advice
```

### Render by `/api/clarity-map` `type`

```txt
clarity_map          -> store/render map
insufficient_context -> inline message, no navigation
safety_blocked       -> inline safety/resources, no normal map
boundary_blocked     -> inline boundary message, no normal map
```

### Clarity Map CTA rules

Disable/deprioritize if:

```txt
safety?.disableNormalNextStep === true
risk.level is high or imminent
nextRecommendedAction is show_resources or urgent_support
source is safety
```

### Text rendering rules

- Render text as plain React text.
- Do not use `dangerouslySetInnerHTML`.
- Do not show raw stack traces.
- Do not show regex/evidence/debug internals.

---

## Local Eval Harness

Script:

```bash
npm run eval:ai:smoke
```

Full real eval command:

```bash
RUN_REAL_AI_EVALS=true EVAL_BASE_URL=http://localhost:3000 npm run eval:ai:smoke
```

Requires:

```bash
npm run dev
```

Latest expected result:

```txt
Passed: 13/13
Failed: 0
OpenAI-backed sources appeared: true
Safety routes passed: true
Boundary routes passed: true
```

Do not commit:

```txt
eval-results/
```

---

## Planned / Not Implemented Yet

```txt
Authentication
Database persistence
Supabase RLS runtime use
Production session ownership
Rate limiting
Payments
External resource APIs
Streaming
Long-term memory
User profile management
Delete/export user data
Admin dashboard
Production deployment validation
```

---

## Backend Decisions Frontend Should Not Rework

- Safety Core owns safety decisions.
- Frontend should not decide risk or override safety.
- AI triage is a signal, not authority.
- Deterministic critical rules are hard floor.
- Resources are deterministic and app-owned.
- Model should not invent resources.
- Do not expose OpenAI keys.
- Do not add fake real-chat messages.
- Do not bypass `/api/context-intake` for first opener.
- Do not call `/api/context-intake` repeatedly.
- Do not render static mock Clarity Map as default real flow.
- Do not generate Clarity Map during safety/boundary-blocked states.


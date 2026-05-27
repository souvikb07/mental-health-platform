# MindBridge Phase 1 Codex Starter

Architecture-first starter pack for the Phase 1 MVP of **MindBridge**: an AI-powered mental health clarity assistant.

The product promise:

> Help people name what they may be experiencing and choose the right next support step.

The product is **not** a therapist, diagnosis engine, crisis service, or medical-treatment tool.

## Phase 1 outcome

By the end of Phase 1, the repo should support this journey:

```txt
Landing page
  -> Consent / safety onboarding
  -> Guided AI clarity conversation
  -> Safety-aware routing
  -> Structured Clarity Map
  -> Relevant resources
  -> Feedback
```

## How to use this pack

Recommended order:

1. Create a fresh Next.js app.
2. Copy this starter pack into the repo root.
3. Let Codex read `AGENTS.md`, `docs/`, `prompts/`, `schemas/`, and `supabase/` before coding.
4. Use the Codex prompts in `codex/prompts/` one by one.
5. After each Codex task, update `CODEX_BUILD_LOG.md`.

## Main files to read first

```txt
AGENTS.md
SETUP_COMMANDS.md
PROJECT_TREE.md
docs/product/01-phase-1-scope.md
docs/architecture/00-system-overview.md
docs/architecture/02-safety-pipeline.md
docs/architecture/04-api-contracts.md
prompts/conversation-agent.md
prompts/risk-classifier.md
schemas/clarity-map.schema.json
supabase/migrations/0001_phase1_schema.sql
```

## Non-negotiables

- No diagnosis.
- No medication advice.
- No therapy replacement language.
- Crisis and self-harm risk must route to safe support.
- Sensitive mental health text must not be sent to analytics tools.
- Anonymous sessions first; auth comes later.
- Every feature must support the core loop.

## Phase 1 definition of done

```txt
1. User can start an anonymous session.
2. User can complete a guided clarity chat.
3. Risk classification runs before every assistant reply.
4. High/imminent risk routes away from normal chat.
5. User can generate a structured Clarity Map.
6. Clarity Map shows patterns, focus areas, next 24 hours, next 7 days, and support path.
7. Resource suggestions are deterministic, not hallucinated.
8. User can submit feedback.
9. Demo screenshots are ready.
10. Codex usage is documented.
```

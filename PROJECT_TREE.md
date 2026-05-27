# Project Tree

This is the intended Phase 1 architecture.

```txt
mindbridge/
  AGENTS.md
  README.md
  SETUP_COMMANDS.md
  PROJECT_TREE.md
  CODEX_BUILD_LOG.md
  .env.example

  docs/
    product/
      00-vision-and-positioning.md
      01-phase-1-scope.md
      02-user-flow.md
      03-ideal-customer-profile.md
      04-feature-spec.md
    architecture/
      00-system-overview.md
      01-ai-orchestration.md
      02-safety-pipeline.md
      03-data-model.md
      04-api-contracts.md
      05-resource-routing.md
      06-privacy-security.md
      07-testing-and-evals.md
      08-deployment.md
    adr/
      ADR-0001-stack-choice.md
      ADR-0002-anonymous-sessions-first.md
      ADR-0003-safety-first-ai-pipeline.md
    pitch/
      4-slide-phase-1-deck.md
      one-page-investor-pitch.md
    research/
      validation-plan.md
      user-interview-script.md

  codex/
    README.md
    CODEX_TASKS.md
    prompts/
      001-bootstrap-repo.md
      002-database-and-types.md
      003-chat-api.md
      004-safety-router.md
      005-clarity-map.md
      006-resource-routing.md
      007-ui-polish.md
      008-tests-and-demo-page.md

  prompts/
    conversation-agent.md
    risk-classifier.md
    clarity-map-generator.md
    post-response-validator.md

  schemas/
    clarity-map.schema.json
    risk-classification.schema.json
    resource.schema.json
    feedback.schema.json

  supabase/
    migrations/
      0001_phase1_schema.sql
    seed/
      resources_seed.sql

  src/
    app/
      (marketing)/
        page.tsx
      onboarding/
        page.tsx
      chat/
        page.tsx
      clarity-map/
        [sessionId]/
          page.tsx
      resources/
        page.tsx
      demo/
        page.tsx
      api/
        AGENTS.md
        chat/
          route.ts
        clarity-map/
          route.ts
        feedback/
          route.ts
        resources/
          route.ts
    components/
      AGENTS.md
      chat/
      clarity-map/
      layout/
      resources/
      safety/
      ui/
    lib/
      ai/
      db/
      resources/
      safety/
      telemetry/
      validation/
    types/

  tests/
    evals/
      safety-test-cases.md
      safety-test-cases.json
      clarity-map-test-cases.md
    unit/
      README.md
```

## Implementation principle

The folder structure separates four concerns:

1. `app/` handles user-facing routes and API route handlers.
2. `lib/` holds business logic and external integrations.
3. `prompts/` and `schemas/` make AI behavior explicit and testable.
4. `docs/` and `codex/` keep Codex aligned with product intent.

# Codex Prompt 004: Safety Router

Read:

- docs/architecture/02-safety-pipeline.md
- schemas/risk-classification.schema.json
- tests/evals/safety-test-cases.json

Task:

Implement safety routing.

Create:

- `src/lib/safety/risk-classifier.ts`
- `src/lib/safety/crisis-response.ts`
- `src/lib/safety/post-response-validator.ts`
- `src/lib/safety/safety-events.ts`
- tests for risk branching

Constraints:

- high/imminent risk must not continue normal conversation
- crisis response must be short, direct, and supportive
- no invented resources
- log safety event without raw sensitive excerpts

After implementation:

- run tests
- update CODEX_BUILD_LOG.md

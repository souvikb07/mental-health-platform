# Codex Prompt 003: Chat API

Read:

- docs/architecture/04-api-contracts.md
- docs/architecture/01-ai-orchestration.md
- prompts/conversation-agent.md
- prompts/risk-classifier.md

Task:

Implement `/api/chat`.

Flow:

1. Validate body `{ sessionId, message }`.
2. Save user message.
3. Run risk classification.
4. If high/imminent, return safety response.
5. Otherwise generate normal assistant response.
6. Validate assistant response.
7. Save assistant message.
8. Return response.

Constraints:

- route handler must stay thin
- business logic belongs in `src/lib/ai` and `src/lib/safety`
- no diagnosis
- no medication advice
- no crisis-risk normal chat

After implementation:

- add tests for request validation and high-risk branching
- update CODEX_BUILD_LOG.md

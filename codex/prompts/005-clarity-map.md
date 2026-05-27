# Codex Prompt 005: Clarity Map

Read:

- schemas/clarity-map.schema.json
- prompts/clarity-map-generator.md
- docs/product/04-feature-spec.md

Task:

Implement Clarity Map generation and UI.

Create:

- `/api/clarity-map`
- `src/lib/ai/clarity-map.ts`
- `src/components/clarity-map/ClarityMap.tsx`
- route page `/clarity-map/[sessionId]`

Constraints:

- output must validate against schema
- include non-diagnosis notice
- no medication or treatment plan
- show focus areas, next 24 hours, next 7 days, support path, resources

After implementation:

- add schema validation tests
- update CODEX_BUILD_LOG.md

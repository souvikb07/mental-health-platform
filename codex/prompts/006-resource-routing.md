# Codex Prompt 006: Resource Routing

Read:

- docs/architecture/05-resource-routing.md
- schemas/resource.schema.json
- supabase/seed/resources_seed.sql

Task:

Implement deterministic resource routing.

Create:

- `src/lib/resources/resource-router.ts`
- `/api/resources`
- resource card UI
- tests for high-risk and normal routing

Constraints:

- model must not invent actual resources
- use curated data only
- prioritize crisis resources for high/imminent risk

After implementation:

- update CODEX_BUILD_LOG.md

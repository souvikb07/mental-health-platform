# Codex Prompt 002: Database and Types

Read:

- docs/architecture/03-data-model.md
- supabase/migrations/0001_phase1_schema.sql
- schemas/*.json

Task:

Add database helpers and TypeScript types for Phase 1.

Implement:

- `src/lib/db/client.ts`
- `src/lib/db/server.ts`
- `src/types/database.ts`
- helper functions for sessions, messages, clarity maps, safety events, resources, feedback

Constraints:

- service role key only server-side
- no raw sensitive logs
- validate inputs before writes

After implementation:

- add unit tests for helper functions where possible
- update CODEX_BUILD_LOG.md

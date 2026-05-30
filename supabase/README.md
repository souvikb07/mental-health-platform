# Supabase Foundation

Apply migrations in order:

```txt
0001_phase1_schema.sql
0002_sprint1_production_data_foundation.sql
0003_sprint1_anonymous_session_creation_rpc.sql
0004_sprint1_persisted_chat_turns.sql
0005_sprint1_persisted_clarity_feedback.sql
0006_sprint1_event_metadata.sql
```

`0001` is the immutable starter migration. `0002` adds the Sprint 1 database
foundation while preserving ownerless legacy rows for compatibility.
`0003` adds the service-role-only transactional RPC used to create or reuse an
anonymous owner, create one session, and record its initial consent events.
`0004` adds raw-free chat-turn claims and service-role-only RPCs for atomic
encrypted context-intake and chat retention.
`0005` adds raw-free Clarity Map replay claims and service-role-only RPCs for
encrypted map retention, raw-free safety-state merges, and feedback writes.
`0006` hardens owner-linked safety events and adds service-role-only
transactional wrappers for raw-free safety, policy, model, and audit metadata.

## Sprint 1 Foundation

- Anonymous owners store only a SHA-256 token hash. The opaque cookie value
  remains server-owned and never belongs in Postgres.
- New owner-linked sessions expire 30 days after their own creation.
- Owner cleanup happens only after no live sessions remain.
- New owner-linked sensitive content uses application-encrypted AES-256-GCM
  envelopes. Database triggers reject plaintext writes and malformed envelopes.
- Context-intake responses and chat turns retain encrypted content only after
  storage opt-in. Chat retry claims remain raw-free for opted-out sessions.
- Opted-in Clarity Maps retain encrypted responses. When a retained chat
  transcript exists, raw-free fingerprint claims replay completed maps and
  recover abandoned generation after five minutes.
- Feedback ratings and flags may persist without sensitive-content opt-in;
  comments require opt-in and an encrypted envelope.
- Safety, policy, model, and audit metadata is structured, raw-free, and
  committed atomically with the associated Supabase-mode write or state merge.
- Rate-limit buckets store only short-lived HMAC identifiers. The schema stores
  no raw IP address and makes no forwarded-header trust assumption.
- Curated runtime resources continue to come from the tested TypeScript
  catalog. `seed/resources_seed.sql` is historical starter data, not the live
  catalog.

## Verification

No remote Supabase project exists yet. Before any production project exists,
apply `0001` through `0006` to a disposable Supabase project and
verify:

1. table, column, index, trigger, RLS, policy, grant, and RPC shape
2. session-relative expiry and orphan-owner cleanup
3. rejection of plaintext owner-linked sensitive writes
4. acceptance of valid encrypted opt-in writes and raw-free feedback ratings
5. owner hard-delete cascades
6. fixed-window rate-limit increments, expiry, and input validation
7. context-intake deduplication, chat-turn claim replay, active conflicts,
   five-minute stale reclaim, and atomic completion
8. Clarity Map encrypted replay, active conflicts, stale reclaim, raw-free
   opt-out generation, and append-only feedback writes
9. atomic raw-free event wrappers, owner scoping, append-only event-table
   access, and rejection of unknown metadata keys

The server-only client, encryption helper, and anonymous session-creation
repository are implemented. Ownership guards, encrypted context-intake/chat
retention, safety-state continuity, encrypted Clarity Map replay, and
consent-aware feedback persistence are implemented. Purge scheduling and the
trusted deployment-header policy belong to later Sprint 1 blocks.

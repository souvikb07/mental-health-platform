# Supabase Foundation

Apply migrations in order:

```txt
0001_phase1_schema.sql
0002_sprint1_production_data_foundation.sql
```

`0001` is the immutable starter migration. `0002` adds the Sprint 1 database
foundation while preserving ownerless legacy rows for compatibility.

## Sprint 1 Foundation

- Anonymous owners store only a SHA-256 token hash.
- New owner-linked sessions expire 30 days after their own creation.
- Owner cleanup happens only after no live sessions remain.
- New owner-linked sensitive content uses application-encrypted AES-256-GCM
  envelopes. Database triggers reject plaintext writes and malformed envelopes.
- Feedback ratings and flags may persist without sensitive-content opt-in;
  comments require opt-in and an encrypted envelope.
- Safety, model, and audit storage is structured and raw-free.
- Rate-limit buckets store only short-lived HMAC identifiers. The schema stores
  no raw IP address and makes no forwarded-header trust assumption.
- Curated runtime resources continue to come from the tested TypeScript
  catalog. `seed/resources_seed.sql` is historical starter data, not the live
  catalog.

## Verification

No remote Supabase project exists yet. Before any production project exists,
apply `0001` and `0002` to a disposable Supabase project and verify:

1. table, column, index, trigger, RLS, policy, grant, and RPC shape
2. session-relative expiry and orphan-owner cleanup
3. rejection of plaintext owner-linked sensitive writes
4. acceptance of valid encrypted opt-in writes and raw-free feedback ratings
5. owner hard-delete cascades
6. fixed-window rate-limit increments, expiry, and input validation

The runtime server client, encryption implementation, repositories, purge
scheduler, and trusted deployment-header policy belong to later Sprint 1
blocks.

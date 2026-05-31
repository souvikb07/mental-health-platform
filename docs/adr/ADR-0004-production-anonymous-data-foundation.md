# ADR-0004: Production Anonymous Data Foundation

## Status

Accepted as the Sprint 1 implementation contract. Blocks 1B through 1J now
implement the additive SQL foundation, server-only client/encryption helpers,
anonymous session creation, downstream route ownership guards, encrypted
context-intake/chat retention, encrypted Clarity Map replay, and consent-aware
feedback persistence, atomic raw-free safety, policy, model, and audit
metadata, distributed rate limiting, server-owned JSON export, hard delete, and
the scheduler-ready purge foundation, single-journey server hydration, and
minimal anonymous export/delete controls.

## Context

MindBridge currently keeps the active anonymous journey in browser
`sessionStorage`. Sprint 1 will add a server-owned production data foundation
without adding accounts or changing Safety Core authority.

A full implementation spike exists on
`spike/sprint1-production-data-foundation-full-codex` at commit `9e196a1`.
That spike is reference-only: it is not merge-ready, must not be copied
wholesale, and does not establish implemented behavior.

## Decision

- Keep the product anonymous in Sprint 1. Issue a 256-bit opaque
  `mindbridge_anon_owner` cookie with `HttpOnly`, `SameSite=Lax`, `Path=/`, a
  30-day maximum age, and `Secure` in production. Store only its SHA-256 hash.
- Treat `sessionId` as a locator only. The server must resolve the anonymous
  owner cookie and scope every sensitive operation by that owner.
- Keep required product-boundary consent separate from optional sensitive
  content storage consent. The storage consent policy version is
  `sensitive_storage.v1`.
- Without storage opt-in, retain only minimal raw-free owner, session, consent,
  safety, policy, model, and audit metadata. Do not persist arbitrary plaintext
  free text.
- With storage opt-in, encrypt retained onboarding notes, chat messages,
  Clarity Maps, and feedback comments server-side using AES-256-GCM versioned
  envelopes before writing them to Postgres.
- Allow submitted feedback ratings and flags to persist without storage opt-in.
  Persist free-text feedback comments only as encrypted content after opt-in.
- Expire each anonymous session 30 days after that session's creation. Owner
  lifecycle must not shorten the retention window of a later session.
- Provide JSON export and hard delete for every retained journey owned by the
  current anonymous cookie.
- Keep resources on the tested static TypeScript runtime during Sprint 1.
- Allow transient local development when Supabase is absent. Production must
  fail closed when Supabase persistence configuration is missing or invalid.
- Use atomic Postgres RPC fixed-window rate-limit buckets. Store only
  short-lived HMAC identifiers. For pre-cookie IP subjects, trust Vercel's
  overwritten `x-forwarded-for` only when direct Vercel ingress is explicitly
  configured. Never store or log raw IPs.
- Add only minimal frontend hydration, export, and delete controls. Browser
  `sessionStorage` becomes a UX cache, not authorization or the source of truth.

## Spike Review Guardrails

Future implementation must correct these P1 issues found in the reference
spike:

1. Storage opt-out must not persist arbitrary plaintext free text.
2. Retention must be session-relative, not owner-relative.
3. IP rate limiting must not trust spoofable forwarding headers without a
   trusted deployment policy.

## Scope Exclusions

Sprint 1 does not add RAG, agents, a vector database, payments, an admin
dashboard, OAuth-first login, profile/history UI, a major frontend redesign,
client-side safety classification, model-generated crisis resources, or
diagnosis, treatment, or medication behavior.

No remote Supabase project exists yet. Apply future migrations only to a
disposable project for verification before any production project exists.

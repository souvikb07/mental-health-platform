# Production Data Foundation

## Sprint 1 Goal

Move MindBridge from browser-only MVP state toward a server-owned anonymous
data foundation without adding accounts, changing public product boundaries, or
rewriting Safety Core.

This document describes planned work. Runtime persistence is not implemented
yet. The full spike on `spike/sprint1-production-data-foundation-full-codex` at
`9e196a1` is reference-only and is not merge-ready.

## Planned Ownership Flow

```txt
browser HttpOnly anonymous-owner cookie
  -> SHA-256 token hash
  -> anonymous owner row
  -> owner-scoped sessions
  -> opted-in encrypted content and raw-free metadata
```

The cookie is planned as `mindbridge_anon_owner`: opaque, 256-bit, `HttpOnly`,
`SameSite=Lax`, scoped to `Path=/`, secure in production, and capped at 30
days. Only its SHA-256 hash belongs in Postgres. A `sessionId` locates a
journey; it never authorizes access.

## Planned Consent And Persistence

The existing required consent covers the product boundary. A separate optional
`storageConsentAccepted` choice under policy version `sensitive_storage.v1`
covers retention of sensitive journey content.

Without storage opt-in, retain only minimal raw-free metadata needed for
ownership, consent, safety continuity, policy review, model operations, audit,
and abuse protection. Free-form onboarding text, messages, Clarity Maps, and
feedback comments remain transient.

With storage opt-in, encrypt retained sensitive JSON server-side using
AES-256-GCM versioned envelopes with a key id, IV, auth tag, and ciphertext.
Decrypt only for server-owned reads scoped to the current anonymous owner.

Feedback ratings and flags may persist without opt-in. Free-text feedback
comments follow the encrypted opt-in path.

## Planned Retention And Data Controls

- Each session expires 30 days after its own creation.
- Owner cleanup must not shorten a newer session's retention window.
- JSON export covers every retained journey owned by the current cookie and
  uses no-store response behavior.
- Hard delete removes every cookie-owned anonymous journey and clears the
  cookie.
- A purge foundation will be scheduler-ready, but deployment-specific
  scheduling is outside Block 1A.

## Planned Runtime And Protection

- `transient` mode keeps local development usable when Supabase is absent.
- Production requires valid Supabase persistence configuration and fails
  closed instead of silently falling back.
- OpenAI and Supabase service-role usage remain server-only.
- Resources continue to use the current tested static TypeScript catalog.
- Postgres RPC fixed-window buckets provide planned distributed rate limits.
- Pre-cookie session-creation protection uses short-lived HMAC identifiers
  derived from an IP subject. Raw IP addresses are never stored or logged.
- Forwarded IP headers may be used only after a trusted deployment policy
  defines which edge-provided header is authoritative and prevents spoofing.

## Planned Frontend Compatibility

Frontend changes stay minimal: hydrate the active cookie-owned journey into the
existing UX, treat `sessionStorage` as a cache, stop sensitive `localStorage`
writes, and add small export/delete controls near feedback. Sprint 1 does not
add profile or history UI.

## Spike Review Guardrails

The reference spike identified three P1 blockers. Future implementation must:

1. Prevent storage opt-out from persisting arbitrary plaintext free text,
   including legacy or loosely validated session fields.
2. Make retention session-relative rather than copying an owner-relative
   expiry onto later journeys.
3. Reject spoofable forwarded-IP assumptions until a trusted deployment policy
   is chosen and documented.

## Planned Implementation Blocks

```txt
1A decisions and documentation
1B additive database migrations
1C server Supabase client, env validation, and encryption helper
1D server-owned anonymous sessions
1E ownership guards
1F persisted messages and chat turns
1G persisted Clarity Maps and feedback
1H safety, policy, model, and audit metadata
1I rate limiting
1J export, delete, and purge foundation
1K frontend compatibility and hydration
1L tests and QA
```

No remote Supabase project exists yet. Block 1B must verify additive migrations
against a disposable project before any production application.

## Scope Exclusions

Do not add RAG, agents, a vector database, payments, an admin dashboard,
OAuth-first login, profile/history UI, a major frontend redesign, client-side
safety classification, model-generated crisis resources, or diagnosis,
treatment, or medication behavior.

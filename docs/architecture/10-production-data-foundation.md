# Production Data Foundation

## Sprint 1 Goal

Move MindBridge from browser-only MVP state toward a server-owned anonymous
data foundation without adding accounts, changing public product boundaries, or
rewriting Safety Core.

This document describes the Sprint 1 target and current incremental progress.
Blocks 1B through 1F now add the additive SQL foundation, server-only
client/encryption helpers, server-owned anonymous session creation, and
cookie-owner-scoped guards for session-bound routes. Consent-aware encrypted
context-intake and chat retention is wired. Other runtime persistence remains
pending. The full spike on
`spike/sprint1-production-data-foundation-full-codex` at `9e196a1` is
reference-only and is not merge-ready.

## Planned Ownership Flow

```txt
browser HttpOnly anonymous-owner cookie
  -> SHA-256 token hash
  -> anonymous owner row
  -> owner-scoped sessions
  -> opted-in encrypted content and raw-free metadata
```

The session-creation path now issues `mindbridge_anon_owner`: opaque, 256-bit,
`HttpOnly`, `SameSite=Lax`, scoped to `Path=/`, secure in production, and
capped at 30 days. Only its SHA-256 hash belongs in Postgres. A `sessionId`
locates a journey; it never authorizes access.

## Consent And Persistence

The existing required consent covers the product boundary under
`product_boundary.v1`. A separate optional
`storageConsentAccepted` choice under policy version `sensitive_storage.v1`
covers retention of sensitive journey content.

The Block 1D session-creation path retains only minimal raw-free session and
consent metadata without storage opt-in. Future blocks must preserve the same
rule for safety, policy, model, audit, and abuse-protection metadata.
Free-form onboarding text, messages, Clarity Maps, and feedback comments remain
transient without storage opt-in.

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
- In Supabase mode, context intake, chat, Clarity Map, and feedback routes
  require the valid owner cookie and an unexpired owner-scoped session lookup.
- Browser mutation routes reject cross-site requests and mismatched origins.
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

## Implementation Blocks

```txt
1A decisions and documentation [complete]
1B additive database migrations [complete]
1C server Supabase client, env validation, and encryption helper [complete]
1D server-owned anonymous sessions [complete]
1E ownership guards [complete]
1F persisted messages and chat turns [complete]
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

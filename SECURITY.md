# Security Policy

MindBridge handles sensitive mental-health-adjacent user input. This repository is a pre-production Phase 1 MVP and does not claim HIPAA compliance, clinical compliance, certification, or production-grade security.

## Reporting Security Issues

Report security issues privately to the repository owner or project maintainer. Do not include raw user mental-health messages, real credentials, access tokens, or private data in reports unless a maintainer explicitly requests a protected reproduction path.

## Secret Handling

- Never commit `.env`, `.env.local`, real API keys, tokens, credentials, database URLs, webhook secrets, private keys, or service-role keys.
- Only `.env.example` with placeholder values may be committed.
- `NEXT_PUBLIC_` variables are exposed to the browser and must never contain secrets.
- OpenAI keys, Supabase service-role keys, payment secret keys, webhook secrets, and OAuth client secrets are server-only.

## Trust Boundaries

- The browser is untrusted.
- Frontend checks are UX only, not authorization.
- Protected operations require backend/server-side authorization.
- User-owned objects require server-side ownership checks.

## Data Handling

- Do not log raw mental-health messages in logs, analytics, traces, external monitoring, or error reports.
- Minimize retained personal data.
- Redact sensitive text in server errors and operational logs.

## AI Safety Boundary

- Model output is untrusted.
- Do not use `dangerouslySetInnerHTML` for AI or user content.
- Deterministic safety routing must run before model calls.
- Validate structured model output before storing or rendering it.

## Future Integrations

- Supabase public/anon keys require RLS and least privilege.
- Supabase service-role keys are server-only.
- SQL must be parameterized or use safe query builders/RPC parameters.
- Payment webhooks require server-side signature verification.
- Rate limits are required before public launch on AI, auth, write, and webhook endpoints.

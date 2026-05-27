# Security Baseline

This document defines the pre-production security baseline for MindBridge before adding real API keys, Supabase auth, persistence, payments, or production deployment.

MindBridge handles sensitive mental-health-adjacent data. The baseline is intentionally conservative and does not claim clinical compliance, HIPAA compliance, certification, or production-grade security.

## Trust Model

- The browser is untrusted.
- Frontend checks are UX only, not authorization.
- All protected operations require backend/server-side authorization.
- Hidden buttons, disabled UI, localStorage, and client route guards do not protect data.
- User-owned objects require server-side ownership checks before read, update, delete, export, or share operations.

## Secrets

- No secrets in frontend/client components.
- Never commit `.env`, `.env.local`, real API keys, tokens, credentials, database URLs, webhook secrets, private keys, or service-role keys.
- Only `.env.example` with placeholders may be committed.
- `NEXT_PUBLIC_` variables are browser-exposed and must never contain secrets.
- Supabase service-role keys are server-only.

## Supabase And SQL

- Supabase public/anon keys require RLS and least privilege.
- RLS must be enabled on public schema tables before production.
- Server-side ownership checks are required for user-owned records.
- SQL must be parameterized or use safe query builders/RPC parameters.
- Service-role access must be isolated to backend-only admin paths and must not bypass normal user authorization.

## Mental-Health Data

- No raw mental-health messages in logs, analytics, traces, external monitoring, or error reports.
- Do not send raw mental-health content to analytics providers.
- Store the minimum data needed for the current product scope.
- Add deletion/export paths before production persistence.

## AI And Model Output

- Model output is untrusted.
- Deterministic safety routing happens before model calls.
- Validate structured model output before storage or rendering.
- Do not use `dangerouslySetInnerHTML` for AI or user content.
- Future tool/function calls must be allowlisted and validated server-side.

## Payments And Webhooks

- Payment secret keys are server-only.
- Payment webhooks require server-side signature verification.
- Never trust payment status supplied by the frontend.

## Rate Limits

Rate limits are required before public launch on:

- AI endpoints
- auth endpoints
- write endpoints
- webhook endpoints

Rate limits must be enforced server-side.

## Pre-Integration Checklist

Before adding a new integration, verify:

- No secret can reach client components or `NEXT_PUBLIC_` variables.
- Request bodies are validated server-side.
- Protected operations enforce backend authorization.
- User-owned objects have ownership checks.
- Logs do not include raw mental-health text.
- Model output is validated and rendered as text, not HTML.
- Tests or manual review notes cover security-sensitive paths.

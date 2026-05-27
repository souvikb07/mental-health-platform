# Security Baseline

## Security principle
The browser is untrusted. All sensitive actions are enforced server-side.

## Sensitive data
- User messages
- Clarity maps
- Safety events
- Feedback
- Account identifiers
- Resource-routing data
- Any crisis/safety signals

## Current phase
Blocks 1–3 use local/mock behavior and deterministic safety routing.
No real OpenAI, Supabase, auth, payment, or persistence is assumed unless documented in CODEX_BUILD_LOG.md.

## Server-only rules
- API keys stay server-side.
- User authorization is checked in route handlers/server services.
- Service-role credentials never reach the browser.

## Frontend rules
- No secrets in client code.
- No trusted authorization logic in client code.
- No `dangerouslySetInnerHTML` for AI/user content.
- Client validation is for UX only; backend validation is required.

## Database rules
- RLS enabled before production.
- Parameterized queries only.
- User-owned objects require ownership checks.
- No raw user input in SQL strings.

## AI rules
- Deterministic safety classification runs before model calls.
- High/imminent-risk flows return local safety responses.
- Model output is post-validated.
- Model output never controls authorization or secrets.

## Logging rules
- Do not log raw mental-health messages.
- Redact sensitive input in errors.
- Use request IDs instead of raw text for debugging.

## Production release gate
Before public launch:
- env files are not committed
- GitHub secret scanning/push protection enabled
- Vercel env vars configured
- RLS policies reviewed
- auth callbacks configured
- rate limiting enabled on AI routes
- tests pass
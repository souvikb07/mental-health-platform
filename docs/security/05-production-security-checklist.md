# Production Security Checklist

## Secrets
- [ ] No `.env*` file committed
- [ ] `.env.example` contains placeholders only
- [ ] OpenAI key is server-only
- [ ] Supabase service-role key is server-only
- [ ] Payment secret keys are server-only
- [ ] Webhook secrets are server-only
- [ ] Vercel variables configured by environment
- [ ] Direct Vercel ingress confirmed before trusting `x-forwarded-for`
- [ ] `MIND_BRIDGE_TRUSTED_IP_SOURCE=vercel` configured for production
- [ ] Vercel system environment variables exposed so `VERCEL=1` is available
- [ ] GitHub secret scanning/push protection enabled

## Backend
- [ ] All API routes validate input
- [ ] All protected routes verify session server-side
- [ ] Authorization checks are server-side
- [ ] RPC-backed rate limits verified on AI, write, and resources endpoints
- [ ] Export verified owner-scoped with no-store attachment headers
- [ ] Hard-delete cascade verified through the narrow owner-delete RPC
- [ ] Expired-session purge scheduler configured and verified
- [ ] No raw sensitive logs
- [ ] Error responses do not leak stack traces/secrets

## Database
- [ ] RLS enabled on public tables
- [ ] Policies tested for each CRUD operation
- [ ] No raw string SQL with user input
- [ ] Service-role key not used in client code

## Frontend
- [ ] No secrets in client bundle
- [ ] No `dangerouslySetInnerHTML`
- [ ] No auth decisions trusted from localStorage
- [ ] Sensitive UI states backed by server checks

## AI
- [ ] Safety classifier before model call
- [ ] High/imminent risk never calls normal conversation model
- [ ] Post-response validator enabled
- [ ] Rate limits and cost guardrails enabled

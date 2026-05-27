# Production Security Checklist

## Secrets
- [ ] No `.env*` file committed
- [ ] `.env.example` contains placeholders only
- [ ] OpenAI key is server-only
- [ ] Supabase service-role key is server-only
- [ ] Payment secret keys are server-only
- [ ] Webhook secrets are server-only
- [ ] Vercel variables configured by environment
- [ ] GitHub secret scanning/push protection enabled

## Backend
- [ ] All API routes validate input
- [ ] All protected routes verify session server-side
- [ ] Authorization checks are server-side
- [ ] Rate limits on AI and auth endpoints
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
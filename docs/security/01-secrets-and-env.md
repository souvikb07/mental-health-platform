# Secrets and Environment Variables

## Never commit
- `.env`
- `.env.local`
- `.env.development`
- `.env.production`
- API keys
- private tokens
- webhook secrets
- database passwords
- service-role keys

## Allowed to commit
- `.env.example` with blank values only

## Server-only variables
- `OPENAI_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `VERCEL_TOKEN`
- OAuth client secrets

## Browser-exposed variables
Only use `NEXT_PUBLIC_` for values that are safe to expose publicly.

Allowed examples:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` only if RLS is enabled and policies are correct

Not allowed:
- `NEXT_PUBLIC_OPENAI_API_KEY`
- `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_STRIPE_SECRET_KEY`
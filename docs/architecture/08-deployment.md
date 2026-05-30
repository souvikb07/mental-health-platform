# Deployment

## Environments

```txt
local -> preview -> production
```

## Hosting

- Vercel hosts the Next.js application.
- Supabase provides server-owned Postgres persistence.
- OpenAI calls remain server-side only.
- Runtime resources remain in the tested TypeScript catalog.

## Server-Only Configuration

Production requires valid Supabase persistence configuration:

```txt
MIND_BRIDGE_DATA_MODE=supabase
SUPABASE_URL
SUPABASE_SECRET_KEY
MIND_BRIDGE_DATA_ENCRYPTION_KEY_V1
MIND_BRIDGE_RATE_LIMIT_HMAC_KEY
```

`SUPABASE_SERVICE_ROLE_KEY` remains a temporary server-only legacy fallback for
`SUPABASE_SECRET_KEY`. Do not create a browser Supabase client or add
`NEXT_PUBLIC_SUPABASE_*` credentials.

## Trusted IP Policy

Production pre-cookie abuse protection assumes direct Vercel ingress:

```txt
MIND_BRIDGE_TRUSTED_IP_SOURCE=vercel
VERCEL=1
```

`VERCEL=1` is a Vercel-owned system environment variable and must not be added
manually to `.env.example`. Behind this explicit gate, the server may derive an
ephemeral rate-limit subject from Vercel-overwritten `x-forwarded-for`. Raw IP
addresses are never stored or logged. Adding a proxy in front of Vercel
requires a separate reviewed policy before deployment.

Vercel references:

- https://vercel.com/docs/headers/request-headers
- https://vercel.com/docs/environment-variables/system-environment-variables

## Pre-Deploy Checklist

```txt
npm test
npm run lint
npm run build
git diff --check
```

Manual checks:

- apply migrations through `0007` to a disposable Supabase project first
- verify direct Vercel ingress and exposed Vercel system variables
- verify no secrets enter the browser bundle
- verify normal, safety, boundary, Clarity Map, resources, and feedback flows
- verify rate-limited routes return safe `429` responses with `Retry-After`

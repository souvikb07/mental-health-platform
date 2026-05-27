# Deployment

## Environments

```txt
local -> preview -> production
```

## Hosting

- Vercel for Next.js
- Supabase for Postgres
- OpenAI API for AI calls

## Environment variables

Required:

```txt
OPENAI_API_KEY
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_URL
```

## Pre-deploy checklist

```txt
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Manual checks:

- landing page loads
- onboarding creates session
- normal chat works
- high-risk prompt routes safely
- clarity map generates
- resources render
- feedback submits
- no secrets in browser

## Production safety switch

Consider adding:

```txt
ENABLE_CHAT_STORAGE=false
```

for public demos if you want to avoid storing raw chats.

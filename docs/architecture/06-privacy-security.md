# Privacy and Security

## Sensitivity assumption

Treat all user messages as sensitive mental health data.

## Phase 1 privacy choices

- Anonymous sessions first.
- No required account creation.
- No raw chat sent to analytics.
- API keys server-side only.
- Minimal database fields.
- Plain-language consent and safety notice.
- Feedback can be anonymous.

## Logging rules

Do not log raw user messages in production logs unless explicitly protected.

Allowed logs:

```txt
session_id
route
status_code
risk_level
error_code
created_at
```

Avoid logs:

```txt
raw message content
full clarity map content
personal identifiers
highly sensitive excerpts
```

## Environment variables

Store secrets in Vercel/Supabase environment managers.

Never expose:

```txt
OPENAI_API_KEY
SUPABASE_SERVICE_ROLE_KEY
```

## Frontend safety

- Show non-diagnosis notice.
- Show crisis disclaimer on onboarding.
- Keep a help/resources link available during chat.

## Phase 2 security improvements

- delete session endpoint
- encrypted sensitive fields
- rate limiting
- abuse monitoring
- privacy policy page
- data retention setting
- formal threat model

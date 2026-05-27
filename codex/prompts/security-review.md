# Security Review Prompt

Use this prompt when reviewing security-sensitive changes in MindBridge.

## Review scope

Review changed files for:

- secret exposure
- client/server boundary violations
- missing backend authorization
- missing user-owned object ownership checks
- Supabase RLS or least-privilege assumptions
- unsafe SQL or unparameterized queries
- raw mental-health content in logs, analytics, traces, monitoring, or errors
- unsafe rendering of AI/user content, especially `dangerouslySetInnerHTML`
- unvalidated model output
- deterministic safety routing happening after, rather than before, model calls
- payment webhook signature verification
- missing rate limits on AI, auth, write, or webhook endpoints

## Required posture

- The browser is untrusted.
- Frontend checks are UX only, not authorization.
- `NEXT_PUBLIC_` variables are browser-exposed and must never contain secrets.
- Supabase service-role keys are server-only.
- Supabase public/anon keys require RLS and least privilege.
- SQL must be parameterized or use safe query builders/RPC parameters.
- Model output is untrusted.

## Output format

Lead with findings ordered by severity. Include file and line references where possible.

If there are no findings, say so clearly and mention any residual risk or missing test coverage.

Do not make unrelated refactors during a security review.

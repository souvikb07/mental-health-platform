# Database and RLS Rules

## Supabase rules
- RLS must be enabled on all public schema tables before production.
- Policies must be written for SELECT, INSERT, UPDATE, DELETE as needed.
- The service-role key is server-only.
- Prefer user-scoped queries using the authenticated session.
- Admin operations must live in backend-only paths.

## SQL rules
- No string interpolation in SQL.
- No dynamic SQL with user input.
- Use parameterized queries or typed RPC parameters.

## Required table policy checks
For each table:
- Can user read only their rows?
- Can user create rows only for themselves?
- Can user update only their rows?
- Can user delete only their rows?
- Can anonymous users access anything?
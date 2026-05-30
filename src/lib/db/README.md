# db

Supabase clients and database query helpers.

`supabase-server.ts` is server-only. It creates an elevated Supabase client
only when `MIND_BRIDGE_DATA_MODE=supabase` resolves successfully. Do not import
it into browser modules or use the elevated key without server-side ownership
checks.

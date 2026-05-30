-- MindBridge Sprint 1 rate-limit hardening
-- Runtime rate-limit access belongs behind the narrow SECURITY DEFINER RPCs
-- introduced in 0002. Direct bucket-table access is not needed by the app.

revoke select, insert, update, delete
on table public.rate_limit_buckets
from service_role;

grant execute on function public.consume_rate_limit(text, text, text, integer, integer)
to service_role;

grant execute on function public.purge_expired_anonymous_data()
to service_role;

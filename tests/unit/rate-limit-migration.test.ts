import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("0007 rate-limit hardening migration", () => {
  const migration = readFileSync(
    "supabase/migrations/0007_sprint1_rate_limit_hardening.sql",
    "utf8",
  );
  const foundation = readFileSync(
    "supabase/migrations/0002_sprint1_production_data_foundation.sql",
    "utf8",
  );

  it("removes direct service-role bucket access and preserves narrow RPC execution", () => {
    expect(migration).toContain("revoke select, insert, update, delete");
    expect(migration).toContain("on table public.rate_limit_buckets");
    expect(migration).toContain("from service_role");
    expect(migration).toContain(
      "grant execute on function public.consume_rate_limit(text, text, text, integer, integer)",
    );
    expect(migration).toContain(
      "grant execute on function public.purge_expired_anonymous_data()",
    );
  });

  it("keeps the existing atomic digest-only fixed-window RPC", () => {
    expect(foundation).toContain("create table public.rate_limit_buckets");
    expect(foundation).toContain("bucket_key ~ '^[0-9a-f]{64}$'");
    expect(foundation).toContain("on conflict (route_key, bucket_key, window_started_at) do update");
    expect(foundation).toContain("request_count = public.rate_limit_buckets.request_count + 1");
    expect(foundation).toContain("window_expiry - current_time");
    expect(foundation).not.toMatch(/rate_limit_buckets[\s\S]{0,500}(raw_ip|user_agent|cookie|request_body)/);
  });
});

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("0008 data-controls hardening migration", () => {
  const migration = readFileSync(
    "supabase/migrations/0008_sprint1_data_controls_hardening.sql",
    "utf8",
  );
  const foundation = readFileSync(
    "supabase/migrations/0002_sprint1_production_data_foundation.sql",
    "utf8",
  );

  it("keeps hard deletion behind one service-role-only fixed-search-path RPC", () => {
    expect(migration).toContain(
      "create or replace function public.delete_anonymous_owner_data(p_owner_id uuid)",
    );
    expect(migration).toContain("security definer");
    expect(migration).toContain("set search_path = public");
    expect(migration).toContain("where id = p_owner_id");
    expect(migration).toContain("revoke delete on table public.anonymous_owners");
    expect(migration).toContain("from service_role");
    expect(migration).toContain("from public, anon, authenticated");
    expect(migration).toContain("to service_role");
  });

  it("reuses the session-relative purge RPC without rewriting it", () => {
    expect(foundation).toContain(
      "create or replace function public.purge_expired_anonymous_data()",
    );
    expect(foundation).toContain("where owner_id is not null");
    expect(foundation).toContain("and expires_at <= now()");
    expect(foundation).toContain("where not exists");
    expect(foundation).toContain("delete from public.rate_limit_buckets");
    expect(migration).not.toContain("purge_expired_anonymous_data");
  });
});

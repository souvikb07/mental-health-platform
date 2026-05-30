import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("anonymous-data purge runner", () => {
  const script = readFileSync(
    "scripts/purge-expired-anonymous-data.mjs",
    "utf8",
  );

  it("calls only the existing purge RPC and prints normalized counts", () => {
    expect(script).toContain('.rpc("purge_expired_anonymous_data")');
    expect(script).toContain("deletedSessions");
    expect(script).toContain("deletedOwners");
    expect(script).toContain("deletedRateLimitBuckets");
    expect(script).not.toContain(".env.local");
  });

  it("uses server-only keys and emits a generic failure message", () => {
    expect(script).toContain("SUPABASE_SECRET_KEY");
    expect(script).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(script).toContain('console.error("Anonymous data purge failed.")');
    expect(script).not.toContain("MIND_BRIDGE_DATA_ENCRYPTION_KEY_V1");
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSupabaseServerClient } = vi.hoisted(() => ({
  getSupabaseServerClient: vi.fn(),
}));

vi.mock("@/lib/db/supabase-server", () => ({
  getSupabaseServerClient,
}));

import { findAnonymousOwnerByTokenHash } from "../../src/lib/db/repositories/anonymous-owners";

describe("anonymous owners repository", () => {
  beforeEach(() => {
    getSupabaseServerClient.mockReset();
  });

  it("queries only by the SHA-256 token hash and selects only the owner id", async () => {
    const query = createQuery({
      data: { id: "owner-id" },
      error: null,
    });
    const from = vi.fn(() => query);
    getSupabaseServerClient.mockReturnValue({ from });

    await expect(
      findAnonymousOwnerByTokenHash("a".repeat(64)),
    ).resolves.toEqual({ id: "owner-id" });

    expect(from).toHaveBeenCalledWith("anonymous_owners");
    expect(query.select).toHaveBeenCalledWith("id");
    expect(query.eq).toHaveBeenCalledWith("token_hash", "a".repeat(64));
  });

  it("returns null for an unknown hash", async () => {
    const query = createQuery({ data: null, error: null });
    getSupabaseServerClient.mockReturnValue({ from: () => query });

    await expect(
      findAnonymousOwnerByTokenHash("a".repeat(64)),
    ).resolves.toBeNull();
  });

  it("fails safely for malformed hashes and backend errors", async () => {
    await expect(findAnonymousOwnerByTokenHash("raw-token")).rejects.toThrow(
      "Please try again later.",
    );

    const query = createQuery({
      data: null,
      error: { message: "private database detail" },
    });
    getSupabaseServerClient.mockReturnValue({ from: () => query });

    await expect(
      findAnonymousOwnerByTokenHash("a".repeat(64)),
    ).rejects.toThrow("Please try again later.");
  });
});

function createQuery(result: unknown) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };

  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  return query;
}

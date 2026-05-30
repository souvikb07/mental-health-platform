import { randomBytes } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createClient } = vi.hoisted(() => ({
  createClient: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient,
}));

import {
  getSupabaseServerClient,
  resetSupabaseServerClientForTests,
} from "../../src/lib/db/supabase-server";

const encryptionKey = randomBytes(32).toString("base64");
const rateLimitHmacKey = randomBytes(32).toString("base64");

describe("Supabase server client", () => {
  beforeEach(() => {
    createClient.mockReset();
    createClient.mockReturnValue({ kind: "server-client" });
    resetSupabaseServerClientForTests();
    stubEnvironment({ MIND_BRIDGE_DATA_MODE: "transient" });
  });

  afterEach(() => {
    resetSupabaseServerClientForTests();
    vi.unstubAllEnvs();
  });

  it("returns null in transient mode", () => {
    expect(getSupabaseServerClient()).toBeNull();
    expect(createClient).not.toHaveBeenCalled();
  });

  it("creates and caches a server-only Supabase client", () => {
    stubEnvironment();

    const first = getSupabaseServerClient();
    const second = getSupabaseServerClient();

    expect(first).toBe(second);
    expect(createClient).toHaveBeenCalledTimes(1);
    expect(createClient).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "modern-secret",
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      },
    );
  });

  it("creates a new client after resetting the cache", () => {
    stubEnvironment();

    getSupabaseServerClient();
    resetSupabaseServerClientForTests();
    getSupabaseServerClient();

    expect(createClient).toHaveBeenCalledTimes(2);
  });

  it("prefers the modern key when the legacy fallback also exists", () => {
    stubEnvironment({ SUPABASE_SERVICE_ROLE_KEY: "legacy-secret" });

    getSupabaseServerClient();

    expect(createClient).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "modern-secret",
      expect.any(Object),
    );
  });
});

function stubEnvironment(overrides: Record<string, string> = {}) {
  const values = {
    NODE_ENV: "test",
    MIND_BRIDGE_DATA_MODE: "supabase",
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SECRET_KEY: "modern-secret",
    SUPABASE_SERVICE_ROLE_KEY: "",
    MIND_BRIDGE_DATA_ENCRYPTION_KEY_V1: encryptionKey,
    MIND_BRIDGE_RATE_LIMIT_HMAC_KEY: rateLimitHmacKey,
    ...overrides,
  };

  Object.entries(values).forEach(([key, value]) => {
    vi.stubEnv(key, value);
  });
}

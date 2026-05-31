import { randomBytes } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import {
  buildRateLimitBucketKey,
  enforceChatRateLimit,
  enforceResourcesRateLimit,
  enforceSessionsDeleteRateLimit,
  enforceSessionsExportRateLimit,
  enforceSessionsHydrateRateLimit,
  enforceSessionCreationRateLimit,
} from "../../src/lib/server/rate-limit/enforce";
import {
  CHAT_RATE_LIMIT,
  RESOURCES_RATE_LIMIT,
} from "../../src/lib/server/rate-limit/config";

const hmacKey = randomBytes(32).toString("base64");
const supabaseEnvironment = {
  mode: "supabase" as const,
  supabaseUrl: "https://example.supabase.co",
  supabaseServerKey: "secret",
  encryptionKeyV1: randomBytes(32).toString("base64"),
  rateLimitHmacKey: hmacKey,
};

describe("rate-limit enforcement", () => {
  it("creates stable window-scoped digests that rotate across windows", () => {
    const input = {
      policy: CHAT_RATE_LIMIT,
      subjectScope: "owner_session",
      subject: "owner-id:session-id",
      encodedKey: hmacKey,
    };
    const first = buildRateLimitBucketKey({ ...input, nowMs: 1_000 });
    const sameWindow = buildRateLimitBucketKey({ ...input, nowMs: 599_999 });
    const nextWindow = buildRateLimitBucketKey({ ...input, nowMs: 600_000 });

    expect(first).toMatch(/^[0-9a-f]{64}$/);
    expect(sameWindow).toBe(first);
    expect(nextWindow).not.toBe(first);
    expect(first).not.toContain("owner-id");
    expect(first).not.toContain("session-id");
  });

  it("separates route, scope, and subject values without exposing them", () => {
    const base = {
      policy: CHAT_RATE_LIMIT,
      subjectScope: "owner_session",
      subject: "owner-id:session-id",
      nowMs: 1_000,
      encodedKey: hmacKey,
    };
    const values = [
      buildRateLimitBucketKey(base),
      buildRateLimitBucketKey({ ...base, policy: RESOURCES_RATE_LIMIT }),
      buildRateLimitBucketKey({ ...base, subjectScope: "trusted_ip" }),
      buildRateLimitBucketKey({ ...base, subject: "other-owner:session-id" }),
      buildRateLimitBucketKey({ ...base, subject: "owner-id:other-session" }),
      buildRateLimitBucketKey({ ...base, subject: "203.0.113.5" }),
      buildRateLimitBucketKey({ ...base, subject: "203.0.113.6" }),
    ];

    expect(new Set(values).size).toBe(values.length);
    expect(JSON.stringify(values)).not.toContain("owner-id");
    expect(JSON.stringify(values)).not.toContain("203.0.113");
  });

  it("sends only an owner-session HMAC digest to the RPC", async () => {
    const consume = vi.fn().mockResolvedValue({ allowed: true, retryAfterSeconds: 30 });

    await enforceChatRateLimit(owned(), {
      consume,
      getEnvironment: () => supabaseEnvironment,
      now: () => 1_000,
    });

    expect(consume).toHaveBeenCalledWith({
      routeKey: "api.chat",
      subjectKind: "owner_hmac",
      bucketKey: expect.stringMatching(/^[0-9a-f]{64}$/),
      windowSeconds: 600,
      limit: 30,
    });
    expect(JSON.stringify(consume.mock.calls)).not.toContain("owner-id");
    expect(JSON.stringify(consume.mock.calls)).not.toContain("session-id");
  });

  it.each([
    [enforceSessionsExportRateLimit, "api.sessions.export"],
    [enforceSessionsDeleteRateLimit, "api.sessions.delete"],
    [enforceSessionsHydrateRateLimit, "api.sessions.hydrate"],
  ])("sends only an owner HMAC digest for %s", async (enforce, routeKey) => {
    const consume = vi.fn().mockResolvedValue({ allowed: true, retryAfterSeconds: 30 });

    await enforce({ id: "owner-id" }, {
      consume,
      getEnvironment: () => supabaseEnvironment,
      now: () => 1_000,
    });

    expect(consume).toHaveBeenCalledWith({
      routeKey,
      subjectKind: "owner_hmac",
      bucketKey: expect.stringMatching(/^[0-9a-f]{64}$/),
      windowSeconds: 3600,
      limit: routeKey === "api.sessions.hydrate" ? 30 : 5,
    });
    expect(JSON.stringify(consume.mock.calls)).not.toContain("owner-id");
  });

  it("throws a safe 429 before callers continue when the bucket is denied", async () => {
    await expect(
      enforceChatRateLimit(owned(), {
        consume: vi.fn().mockResolvedValue({ allowed: false, retryAfterSeconds: 17 }),
        getEnvironment: () => supabaseEnvironment,
      }),
    ).rejects.toMatchObject({
      code: "RATE_LIMITED",
      status: 429,
      headers: { "Retry-After": "17" },
    });
  });

  it("skips all database limiting in transient mode", async () => {
    const consume = vi.fn();

    await enforceChatRateLimit(null, {
      consume,
      getEnvironment: () => ({ mode: "transient" }),
    });

    expect(consume).not.toHaveBeenCalled();
  });

  it("fails production session creation closed without a trusted IP", async () => {
    await expect(
      enforceSessionCreationRateLimit(request(), {
        getEnvironment: () => supabaseEnvironment,
        getTrustedIpSubject: () => null,
        nodeEnv: "production",
      }),
    ).rejects.toMatchObject({
      code: "DATA_BACKEND_UNAVAILABLE",
      status: 503,
    });
  });

  it("sends only a trusted-IP HMAC digest to the session-creation RPC", async () => {
    const consume = vi.fn().mockResolvedValue({ allowed: true, retryAfterSeconds: 30 });

    await enforceSessionCreationRateLimit(request(), {
      consume,
      getEnvironment: () => supabaseEnvironment,
      getTrustedIpSubject: () => "203.0.113.5",
      nodeEnv: "production",
      now: () => 1_000,
    });

    expect(consume).toHaveBeenCalledWith({
      routeKey: "api.sessions.create",
      subjectKind: "ip_hmac",
      bucketKey: expect.stringMatching(/^[0-9a-f]{64}$/),
      windowSeconds: 3600,
      limit: 10,
    });
    expect(JSON.stringify(consume.mock.calls)).not.toContain("203.0.113.5");
  });

  it("skips missing pre-cookie IP subjects outside production", async () => {
    const consume = vi.fn();

    await enforceSessionCreationRateLimit(request(), {
      consume,
      getEnvironment: () => supabaseEnvironment,
      getTrustedIpSubject: () => null,
      nodeEnv: "test",
    });

    expect(consume).not.toHaveBeenCalled();
  });

  it("uses a shared digest-only resources fallback bucket in production", async () => {
    const consume = vi.fn().mockResolvedValue({ allowed: true, retryAfterSeconds: 30 });

    await enforceResourcesRateLimit(request(), {
      consume,
      getEnvironment: () => supabaseEnvironment,
      getTrustedIpSubject: () => null,
      nodeEnv: "production",
      now: () => 1_000,
    });

    expect(consume).toHaveBeenCalledWith({
      routeKey: "api.resources_fallback",
      subjectKind: "ip_hmac",
      bucketKey: expect.stringMatching(/^[0-9a-f]{64}$/),
      windowSeconds: 600,
      limit: 600,
    });
    expect(JSON.stringify(consume.mock.calls)).not.toContain("shared_resources_fallback");
  });
});

function owned() {
  return {
    owner: { id: "owner-id" },
    session: { id: "session-id" },
  } as Parameters<typeof enforceChatRateLimit>[0];
}

function request() {
  return new Request("https://mindbridge.example/api/resources");
}

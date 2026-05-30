import { describe, expect, it } from "vitest";

import { getTrustedVercelIpSubject } from "../../src/lib/server/rate-limit/trusted-subject";

describe("trusted Vercel rate-limit subject", () => {
  it("accepts one validated Vercel-overwritten IP behind the explicit gate", () => {
    expect(
      getTrustedVercelIpSubject(request({ "x-forwarded-for": "203.0.113.5" }), {
        ...testEnv(),
        MIND_BRIDGE_TRUSTED_IP_SOURCE: "vercel",
        VERCEL: "1",
      }),
    ).toBe("203.0.113.5");
  });

  it.each([
    [{}, testEnv({ MIND_BRIDGE_TRUSTED_IP_SOURCE: "vercel", VERCEL: "1" })],
    [{ "x-forwarded-for": "203.0.113.5" }, testEnv({ VERCEL: "1" })],
    [{ "x-forwarded-for": "203.0.113.5" }, testEnv({ MIND_BRIDGE_TRUSTED_IP_SOURCE: "vercel" })],
    [{ "x-forwarded-for": "203.0.113.5, 198.51.100.7" }, testEnv({ MIND_BRIDGE_TRUSTED_IP_SOURCE: "vercel", VERCEL: "1" })],
    [{ "x-forwarded-for": "not-an-ip" }, testEnv({ MIND_BRIDGE_TRUSTED_IP_SOURCE: "vercel", VERCEL: "1" })],
    [{ "x-real-ip": "203.0.113.5" }, testEnv({ MIND_BRIDGE_TRUSTED_IP_SOURCE: "vercel", VERCEL: "1" })],
    [{ "x-vercel-forwarded-for": "203.0.113.5" }, testEnv({ MIND_BRIDGE_TRUSTED_IP_SOURCE: "vercel", VERCEL: "1" })],
  ])("rejects absent, untrusted, ambiguous, or malformed subjects", (headers, env) => {
    expect(getTrustedVercelIpSubject(request(headers), env)).toBeNull();
  });
});

function request(headers: HeadersInit) {
  return new Request("https://mindbridge.example/api/sessions", { headers });
}

function testEnv(overrides: Record<string, string> = {}): NodeJS.ProcessEnv {
  return { NODE_ENV: "test", ...overrides };
}

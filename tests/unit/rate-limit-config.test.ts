import { describe, expect, it } from "vitest";

import {
  CHAT_RATE_LIMIT,
  CLARITY_MAP_RATE_LIMIT,
  CONTEXT_INTAKE_RATE_LIMIT,
  FEEDBACK_RATE_LIMIT,
  RESOURCES_FALLBACK_RATE_LIMIT,
  RESOURCES_RATE_LIMIT,
  resolveTrustedIpSource,
  SESSION_CREATION_RATE_LIMIT,
} from "../../src/lib/server/rate-limit/config";

describe("rate-limit configuration", () => {
  it("defines the locked Sprint 1 limits", () => {
    expect(SESSION_CREATION_RATE_LIMIT).toMatchObject({ limit: 10, windowSeconds: 3600 });
    expect(CONTEXT_INTAKE_RATE_LIMIT).toMatchObject({ limit: 10, windowSeconds: 3600 });
    expect(CHAT_RATE_LIMIT).toMatchObject({ limit: 30, windowSeconds: 600 });
    expect(CLARITY_MAP_RATE_LIMIT).toMatchObject({ limit: 5, windowSeconds: 3600 });
    expect(FEEDBACK_RATE_LIMIT).toMatchObject({ limit: 10, windowSeconds: 3600 });
    expect(RESOURCES_RATE_LIMIT).toMatchObject({ limit: 120, windowSeconds: 600 });
    expect(RESOURCES_FALLBACK_RATE_LIMIT).toMatchObject({ limit: 600, windowSeconds: 600 });
  });

  it("accepts only the explicit Vercel trusted-IP policy", () => {
    expect(resolveTrustedIpSource({ NODE_ENV: "test" })).toBeNull();
    expect(resolveTrustedIpSource({
      NODE_ENV: "test",
      MIND_BRIDGE_TRUSTED_IP_SOURCE: "vercel",
    })).toBe("vercel");
    expect(() =>
      resolveTrustedIpSource({
        NODE_ENV: "test",
        MIND_BRIDGE_TRUSTED_IP_SOURCE: "proxy",
      }),
    ).toThrow("MIND_BRIDGE_TRUSTED_IP_SOURCE must be vercel");
  });
});

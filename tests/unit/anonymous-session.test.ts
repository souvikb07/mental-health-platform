import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ANONYMOUS_OWNER_COOKIE,
  ANONYMOUS_OWNER_COOKIE_MAX_AGE_SECONDS,
  createAnonymousOwnerToken,
  getValidAnonymousOwnerToken,
  resolveAnonymousOwnerToken,
  serializeAnonymousOwnerCookie,
  serializeClearAnonymousOwnerCookie,
} from "../../src/lib/server/session/anonymous-session";

describe("anonymous owner cookie", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses a canonical 256-bit opaque token", () => {
    const token = createAnonymousOwnerToken();

    expect(Buffer.from(token, "base64url")).toHaveLength(32);
    expect(Buffer.from(token, "base64url").toString("base64url")).toBe(token);
  });

  it("serializes an HttpOnly SameSite=Lax cookie without a domain", () => {
    const token = createAnonymousOwnerToken();
    const cookie = serializeAnonymousOwnerCookie(token);

    expect(cookie).toBe(
      `${ANONYMOUS_OWNER_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${ANONYMOUS_OWNER_COOKIE_MAX_AGE_SECONDS}`,
    );
    expect(cookie).not.toContain("Domain=");
    expect(cookie).not.toContain("Secure");
  });

  it("adds Secure to the production cookie", () => {
    vi.stubEnv("NODE_ENV", "production");

    expect(serializeAnonymousOwnerCookie(createAnonymousOwnerToken())).toContain(
      "; Secure",
    );
  });

  it("clears the cookie with matching security attributes", () => {
    expect(serializeClearAnonymousOwnerCookie()).toBe(
      `${ANONYMOUS_OWNER_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`,
    );
  });

  it("accepts one valid existing owner cookie", () => {
    const token = createAnonymousOwnerToken();
    const request = requestWithCookie(
      `another=value; ${ANONYMOUS_OWNER_COOKIE}=${token}`,
    );

    expect(getValidAnonymousOwnerToken(request)).toBe(token);
    expect(resolveAnonymousOwnerToken(request, () => "replacement")).toBe(token);
  });

  it.each([
    `${ANONYMOUS_OWNER_COOKIE}=malformed`,
    `${ANONYMOUS_OWNER_COOKIE}=%E0%A4%A`,
    `${ANONYMOUS_OWNER_COOKIE}=${createAnonymousOwnerToken()}; ${ANONYMOUS_OWNER_COOKIE}=${createAnonymousOwnerToken()}`,
  ])("rotates malformed or ambiguous owner cookies", (cookie) => {
    const request = requestWithCookie(cookie);

    expect(getValidAnonymousOwnerToken(request)).toBeUndefined();
    expect(resolveAnonymousOwnerToken(request, () => "replacement")).toBe(
      "replacement",
    );
  });
});

function requestWithCookie(cookie: string) {
  return new Request("http://localhost/api/sessions", {
    headers: { Cookie: cookie },
  });
}

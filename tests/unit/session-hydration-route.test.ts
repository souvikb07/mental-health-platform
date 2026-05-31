import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  hydrateAnonymousSession: vi.fn(),
}));

vi.mock("@/lib/server/session/hydration", () => ({
  hydrateAnonymousSession: mocks.hydrateAnonymousSession,
}));

import { GET } from "../../src/app/api/sessions/route";

describe("GET /api/sessions hydration", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.hydrateAnonymousSession.mockResolvedValue({ status: "empty" });
  });

  it("returns a no-store hydration response", async () => {
    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ status: "empty" });
  });

  it("passes one UUID locator and rejects malformed or duplicate locators", async () => {
    const sessionId = "11111111-1111-4111-8111-111111111111";

    expect((await GET(request(`?sessionId=${sessionId}`))).status).toBe(200);
    expect(mocks.hydrateAnonymousSession).toHaveBeenLastCalledWith(
      expect.any(Request),
      sessionId,
    );
    expect((await GET(request("?sessionId=bad"))).status).toBe(400);
    expect(
      (await GET(request(`?sessionId=${sessionId}&sessionId=${sessionId}`))).status,
    ).toBe(400);
  });

  it("rejects cross-site hydration before reading data", async () => {
    const response = await GET(
      request("", { "Sec-Fetch-Site": "cross-site" }),
    );

    expect(response.status).toBe(403);
    expect(mocks.hydrateAnonymousSession).not.toHaveBeenCalled();
  });
});

function request(query = "", headers?: HeadersInit) {
  return new Request(`https://mindbridge.example/api/sessions${query}`, {
    headers,
  });
}

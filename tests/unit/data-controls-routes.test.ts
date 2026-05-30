import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  deleteAnonymousOwnerJourneys: vi.fn(),
  exportAnonymousOwnerData: vi.fn(),
}));

vi.mock("@/lib/server/data-controls", () => ({
  deleteAnonymousOwnerJourneys: mocks.deleteAnonymousOwnerJourneys,
  exportAnonymousOwnerData: mocks.exportAnonymousOwnerData,
}));

import { DELETE } from "../../src/app/api/sessions/route";
import { GET } from "../../src/app/api/sessions/export/route";
import { rateLimited } from "../../src/lib/server/http/api-errors";

describe("anonymous data-control routes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.exportAnonymousOwnerData.mockResolvedValue({
      schemaVersion: "mindbridge.anonymous-data-export.v1",
      exportedAt: "2026-05-31T12:00:00.000Z",
      journeys: [],
      ownerEvents: { modelEvents: [], auditEvents: [] },
    });
    mocks.deleteAnonymousOwnerJourneys.mockResolvedValue({
      result: { status: "deleted" },
      setCookie:
        "mindbridge_anon_owner=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    });
  });

  it("returns a no-store JSON attachment for exports", async () => {
    const response = await GET(request("/api/sessions/export"));

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="mindbridge-anonymous-export.json"',
    );
    expect(response.headers.get("Content-Type")).toBe(
      "application/json; charset=utf-8",
    );
  });

  it("returns no-store deletion success and clears the cookie", async () => {
    const response = await DELETE(request("/api/sessions", "DELETE"));

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Set-Cookie")).toContain("Max-Age=0");
    await expect(response.json()).resolves.toEqual({ status: "deleted" });
  });

  it("rejects cross-site export and delete before invoking controls", async () => {
    const headers = { "Sec-Fetch-Site": "cross-site" };

    expect(
      (await GET(request("/api/sessions/export", "GET", headers))).status,
    ).toBe(403);
    expect(
      (await DELETE(request("/api/sessions", "DELETE", headers))).status,
    ).toBe(403);
    expect(mocks.exportAnonymousOwnerData).not.toHaveBeenCalled();
    expect(mocks.deleteAnonymousOwnerJourneys).not.toHaveBeenCalled();
  });

  it.each([
    [new Error("private backend detail"), 503],
    [rateLimited(17), 429],
  ])("does not clear the cookie after delete failure", async (error, status) => {
    mocks.deleteAnonymousOwnerJourneys.mockRejectedValue(error);

    const response = await DELETE(request("/api/sessions", "DELETE"));

    expect(response.status).toBe(status);
    expect(response.headers.get("Set-Cookie")).toBeNull();
  });
});

function request(path: string, method = "GET", headers?: HeadersInit) {
  return new Request(`https://mindbridge.example${path}`, { method, headers });
}

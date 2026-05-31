// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ApiRequestError,
  deleteAnonymousData,
  downloadAnonymousDataExport,
  fetchSessionHydration,
} from "../../src/lib/api/client";

describe("frontend API client data controls", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("requests exact hydration locators without caching", async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse({ status: "empty" }));
    vi.stubGlobal("fetch", fetch);

    await expect(
      fetchSessionHydration("11111111-1111-4111-8111-111111111111"),
    ).resolves.toEqual({ status: "empty" });
    expect(fetch).toHaveBeenCalledWith(
      "/api/sessions?sessionId=11111111-1111-4111-8111-111111111111",
      { cache: "no-store" },
    );
  });

  it("downloads retained export blobs and deletes through the sessions route", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response("{}", {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ status: "deleted" }));
    vi.stubGlobal("fetch", fetch);

    await expect(
      (await downloadAnonymousDataExport()).text(),
    ).resolves.toBe("{}");
    await expect(deleteAnonymousData()).resolves.toEqual({ status: "deleted" });
    expect(fetch).toHaveBeenNthCalledWith(1, "/api/sessions/export", {
      cache: "no-store",
    });
    expect(fetch).toHaveBeenNthCalledWith(2, "/api/sessions", {
      method: "DELETE",
    });
  });

  it("preserves safe response codes and retry seconds", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(
          { error: { code: "RATE_LIMITED", message: "Please wait." } },
          { status: 429, headers: { "Retry-After": "17" } },
        ),
      ),
    );

    await expect(downloadAnonymousDataExport()).rejects.toMatchObject({
      code: "RATE_LIMITED",
      status: 429,
      retryAfterSeconds: 17,
    } satisfies Partial<ApiRequestError>);
  });
});

function jsonResponse(payload: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(payload), {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
}

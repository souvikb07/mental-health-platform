import { describe, expect, it } from "vitest";

import {
  apiErrorResponse,
  chatTurnInProgress,
  chatTurnRetryUnavailable,
  clarityMapInProgress,
  rateLimited,
  sessionNotFound,
  unauthorizedSession,
} from "../../src/lib/server/http/api-errors";

describe("safe API errors", () => {
  it.each([
    [unauthorizedSession(), 401, "UNAUTHORIZED_SESSION"],
    [sessionNotFound(), 404, "SESSION_NOT_FOUND"],
    [chatTurnInProgress(), 409, "CHAT_TURN_IN_PROGRESS"],
    [chatTurnRetryUnavailable(), 409, "CHAT_TURN_RETRY_UNAVAILABLE"],
    [clarityMapInProgress(), 409, "CLARITY_MAP_IN_PROGRESS"],
    [rateLimited(17), 429, "RATE_LIMITED"],
  ])("returns safe structured errors", async (error, status, code) => {
    const response = apiErrorResponse(error);

    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toMatchObject({
      error: { code },
    });
  });

  it("includes retry guidance for active duplicate turns", () => {
    const response = apiErrorResponse(chatTurnInProgress());

    expect(response.headers.get("Retry-After")).toBe("5");
  });

  it("includes retry guidance for active duplicate Clarity Maps", () => {
    const response = apiErrorResponse(clarityMapInProgress());

    expect(response.headers.get("Retry-After")).toBe("5");
  });

  it("includes retry guidance for rate limits", () => {
    const response = apiErrorResponse(rateLimited(17));

    expect(response.headers.get("Retry-After")).toBe("17");
  });

  it("maps unknown failures to a generic backend-unavailable response", async () => {
    const response = apiErrorResponse(
      new Error("private database detail raw-token"),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "DATA_BACKEND_UNAVAILABLE",
        message: "Please try again later.",
      },
    });
  });
});

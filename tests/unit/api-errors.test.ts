import { describe, expect, it } from "vitest";

import {
  apiErrorResponse,
  chatTurnInProgress,
  chatTurnRetryUnavailable,
  sessionNotFound,
  unauthorizedSession,
} from "../../src/lib/server/http/api-errors";

describe("safe API errors", () => {
  it.each([
    [unauthorizedSession(), 401, "UNAUTHORIZED_SESSION"],
    [sessionNotFound(), 404, "SESSION_NOT_FOUND"],
    [chatTurnInProgress(), 409, "CHAT_TURN_IN_PROGRESS"],
    [chatTurnRetryUnavailable(), 409, "CHAT_TURN_RETRY_UNAVAILABLE"],
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

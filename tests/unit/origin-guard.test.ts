import { describe, expect, it } from "vitest";

import { ApiError } from "../../src/lib/server/http/api-errors";
import { assertSameOrigin } from "../../src/lib/server/http/origin-guard";

describe("same-origin mutation guard", () => {
  it("accepts matching browser origins", () => {
    expect(() =>
      assertSameOrigin(request({ Origin: "https://mindbridge.example" })),
    ).not.toThrow();
  });

  it("accepts non-browser callers without Origin", () => {
    expect(() => assertSameOrigin(request())).not.toThrow();
  });

  it.each([
    { Origin: "https://other.example" },
    { Origin: "not-an-origin" },
    { Origin: "https://mindbridge.example/path" },
    { "Sec-Fetch-Site": "cross-site" },
  ])("rejects cross-site or malformed browser metadata", (headers) => {
    expect(() => assertSameOrigin(request(headers))).toThrowError(
      expect.objectContaining({
        code: "SAME_ORIGIN_REQUIRED",
        status: 403,
      }) as ApiError,
    );
  });
});

function request(headers?: HeadersInit) {
  return new Request("https://mindbridge.example/api/chat", { headers });
}

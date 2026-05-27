import { describe, expect, it } from "vitest";

import {
  createSessionContext,
  normalizeCountryCode,
} from "../../src/lib/session/session-context";

describe("session context", () => {
  it.each([
    ["United States", "US"],
    ["USA", "US"],
    ["US", "US"],
    ["India", "IN"],
    ["IN", "IN"],
    [undefined, "GLOBAL"],
    ["France", "GLOBAL"],
  ] as const)("normalizes %s to %s", (country, expectedCountryCode) => {
    expect(normalizeCountryCode(country)).toBe(expectedCountryCode);
  });

  it("creates a typed session context from onboarding inputs", () => {
    expect(
      createSessionContext({
        sessionId: "mock_session_test",
        country: "United States",
        ageConfirmed: true,
        ageBand: "18-24",
        mainConcern: "overwhelmed",
      }),
    ).toEqual({
      sessionId: "mock_session_test",
      countryCode: "US",
      countryLabel: "United States",
      ageConfirmed: true,
      ageBand: "18-24",
      mainConcern: "overwhelmed",
    });
  });
});

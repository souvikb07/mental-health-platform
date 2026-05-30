import { describe, expect, it } from "vitest";

import {
  createSessionContext,
  normalizeCountryCode,
} from "../../src/lib/session/session-context";
import { createMockSession } from "../../src/lib/server/sessions";
import { createSessionRequestSchema } from "../../src/lib/validation/sessions";

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
        country: "USA",
      ageConfirmed: true,
      consentAccepted: true,
      storageConsentAccepted: false,
      mainConcernCategory: "overwhelmed",
        mainConcernText: "Extra context",
      }),
    ).toEqual({
      sessionId: "mock_session_test",
      countryCode: "US",
      countryLabel: "USA",
      ageConfirmed: true,
      consentAccepted: true,
      storageConsentAccepted: false,
      ageBand: undefined,
      mainConcern: undefined,
      mainConcernCategory: "overwhelmed",
      mainConcernLabel: "Overwhelmed",
      mainConcernText: "Extra context",
    });
  });

  it.each([
    ["missing country", { mainConcernCategory: "overwhelmed", ageConfirmed: true, consentAccepted: true }],
    ["missing main reason", { country: "USA", ageConfirmed: true, consentAccepted: true }],
    ["missing age confirmation", { country: "USA", mainConcernCategory: "overwhelmed", consentAccepted: true }],
    ["missing consent", { country: "USA", mainConcernCategory: "overwhelmed", ageConfirmed: true }],
    ["false age confirmation", { country: "USA", mainConcernCategory: "overwhelmed", ageConfirmed: false, consentAccepted: true }],
    ["false consent", { country: "USA", mainConcernCategory: "overwhelmed", ageConfirmed: true, consentAccepted: false }],
  ])("rejects onboarding session input with %s", (_label, input) => {
    expect(createSessionRequestSchema.safeParse(input).success).toBe(false);
  });

  it.each([
    ["USA", "US", "USA"],
    ["India", "IN", "India"],
    ["France", "GLOBAL", "France"],
    [undefined, "GLOBAL", undefined],
  ] as const)(
    "creates country context for %s as %s",
    (country, expectedCountryCode, expectedCountryLabel) => {
      const context = createSessionContext({
        sessionId: "mock_session_test",
        country,
        ageConfirmed: true,
        consentAccepted: true,
        mainConcernCategory: "overwhelmed",
      });

      expect(context.countryCode).toBe(expectedCountryCode);
      expect(context.countryLabel).toBe(expectedCountryLabel);
    },
  );

  it.each([
    ["overwhelmed", "Overwhelmed"],
    ["not_sure", "I’m not sure"],
  ] as const)("maps main reason %s to %s", (category, label) => {
    const session = createMockSession({
      country: "USA",
      ageConfirmed: true,
      consentAccepted: true,
      mainConcernCategory: category,
    });

    expect(session.sessionContext.mainConcernCategory).toBe(category);
    expect(session.sessionContext.mainConcernLabel).toBe(label);
  });
});

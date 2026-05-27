import type { CountryCode, SessionContext } from "@/types/session-context";

export function normalizeCountryCode(country?: string | null): CountryCode {
  if (!country) {
    return "GLOBAL";
  }

  const normalized = country.trim().toLowerCase();

  if (
    [
      "us",
      "usa",
      "u.s.",
      "u.s.a.",
      "united states",
      "united states of america",
    ].includes(normalized)
  ) {
    return "US";
  }

  if (["in", "india", "bharat"].includes(normalized)) {
    return "IN";
  }

  return "GLOBAL";
}

export function createSessionContext(input: {
  sessionId: string;
  country?: string;
  ageBand?: string;
  mainConcern?: string;
  ageConfirmed?: boolean;
}): SessionContext {
  const countryCode = normalizeCountryCode(input.country);

  return {
    sessionId: input.sessionId,
    countryCode,
    countryLabel: input.country?.trim() || undefined,
    ageConfirmed: input.ageConfirmed,
    ageBand: input.ageBand,
    mainConcern: input.mainConcern,
  };
}

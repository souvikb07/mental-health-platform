export type CountryCode = "US" | "IN" | "GLOBAL";

export type SessionContext = {
  sessionId: string;
  countryCode: CountryCode;
  countryLabel?: string;
  ageConfirmed?: boolean;
  ageBand?: string;
  mainConcern?: string;
};

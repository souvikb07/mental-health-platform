export type CountryCode = "US" | "IN" | "GLOBAL";

export type MainConcernCategory =
  | "overwhelmed"
  | "anxious_worried"
  | "low_numb_disconnected"
  | "work_study_stress"
  | "relationship_family"
  | "sleep_energy"
  | "not_sure";

export type SessionContext = {
  sessionId: string;
  countryCode: CountryCode;
  countryLabel?: string;
  ageConfirmed?: boolean;
  consentAccepted?: boolean;
  ageBand?: string;
  mainConcern?: string;
  mainConcernCategory?: MainConcernCategory;
  mainConcernLabel?: string;
  mainConcernText?: string;
};

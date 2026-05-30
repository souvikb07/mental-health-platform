import type {
  CountryCode,
  MainConcernCategory,
  SessionContext,
} from "@/types/session-context";

export const mainConcernOptions: Array<{
  id: MainConcernCategory;
  label: string;
}> = [
  { id: "overwhelmed", label: "Overwhelmed" },
  { id: "anxious_worried", label: "Anxious / worried" },
  { id: "low_numb_disconnected", label: "Low / numb / disconnected" },
  { id: "work_study_stress", label: "Work or study stress" },
  { id: "relationship_family", label: "Relationship or family" },
  { id: "sleep_energy", label: "Sleep or energy" },
  { id: "not_sure", label: "I’m not sure" },
];

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
  mainConcernCategory?: MainConcernCategory;
  mainConcernText?: string;
  ageConfirmed?: boolean;
  consentAccepted?: boolean;
  storageConsentAccepted?: boolean;
}): SessionContext {
  const countryCode = normalizeCountryCode(input.country);
  const mainConcernLabel = input.mainConcernCategory
    ? getMainConcernLabel(input.mainConcernCategory)
    : undefined;

  return {
    sessionId: input.sessionId,
    countryCode,
    countryLabel: input.country?.trim() || undefined,
    ageConfirmed: input.ageConfirmed,
    consentAccepted: input.consentAccepted,
    storageConsentAccepted: input.storageConsentAccepted,
    ageBand: input.ageBand,
    mainConcern: input.mainConcern,
    mainConcernCategory: input.mainConcernCategory,
    mainConcernLabel,
    mainConcernText: input.mainConcernText?.trim() || undefined,
  };
}

export function getMainConcernLabel(category: MainConcernCategory) {
  return (
    mainConcernOptions.find((option) => option.id === category)?.label ?? category
  );
}

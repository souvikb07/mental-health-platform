export type TriageUnavailableReason =
  | "missing_config"
  | "api_error"
  | "invalid_output";

export type TriageUnavailableResult = {
  available: false;
  reason: TriageUnavailableReason;
};

export function unavailableTriage(
  reason: TriageUnavailableReason,
): TriageUnavailableResult {
  return {
    available: false,
    reason,
  };
}

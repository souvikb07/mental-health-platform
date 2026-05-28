export const contextIntakeSchemaVersion = "context_intake.v1" as const;

export const inferredFocusAreas = [
  "overwhelm",
  "anxiety_worry",
  "low_mood_disconnection",
  "work_study_stress",
  "relationship_family",
  "sleep_energy",
  "uncertainty",
  "general_reflection",
] as const;

export const firstQuestionTypes = [
  "clarify_main_pressure",
  "clarify_worry_loop",
  "clarify_mood_energy",
  "clarify_work_study_stress",
  "clarify_relationship_context",
  "clarify_sleep_energy",
  "clarify_unknown_signal",
] as const;

export const contextIntakeTones = ["warm_grounded", "gentle_direct"] as const;
export const contextIntakeConfidences = ["low", "medium", "high"] as const;

export type InferredFocusArea = (typeof inferredFocusAreas)[number];
export type FirstQuestionType = (typeof firstQuestionTypes)[number];
export type ContextIntakeTone = (typeof contextIntakeTones)[number];
export type ContextIntakeConfidence =
  (typeof contextIntakeConfidences)[number];

export type ContextIntakeResult = {
  schemaVersion: typeof contextIntakeSchemaVersion;
  openingMessage: string;
  inferredFocusAreas: InferredFocusArea[];
  firstQuestionType: FirstQuestionType;
  tone: ContextIntakeTone;
  safetyNoteNeeded: boolean;
  shouldMentionProfessionalSupport: boolean;
  confidence: ContextIntakeConfidence;
};

export const contextIntakeJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "schemaVersion",
    "openingMessage",
    "inferredFocusAreas",
    "firstQuestionType",
    "tone",
    "safetyNoteNeeded",
    "shouldMentionProfessionalSupport",
    "confidence",
  ],
  properties: {
    schemaVersion: { const: contextIntakeSchemaVersion },
    openingMessage: { type: "string" },
    inferredFocusAreas: {
      type: "array",
      items: { enum: inferredFocusAreas },
    },
    firstQuestionType: { enum: firstQuestionTypes },
    tone: { enum: contextIntakeTones },
    safetyNoteNeeded: { type: "boolean" },
    shouldMentionProfessionalSupport: { type: "boolean" },
    confidence: { enum: contextIntakeConfidences },
  },
} as const;

export function parseContextIntakeResult(
  payload: unknown,
): ContextIntakeResult | null {
  if (!isRecord(payload) || !hasExactKeys(payload, requiredKeys)) {
    return null;
  }

  if (
    payload.schemaVersion !== contextIntakeSchemaVersion ||
    typeof payload.openingMessage !== "string" ||
    !isEnumArray(payload.inferredFocusAreas, inferredFocusAreas) ||
    !includesValue(firstQuestionTypes, payload.firstQuestionType) ||
    !includesValue(contextIntakeTones, payload.tone) ||
    typeof payload.safetyNoteNeeded !== "boolean" ||
    typeof payload.shouldMentionProfessionalSupport !== "boolean" ||
    !includesValue(contextIntakeConfidences, payload.confidence)
  ) {
    return null;
  }

  const openingMessage = payload.openingMessage.trim();

  if (!isSafeOpeningMessage(openingMessage)) {
    return null;
  }

  return {
    schemaVersion: payload.schemaVersion,
    openingMessage,
    inferredFocusAreas: payload.inferredFocusAreas,
    firstQuestionType: payload.firstQuestionType,
    tone: payload.tone,
    safetyNoteNeeded: payload.safetyNoteNeeded,
    shouldMentionProfessionalSupport: payload.shouldMentionProfessionalSupport,
    confidence: payload.confidence,
  };
}

export function isSafeOpeningMessage(openingMessage: string) {
  if (!openingMessage || openingMessage.length > 360) {
    return false;
  }

  if ((openingMessage.match(/\?/g) ?? []).length !== 1) {
    return false;
  }

  return !unsafeOpeningPatterns.some((pattern) => pattern.test(openingMessage));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEnumArray<T extends readonly string[]>(
  value: unknown,
  options: T,
): value is T[number][] {
  return (
    Array.isArray(value) &&
    value.every((item) => includesValue(options, item))
  );
}

function includesValue<T extends readonly string[]>(
  options: T,
  value: unknown,
): value is T[number] {
  return typeof value === "string" && options.includes(value);
}

function hasExactKeys(
  payload: Record<string, unknown>,
  expectedKeys: readonly string[],
) {
  const keys = Object.keys(payload);

  return (
    keys.length === expectedKeys.length &&
    keys.every((key) => expectedKeys.includes(key))
  );
}

const unsafeOpeningPatterns = [
  /\b(you have|you are|this is)\s+(depression|bipolar|ptsd|ocd|adhd|anxiety disorder)\b/i,
  /\b(medication|antidepressant|ssri|dose|dosage|mg)\b/i,
  /\b(treatment plan|treatment protocol|therapy protocol)\b/i,
  /\b(i am your therapist|this is therapy|this replaces therapy)\b/i,
  /\b(call emergency services|go to the emergency department|crisis hotline|988|112|911)\b/i,
];

const requiredKeys = [
  "schemaVersion",
  "openingMessage",
  "inferredFocusAreas",
  "firstQuestionType",
  "tone",
  "safetyNoteNeeded",
  "shouldMentionProfessionalSupport",
  "confidence",
] as const;

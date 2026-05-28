import type {
  BoundaryType,
  ClarityAction,
  ClarityEvidencePoint,
  HarmonyBand,
  HarmonySignalComponents,
  StructuredClarityMap,
} from "@/types/clarity-map";

export const clarityMapSchemaVersion = "clarity_map.v1" as const;

export const clarityMapStatuses = [
  "generated",
  "insufficient_context",
  "safety_blocked",
  "boundary_blocked",
] as const;

export const harmonyBands = [
  "steady",
  "mixed",
  "strained",
  "support_first",
] as const;

export const boundaryTypes = [
  "work_boundary",
  "personal_boundary",
  "relationship_boundary",
  "digital_boundary",
  "energy_boundary",
  "emotional_boundary",
  "unclear_boundary",
] as const;

export const clarityConfidences = ["low", "medium", "high"] as const;

export type ClarityMapMessageReference = {
  id: string;
  role: "assistant" | "user";
};

export type ParseClarityMapOptions = {
  messages: ClarityMapMessageReference[];
};

export const clarityMapJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "schemaVersion",
    "status",
    "disclaimer",
    "harmonySignal",
    "keyInsight",
    "boundaryFocus",
    "actionPlan",
    "supportPath",
    "confidence",
  ],
  properties: {
    schemaVersion: { const: clarityMapSchemaVersion },
    status: { enum: clarityMapStatuses },
    disclaimer: { type: "string" },
    harmonySignal: {
      type: "object",
      additionalProperties: false,
      required: ["label", "score", "band", "explanation", "components"],
      properties: {
        label: { type: "string" },
        score: { type: "number" },
        band: { enum: harmonyBands },
        explanation: { type: "string" },
        components: {
          type: "object",
          additionalProperties: false,
          required: [
            "emotionalLoad",
            "triggerClarity",
            "supportConnection",
            "actionReadiness",
            "safetyStability",
          ],
          properties: {
            emotionalLoad: { type: "number" },
            triggerClarity: { type: "number" },
            supportConnection: { type: "number" },
            actionReadiness: { type: "number" },
            safetyStability: { type: "number" },
          },
        },
      },
    },
    keyInsight: {
      type: "object",
      additionalProperties: false,
      required: ["title", "summary", "evidence"],
      properties: {
        title: { type: "string" },
        summary: { type: "string" },
        evidence: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["point", "evidenceMessageIds"],
            properties: {
              point: { type: "string" },
              evidenceMessageIds: {
                type: "array",
                items: { type: "string" },
              },
            },
          },
        },
      },
    },
    boundaryFocus: {
      type: "object",
      additionalProperties: false,
      required: ["title", "boundaryType", "insights", "smallExperiment"],
      properties: {
        title: { type: "string" },
        boundaryType: { enum: boundaryTypes },
        insights: { type: "array", items: { type: "string" } },
        smallExperiment: { type: "string" },
      },
    },
    actionPlan: {
      type: "object",
      additionalProperties: false,
      required: ["next24Hours", "next7Days"],
      properties: {
        next24Hours: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["action", "whyThisHelps"],
            properties: {
              action: { type: "string" },
              whyThisHelps: { type: "string" },
            },
          },
        },
        next7Days: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["action", "whyThisHelps"],
            properties: {
              action: { type: "string" },
              whyThisHelps: { type: "string" },
            },
          },
        },
      },
    },
    supportPath: {
      type: "object",
      additionalProperties: false,
      required: ["recommendation", "suggestedResourceTopics"],
      properties: {
        recommendation: { type: "string" },
        suggestedResourceTopics: {
          type: "array",
          items: { type: "string" },
        },
        professionalSupportNote: { type: "string" },
      },
    },
    confidence: { enum: clarityConfidences },
  },
} as const;

export function parseStructuredClarityMap(
  payload: unknown,
  options: ParseClarityMapOptions,
): StructuredClarityMap | null {
  if (!isRecord(payload) || !hasExactKeys(payload, rootKeys)) {
    return null;
  }

  if (
    payload.schemaVersion !== clarityMapSchemaVersion ||
    !includesValue(clarityMapStatuses, payload.status) ||
    typeof payload.disclaimer !== "string" ||
    !includesValue(clarityConfidences, payload.confidence) ||
    !disclaimerIncludesNonDiagnosis(payload.disclaimer)
  ) {
    return null;
  }

  const harmonySignal = parseHarmonySignal(payload.harmonySignal);
  const keyInsight = parseKeyInsight(payload.keyInsight, options);
  const boundaryFocus = parseBoundaryFocus(payload.boundaryFocus);
  const actionPlan = parseActionPlan(payload.actionPlan);
  const supportPath = parseSupportPath(payload.supportPath);

  if (
    !harmonySignal ||
    !keyInsight ||
    !boundaryFocus ||
    !actionPlan ||
    !supportPath
  ) {
    return null;
  }

  const parsed: StructuredClarityMap = {
    schemaVersion: payload.schemaVersion,
    status: payload.status,
    disclaimer: payload.disclaimer.trim(),
    harmonySignal,
    keyInsight,
    boundaryFocus,
    actionPlan,
    supportPath,
    confidence: payload.confidence,
  };

  return containsUnsafeLanguage(parsed) ? null : parsed;
}

export function computeHarmonySignal(input: {
  label: string;
  explanation: string;
  components: HarmonySignalComponents;
}): StructuredClarityMap["harmonySignal"] {
  const values = Object.values(input.components);
  const score = Math.round(
    (values.reduce((total, value) => total + value, 0) / (values.length * 4)) *
      100,
  );

  return {
    label: input.label.trim(),
    score,
    band: getHarmonyBand(score),
    explanation: input.explanation.trim(),
    components: input.components,
  };
}

export function getHarmonyBand(score: number): HarmonyBand {
  if (score >= 80) {
    return "steady";
  }

  if (score >= 60) {
    return "mixed";
  }

  if (score >= 40) {
    return "strained";
  }

  return "support_first";
}

export function isUnsafeClarityText(text: string) {
  return unsafePatterns.some((pattern) => pattern.test(text));
}

function parseHarmonySignal(value: unknown) {
  if (!isRecord(value) || !hasExactKeys(value, harmonySignalKeys)) {
    return null;
  }

  if (
    typeof value.label !== "string" ||
    !isReasonableText(value.label, 80) ||
    typeof value.explanation !== "string" ||
    !isReasonableText(value.explanation, 260) ||
    typeof value.score !== "number" ||
    value.score < 0 ||
    value.score > 100 ||
    !includesValue(harmonyBands, value.band)
  ) {
    return null;
  }

  const components = parseComponents(value.components);

  if (!components) {
    return null;
  }

  return computeHarmonySignal({
    label: value.label,
    explanation: value.explanation,
    components,
  });
}

function parseComponents(value: unknown): HarmonySignalComponents | null {
  if (!isRecord(value) || !hasExactKeys(value, componentKeys)) {
    return null;
  }

  const components = {
    emotionalLoad: value.emotionalLoad,
    triggerClarity: value.triggerClarity,
    supportConnection: value.supportConnection,
    actionReadiness: value.actionReadiness,
    safetyStability: value.safetyStability,
  };

  if (
    Object.values(components).some(
      (item) => typeof item !== "number" || item < 0 || item > 4,
    )
  ) {
    return null;
  }

  return components as HarmonySignalComponents;
}

function parseKeyInsight(
  value: unknown,
  options: ParseClarityMapOptions,
): StructuredClarityMap["keyInsight"] | null {
  if (!isRecord(value) || !hasExactKeys(value, keyInsightKeys)) {
    return null;
  }

  if (
    typeof value.title !== "string" ||
    !isReasonableText(value.title, 100) ||
    typeof value.summary !== "string" ||
    !isReasonableText(value.summary, 360) ||
    !Array.isArray(value.evidence) ||
    value.evidence.length !== 3
  ) {
    return null;
  }

  const evidence = value.evidence.map((item) =>
    parseEvidencePoint(item, options),
  );

  if (evidence.some((item) => item === null)) {
    return null;
  }

  return {
    title: value.title.trim(),
    summary: value.summary.trim(),
    evidence: evidence as ClarityEvidencePoint[],
  };
}

function parseEvidencePoint(
  value: unknown,
  options: ParseClarityMapOptions,
): ClarityEvidencePoint | null {
  if (!isRecord(value) || !hasExactKeys(value, evidenceKeys)) {
    return null;
  }

  if (
    typeof value.point !== "string" ||
    !isReasonableText(value.point, 240) ||
    !Array.isArray(value.evidenceMessageIds) ||
    value.evidenceMessageIds.length === 0 ||
    value.evidenceMessageIds.some((item) => typeof item !== "string")
  ) {
    return null;
  }

  const knownIds = new Set(options.messages.map((message) => message.id));
  const userIds = new Set(
    options.messages
      .filter((message) => message.role === "user")
      .map((message) => message.id),
  );
  const evidenceMessageIds = [...new Set(value.evidenceMessageIds)];

  if (
    evidenceMessageIds.some((id) => !knownIds.has(id)) ||
    !evidenceMessageIds.some((id) => userIds.has(id))
  ) {
    return null;
  }

  return {
    point: value.point.trim(),
    evidenceMessageIds,
  };
}

function parseBoundaryFocus(
  value: unknown,
): StructuredClarityMap["boundaryFocus"] | null {
  if (!isRecord(value) || !hasExactKeys(value, boundaryFocusKeys)) {
    return null;
  }

  if (
    typeof value.title !== "string" ||
    !isReasonableText(value.title, 100) ||
    !includesValue(boundaryTypes, value.boundaryType) ||
    !Array.isArray(value.insights) ||
    value.insights.length !== 2 ||
    value.insights.some(
      (item) => typeof item !== "string" || !isReasonableText(item, 220),
    ) ||
    typeof value.smallExperiment !== "string" ||
    !isReasonableText(value.smallExperiment, 220)
  ) {
    return null;
  }

  return {
    title: value.title.trim(),
    boundaryType: value.boundaryType as BoundaryType,
    insights: value.insights.map((item) => item.trim()),
    smallExperiment: value.smallExperiment.trim(),
  };
}

function parseActionPlan(
  value: unknown,
): StructuredClarityMap["actionPlan"] | null {
  if (!isRecord(value) || !hasExactKeys(value, actionPlanKeys)) {
    return null;
  }

  if (
    !Array.isArray(value.next24Hours) ||
    value.next24Hours.length !== 3 ||
    !Array.isArray(value.next7Days) ||
    ![3, 4].includes(value.next7Days.length)
  ) {
    return null;
  }

  const next24Hours = value.next24Hours.map(parseAction);
  const next7Days = value.next7Days.map(parseAction);

  if (
    next24Hours.some((item) => item === null) ||
    next7Days.some((item) => item === null)
  ) {
    return null;
  }

  return {
    next24Hours: next24Hours as ClarityAction[],
    next7Days: next7Days as ClarityAction[],
  };
}

function parseAction(value: unknown): ClarityAction | null {
  if (!isRecord(value) || !hasExactKeys(value, actionKeys)) {
    return null;
  }

  if (
    typeof value.action !== "string" ||
    !isReasonableText(value.action, 180) ||
    typeof value.whyThisHelps !== "string" ||
    !isReasonableText(value.whyThisHelps, 220)
  ) {
    return null;
  }

  return {
    action: value.action.trim(),
    whyThisHelps: value.whyThisHelps.trim(),
  };
}

function parseSupportPath(
  value: unknown,
): StructuredClarityMap["supportPath"] | null {
  if (!isRecord(value)) {
    return null;
  }

  const keys = value.professionalSupportNote
    ? supportPathKeysWithNote
    : supportPathKeys;

  if (!hasExactKeys(value, keys)) {
    return null;
  }

  if (
    typeof value.recommendation !== "string" ||
    !isReasonableText(value.recommendation, 280) ||
    !Array.isArray(value.suggestedResourceTopics) ||
    value.suggestedResourceTopics.length === 0 ||
    value.suggestedResourceTopics.length > 5 ||
    value.suggestedResourceTopics.some(
      (item) => typeof item !== "string" || !isReasonableText(item, 50),
    )
  ) {
    return null;
  }

  if (
    value.professionalSupportNote !== undefined &&
    (typeof value.professionalSupportNote !== "string" ||
      !isReasonableText(value.professionalSupportNote, 240))
  ) {
    return null;
  }

  return {
    recommendation: value.recommendation.trim(),
    suggestedResourceTopics: value.suggestedResourceTopics.map((item) =>
      item.trim(),
    ),
    professionalSupportNote: value.professionalSupportNote?.trim(),
  };
}

function containsUnsafeLanguage(map: StructuredClarityMap) {
  return isUnsafeClarityText(JSON.stringify(map));
}

function disclaimerIncludesNonDiagnosis(disclaimer: string) {
  return /\bnot\s+(a\s+)?diagnosis\b/i.test(disclaimer);
}

function isReasonableText(text: string, maxLength: number) {
  const trimmed = text.trim();

  return trimmed.length > 0 && trimmed.length <= maxLength;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

function includesValue<T extends readonly string[]>(
  options: T,
  value: unknown,
): value is T[number] {
  return typeof value === "string" && options.includes(value);
}

const rootKeys = [
  "schemaVersion",
  "status",
  "disclaimer",
  "harmonySignal",
  "keyInsight",
  "boundaryFocus",
  "actionPlan",
  "supportPath",
  "confidence",
] as const;

const harmonySignalKeys = [
  "label",
  "score",
  "band",
  "explanation",
  "components",
] as const;

const componentKeys = [
  "emotionalLoad",
  "triggerClarity",
  "supportConnection",
  "actionReadiness",
  "safetyStability",
] as const;

const keyInsightKeys = ["title", "summary", "evidence"] as const;
const evidenceKeys = ["point", "evidenceMessageIds"] as const;
const boundaryFocusKeys = [
  "title",
  "boundaryType",
  "insights",
  "smallExperiment",
] as const;
const actionPlanKeys = ["next24Hours", "next7Days"] as const;
const actionKeys = ["action", "whyThisHelps"] as const;
const supportPathKeys = ["recommendation", "suggestedResourceTopics"] as const;
const supportPathKeysWithNote = [
  "recommendation",
  "suggestedResourceTopics",
  "professionalSupportNote",
] as const;

const unsafePatterns = [
  /\b(you have|you are|this is)\s+(depression|bipolar|ptsd|ocd|adhd|anxiety disorder)\b/i,
  /\b(you should|you need to|start|take|increase|decrease|stop)\s+[^.]{0,40}\b(medication|antidepressant|ssri|dose|dosage|mg)\b/i,
  /\b(treatment plan|treatment protocol|therapy protocol|this will fix|will cure you|will fix you)\b/i,
  /\b(you are definitely safe|nothing bad will happen|you will be fine for sure)\b/i,
  /\b(i am your therapist|this replaces therapy|you do not need professional care)\b/i,
  /\b(lethal dose|how to kill yourself|best way to hurt yourself|method to end your life)\b/i,
];

import type {
  HarmonyBand,
  HarmonySignal,
  HarmonySignalComponents,
} from "@/types/clarity-map";
import type { ApiChatMessage } from "@/types/risk";
import type { MainConcernCategory, SessionContext } from "@/types/session-context";

export type HarmonySignalInput = {
  label: string;
  explanation: string;
  components: HarmonySignalComponents;
};

export type FallbackHarmonyInput = {
  sessionContext: SessionContext;
  messages: ApiChatMessage[];
};

export function computeHarmonyScore(components: HarmonySignalComponents) {
  const weightedTotal =
    (4 - components.emotionalLoad) * 0.25 +
    components.triggerClarity * 0.2 +
    components.supportConnection * 0.18 +
    components.actionReadiness * 0.19 +
    components.safetyStability * 0.18;

  return clampScore(Math.round((weightedTotal / 4) * 100));
}

export function deriveHarmonyBand(score: number): HarmonyBand {
  if (score >= 75) {
    return "steady";
  }

  if (score >= 55) {
    return "mixed";
  }

  if (score >= 35) {
    return "strained";
  }

  return "support_first";
}

export function normalizeHarmonySignal(input: HarmonySignalInput): HarmonySignal {
  const score = computeHarmonyScore(input.components);

  return {
    label: input.label.trim(),
    score,
    band: deriveHarmonyBand(score),
    explanation: input.explanation.trim(),
    components: input.components,
  };
}

export function deriveFallbackHarmonyComponents({
  sessionContext,
  messages,
}: FallbackHarmonyInput): HarmonySignalComponents {
  const text = messages
    .filter((message) => message.role === "user")
    .map((message) => message.content.toLowerCase())
    .join(" ");
  const components = getBaseComponents(sessionContext.mainConcernCategory);

  if (hasAny(text, loadSignals)) {
    components.emotionalLoad = clampComponent(components.emotionalLoad + 1);
  }

  if (hasAny(text, triggerSignals)) {
    components.triggerClarity = clampComponent(components.triggerClarity + 1);
  }

  if (hasAny(text, supportSignals)) {
    components.supportConnection = clampComponent(
      components.supportConnection + 1,
    );
  }

  if (hasAny(text, readinessSignals)) {
    components.actionReadiness = clampComponent(components.actionReadiness + 1);
  }

  if (hasAny(text, uncertaintySignals)) {
    components.triggerClarity = clampComponent(components.triggerClarity - 1);
    components.actionReadiness = clampComponent(components.actionReadiness - 1);
  }

  return components;
}

function getBaseComponents(
  category: MainConcernCategory | undefined,
): HarmonySignalComponents {
  switch (category) {
    case "work_study_stress":
      return {
        emotionalLoad: 3,
        triggerClarity: 3,
        supportConnection: 2,
        actionReadiness: 2,
        safetyStability: 3,
      };
    case "relationship_family":
      return {
        emotionalLoad: 3,
        triggerClarity: 3,
        supportConnection: 1,
        actionReadiness: 2,
        safetyStability: 3,
      };
    case "low_numb_disconnected":
    case "sleep_energy":
      return {
        emotionalLoad: 3,
        triggerClarity: 2,
        supportConnection: 1,
        actionReadiness: 1,
        safetyStability: 3,
      };
    case "anxious_worried":
      return {
        emotionalLoad: 3,
        triggerClarity: 3,
        supportConnection: 2,
        actionReadiness: 2,
        safetyStability: 3,
      };
    case "not_sure":
      return {
        emotionalLoad: 2,
        triggerClarity: 1,
        supportConnection: 2,
        actionReadiness: 1,
        safetyStability: 3,
      };
    case "overwhelmed":
    default:
      return {
        emotionalLoad: 3,
        triggerClarity: 2,
        supportConnection: 2,
        actionReadiness: 2,
        safetyStability: 3,
      };
  }
}

function hasAny(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text));
}

function clampComponent(value: number) {
  return Math.max(0, Math.min(4, value));
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, value));
}

const loadSignals = [
  /\boverwhelmed\b/,
  /\bexhausted\b/,
  /\bdrained\b/,
  /\bnumb\b/,
  /\bdisconnected\b/,
  /\bstuck\b/,
  /\bspiral(?:ing|ling)?\b/,
  /\breplaying\b/,
];

const triggerSignals = [
  /\bwork\b/,
  /\bstudy\b/,
  /\bdeadline\b/,
  /\bafter work\b/,
  /\bfamily\b/,
  /\bpartner\b/,
  /\bsleep\b/,
  /\benergy\b/,
  /\bworry\b/,
  /\boverthinking\b/,
  /\breplaying\b/,
];

const supportSignals = [
  /\bfriend\b/,
  /\bfamily\b/,
  /\btrusted person\b/,
  /\btalked to\b/,
  /\btherapist\b/,
  /\bcounselor\b/,
  /\bprofessional\b/,
];

const readinessSignals = [
  /\bsmall step\b/,
  /\bnext step\b/,
  /\bi can\b/,
  /\bmaybe i could\b/,
  /\bplan\b/,
  /\btry\b/,
  /\bwant one\b/,
];

const uncertaintySignals = [
  /\bnot sure\b/,
  /\bi do not know\b/,
  /\bi don't know\b/,
  /\bunclear\b/,
  /\bconfused\b/,
];

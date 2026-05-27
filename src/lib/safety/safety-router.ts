import {
  highRiskSafetyCopy,
  imminentRiskSafetyCopy,
  getMinorSafetyCopy,
} from "@/lib/safety/safety-copy";
import type {
  ApiRiskClassification,
  NextRecommendedAction,
  SafetyMode,
  SafetyUi,
} from "@/types/risk";

export type SafetyRoute = {
  mode: SafetyMode;
  nextRecommendedAction: NextRecommendedAction;
  safety: SafetyUi | null;
  shouldShowResources: boolean;
};

export function routeSafety(risk: ApiRiskClassification): SafetyRoute {
  if (risk.level === "imminent") {
    return {
      mode: "crisis",
      nextRecommendedAction: "urgent_support",
      safety: {
        showInlineSafetyCard: true,
        disableNormalNextStep: true,
        title: imminentRiskSafetyCopy.title,
        message: imminentRiskSafetyCopy.message,
        tone: "urgent",
      },
      shouldShowResources: true,
    };
  }

  if (risk.level === "high") {
    const minorCopy = getMinorSafetyCopy(risk.categories);

    return {
      mode: "support",
      nextRecommendedAction: "show_resources",
      safety: {
        showInlineSafetyCard: true,
        disableNormalNextStep: true,
        title: minorCopy?.title ?? highRiskSafetyCopy.title,
        message: minorCopy?.message ?? highRiskSafetyCopy.message,
        tone: "support",
      },
      shouldShowResources: true,
    };
  }

  if (risk.level === "medium") {
    const minorCopy = getMinorSafetyCopy(risk.categories);

    return {
      mode: "support",
      nextRecommendedAction: "continue_with_supportive_nudge",
      safety: minorCopy
        ? {
            showInlineSafetyCard: true,
            disableNormalNextStep: false,
            title: minorCopy.title,
            message: minorCopy.message,
            tone: "support",
          }
        : null,
      shouldShowResources: risk.categories.length > 0,
    };
  }

  return {
    mode: "normal",
    nextRecommendedAction: "continue_chat",
    safety: null,
    shouldShowResources: false,
  };
}

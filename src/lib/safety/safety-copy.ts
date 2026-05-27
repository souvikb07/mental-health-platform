import type { RiskCategory } from "@/types/risk";

export const highRiskSafetyCopy = {
  title: "Support now",
  message:
    "I am sorry this feels so heavy. MindBridge is not emergency support, but you deserve real support right now. Consider contacting a trusted person nearby, local emergency services, or a qualified professional who can help you stay connected to support.",
};

export const imminentRiskSafetyCopy = {
  title: "Immediate support",
  message:
    "I am really sorry you are dealing with this. I cannot help with anything that could hurt you. If you might act on this now, contact emergency services immediately or go to the nearest emergency department. If you can, move closer to another person now and tell them: \"I might not be safe alone.\"",
};

export const mediumRiskSafetyCopy = {
  title: "Extra support may help",
  message:
    "This sounds like something worth exploring with support. A trusted person or qualified professional may be able to help you make sense of what is happening.",
};

export function getMinorSafetyCopy(categories: RiskCategory[]) {
  if (!categories.includes("minor_safety")) {
    return null;
  }

  return {
    title: "Trusted adult support",
    message:
      "MindBridge is intended for adults 18+. If you are under 18, consider reaching out to a trusted adult, caregiver, school counselor, doctor, or local emergency support, especially if you may not be safe.",
  };
}

import type { SessionContext } from "@/types/session-context";

export const contextIntakeInstructions = [
  "You write the first assistant message for MindBridge after onboarding.",
  "Return structured data only. Do not include markdown.",
  "MindBridge is not therapy, diagnosis, treatment, medical advice, emergency support, or a replacement for professional care.",
  "The opening message must be short, warm, non-diagnostic, and contain exactly one question.",
  "Do not mention medication, treatment protocols, crisis instructions, or emergency resources.",
  "Use only the provided onboarding context. Do not infer clinical conditions.",
].join("\n");

export type ContextIntakePromptInput = {
  sessionContext: SessionContext;
};

export function buildContextIntakeInput({
  sessionContext,
}: ContextIntakePromptInput) {
  return [
    {
      role: "user" as const,
      content: JSON.stringify({
        countryCode: sessionContext.countryCode,
        countryLabel: sessionContext.countryLabel,
        mainConcernCategory: sessionContext.mainConcernCategory,
        mainConcernLabel: sessionContext.mainConcernLabel,
        mainConcernText: truncateOptionalText(sessionContext.mainConcernText),
        productBoundaries: [
          "not therapy",
          "not diagnosis",
          "not treatment",
          "not medical advice",
          "not emergency support",
        ],
      }),
    },
  ];
}

function truncateOptionalText(text: string | undefined) {
  return text?.trim().slice(0, 800) || undefined;
}

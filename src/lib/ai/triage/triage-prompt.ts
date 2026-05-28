import type { PolicyBoundaryResult } from "@/types/policy-boundary";
import type { ApiRiskClassification } from "@/types/risk";
import type { SessionContext } from "@/types/session-context";

export const triageInstructions = [
  "You are a safety triage signal classifier for MindBridge.",
  "Return structured data only. Do not write user-facing assistant copy.",
  "MindBridge is not therapy, diagnosis, treatment, medical advice, emergency support, or a replacement for professional care.",
  "Do not provide self-harm method details, medication advice, treatment plans, or diagnosis.",
  "Use the deterministic risk and policy fields as context, but classify the latest message carefully for subtle safety signals.",
  "If language is ambiguous but concerning, prefer medium risk with a clarifying safety question flag over none.",
].join("\n");

const maxTriageMessageLength = 1200;

export type TriagePromptInput = {
  message: string;
  sessionContext?: SessionContext;
  deterministicRisk?: ApiRiskClassification;
  policyBoundary?: PolicyBoundaryResult;
};

export function buildTriageInput({
  message,
  sessionContext,
  deterministicRisk,
  policyBoundary,
}: TriagePromptInput) {
  return [
    {
      role: "user" as const,
      content: JSON.stringify({
        latestUserMessage: truncateForTriage(message),
        sessionContext: {
          countryCode: sessionContext?.countryCode,
          mainConcernCategory: sessionContext?.mainConcernCategory,
        },
        deterministicRisk,
        policyBoundary,
      }),
    },
  ];
}

function truncateForTriage(message: string) {
  return message.slice(0, maxTriageMessageLength);
}

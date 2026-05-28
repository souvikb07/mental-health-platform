import type { ApiChatMessage } from "@/types/risk";
import type { SessionContext } from "@/types/session-context";

export const clarityMapInstructions = [
  "You generate a structured Clarity Map for MindBridge.",
  "Return structured JSON only. Do not include markdown.",
  "MindBridge is not therapy, diagnosis, treatment, medical advice, emergency support, or a replacement for professional care.",
  "Use cautious language such as may be, could be, and patterns that may be present.",
  "Ground every insight in the provided transcript evidence IDs.",
  "Do not infer disorders, recommend medication, create treatment protocols, or invent support resources.",
  "If the transcript is thin or unclear, keep confidence low and stay practical.",
].join("\n");

export type ClarityMapPromptInput = {
  sessionContext: SessionContext;
  messages: ApiChatMessage[];
};

export function buildClarityMapInput({
  sessionContext,
  messages,
}: ClarityMapPromptInput) {
  return [
    {
      role: "user" as const,
      content: JSON.stringify({
        sessionContext: {
          countryCode: sessionContext.countryCode,
          countryLabel: sessionContext.countryLabel,
          mainConcernCategory: sessionContext.mainConcernCategory,
          mainConcernLabel: sessionContext.mainConcernLabel,
          mainConcernText: truncateText(sessionContext.mainConcernText, 800),
        },
        messages: messages.slice(-16).map((message) => ({
          id: message.id,
          role: message.role,
          content: truncateText(message.content, 900),
        })),
        productBoundaries: [
          "not therapy",
          "not diagnosis",
          "not treatment",
          "not medical advice",
          "not emergency support",
          "no medication advice",
          "no crisis method details",
        ],
      }),
    },
  ];
}

function truncateText(text: string | undefined, maxLength: number) {
  return text?.trim().slice(0, maxLength) || undefined;
}

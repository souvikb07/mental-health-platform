import type { ClarityMap } from "@/types/clarity-map";
import { mockResources } from "@/lib/mock/mock-resources";

export const mockClarityMap: ClarityMap = {
  headline: "Stress and disconnection may be the main patterns to explore.",
  riskLevel: "low",
  nonDiagnosisNotice:
    "This is not a diagnosis. It is a reflection summary based on a short mock conversation, and a qualified professional may be able to help you explore it further.",
  patterns: [
    {
      title: "More effort for everyday tasks",
      description:
        "The conversation suggests that routines are taking more energy than usual, especially after work and in the evening.",
    },
    {
      title: "Worry loops around performance",
      description:
        "There may be a pattern of replaying conversations and feeling unsure whether you are doing enough.",
    },
    {
      title: "Pulling back from support",
      description:
        "You mentioned replying less often and not wanting to burden people, which can make things feel more isolated.",
    },
  ],
  focusAreas: [
    "Sleep rhythm and evening decompression",
    "One low-pressure support conversation",
    "Noticing when worry becomes repetitive rather than useful",
  ],
  next24Hours: [
    "Send one short check-in message to someone you trust.",
    "Write three sentences about what has felt different this week.",
    "Choose one basic care action: food, water, rest, or a short walk.",
  ],
  next7Days: [
    "Consider booking time with a counselor, primary care professional, or workplace support option.",
    "Track when the heaviest moments happen without judging them.",
    "Pick one commitment to reduce or reschedule if your capacity is lower right now.",
  ],
  suggestedSupportPath:
    "Start with trusted-person support and consider professional support if the pattern continues, worsens, or starts affecting daily functioning more strongly.",
  resources: mockResources.filter((resource) =>
    resource.riskLevels.some((level) => ["none", "low", "medium"].includes(level)),
  ),
};

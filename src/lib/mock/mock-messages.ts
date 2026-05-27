import type { MockRiskClassification } from "@/types/risk";

export type MockMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  risk?: MockRiskClassification;
};

export const mockMessages: MockMessage[] = [
  {
    id: "m1",
    role: "assistant",
    content:
      "To start, what has felt off lately? Share only what feels comfortable.",
  },
  {
    id: "m2",
    role: "user",
    content:
      "I feel tense most evenings and keep replaying work conversations. I am not sure what kind of help I need.",
    risk: {
      level: "low",
      categories: [],
      actionTaken: "continue_reflection",
      note: "Mock classification only. Deterministic safety routing is introduced in Block 3.",
    },
  },
  {
    id: "m3",
    role: "assistant",
    content:
      "That sounds draining. When did this pattern start, and what parts of life does it affect most?",
  },
  {
    id: "m4",
    role: "user",
    content:
      "Maybe a few weeks ago. Sleep and texting friends are the biggest things.",
    risk: {
      level: "low",
      categories: [],
      actionTaken: "continue_reflection",
      note: "Mock classification only. Deterministic safety routing is introduced in Block 3.",
    },
  },
  {
    id: "m5",
    role: "assistant",
    content:
      "Thanks. I can turn this into a non-diagnostic Clarity Map with patterns that may be present and possible next support steps.",
  },
];

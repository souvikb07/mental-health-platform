import type { SupportResource } from "@/types/resource";

export const mockResources: SupportResource[] = [
  {
    id: "us-988",
    title: "988 Suicide & Crisis Lifeline",
    description:
      "Free, confidential crisis support in the United States by call, text, or chat.",
    type: "crisis",
    country: "US",
    topics: ["crisis", "self_harm", "immediate_support"],
    riskLevels: ["high", "imminent"],
    actionLabel: "Call or text 988",
    href: "tel:988",
  },
  {
    id: "trusted-person-plan",
    title: "Tell a trusted person what is happening",
    description:
      "A simple next step when things feel heavy: choose one person and ask them to stay connected today.",
    type: "trusted-person",
    country: "global",
    topics: ["support", "connection", "safety"],
    riskLevels: ["low", "medium", "high", "imminent"],
    actionLabel: "Use this step",
    href: "/resources",
  },
  {
    id: "primary-care-or-therapist",
    title: "Talk with a qualified professional",
    description:
      "A clinician, counselor, or primary care professional may be able to help you explore patterns that may be present.",
    type: "professional",
    country: "global",
    topics: ["professional_support", "anxiety", "low_mood"],
    riskLevels: ["none", "low", "medium"],
    actionLabel: "Plan outreach",
    href: "/resources",
  },
  {
    id: "reflection-notes",
    title: "Bring notes to a support conversation",
    description:
      "Write down what changed, what feels harder, what helps briefly, and what kind of support you want to ask for.",
    type: "planning",
    country: "global",
    topics: ["preparation", "clarity", "support"],
    riskLevels: ["none", "low", "medium"],
    actionLabel: "Review prompts",
    href: "/clarity-map",
  },
];

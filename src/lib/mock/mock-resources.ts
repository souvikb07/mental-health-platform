import type { SupportResource } from "@/types/resource";

export const mockResources: SupportResource[] = [
  {
    id: "in-emergency-112",
    title: "India emergency response number",
    description:
      "If there may be immediate danger, contact local emergency services or go to the nearest emergency department.",
    type: "emergency",
    country: "IN",
    topics: ["emergency", "crisis", "self_harm", "harm_to_others", "medical_emergency"],
    riskLevels: ["high", "imminent"],
    actionLabel: "Call 112",
    href: "tel:112",
    phone: "112",
    priority: 1,
    availabilityNote:
      "General emergency response number in India; not a guaranteed mental-health crisis service.",
  },
  {
    id: "in-trusted-adult-or-person",
    title: "Reach a trusted person in India",
    description:
      "If you might not be safe alone, contact a trusted person nearby and ask them to stay with you or help you reach local support.",
    type: "trusted-person",
    country: "IN",
    topics: ["support", "minor_safety", "self_harm", "abuse", "safety"],
    riskLevels: ["medium", "high", "imminent"],
    actionLabel: "Use this step",
    href: "/resources",
    priority: 2,
  },
  {
    id: "in-qualified-professional",
    title: "Plan a qualified support conversation",
    description:
      "A counselor, psychiatrist, psychologist, doctor, or campus/workplace support contact may be able to help you explore what is happening.",
    type: "professional",
    country: "IN",
    topics: ["professional_support", "stress", "low_mood", "psychosis_or_mania_signal", "substance_use"],
    riskLevels: ["low", "medium", "high"],
    actionLabel: "Plan outreach",
    href: "/resources",
    priority: 3,
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
    priority: 10,
  },
  {
    id: "global-support-directory",
    title: "Use a local support directory",
    description:
      "Look for a local crisis line, emergency department, community mental health service, or licensed professional in your area.",
    type: "directory",
    country: "global",
    topics: ["crisis", "professional_support", "support", "self_harm", "abuse"],
    riskLevels: ["medium", "high", "imminent"],
    actionLabel: "Find local support",
    href: "/resources",
    priority: 11,
  },
  {
    id: "reflection-notes",
    title: "Bring notes to a support conversation",
    description:
      "Write down what changed, what feels harder, what helps briefly, and what kind of support you want to ask for.",
    type: "planning",
    country: "global",
    topics: ["preparation", "clarity", "support", "stress"],
    riskLevels: ["none", "low", "medium"],
    actionLabel: "Review prompts",
    href: "/clarity-map",
    priority: 20,
  },
];

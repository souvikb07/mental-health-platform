import type { ContextIntakeResult } from "@/lib/ai/context-intake/context-intake-schema";
import type { MainConcernCategory, SessionContext } from "@/types/session-context";

type FallbackConfig = Pick<
  ContextIntakeResult,
  "openingMessage" | "inferredFocusAreas" | "firstQuestionType"
>;

const fallbackByConcern: Record<MainConcernCategory, FallbackConfig> = {
  overwhelmed: {
    openingMessage:
      "It sounds like things may feel heavy or crowded right now; what feels most pressing today?",
    inferredFocusAreas: ["overwhelm"],
    firstQuestionType: "clarify_main_pressure",
  },
  anxious_worried: {
    openingMessage:
      "It sounds like worry may be taking up a lot of space; what loop or concern has been hardest to set down?",
    inferredFocusAreas: ["anxiety_worry"],
    firstQuestionType: "clarify_worry_loop",
  },
  low_numb_disconnected: {
    openingMessage:
      "It sounds like your mood or sense of connection may feel different lately; what change have you noticed most?",
    inferredFocusAreas: ["low_mood_disconnection"],
    firstQuestionType: "clarify_mood_energy",
  },
  work_study_stress: {
    openingMessage:
      "It sounds like work or study stress is part of what brings you here; what has been weighing on you most?",
    inferredFocusAreas: ["work_study_stress"],
    firstQuestionType: "clarify_work_study_stress",
  },
  relationship_family: {
    openingMessage:
      "It sounds like a relationship or family situation may be affecting you; what part feels hardest to make sense of?",
    inferredFocusAreas: ["relationship_family"],
    firstQuestionType: "clarify_relationship_context",
  },
  sleep_energy: {
    openingMessage:
      "It sounds like sleep or energy has been part of the picture; what pattern have you noticed recently?",
    inferredFocusAreas: ["sleep_energy"],
    firstQuestionType: "clarify_sleep_energy",
  },
  not_sure: {
    openingMessage:
      "It is okay not to have a clear label for what is happening; what made you decide to check in today?",
    inferredFocusAreas: ["uncertainty", "general_reflection"],
    firstQuestionType: "clarify_unknown_signal",
  },
};

export function getFallbackContextIntake(
  sessionContext: SessionContext,
): ContextIntakeResult {
  const fallback =
    fallbackByConcern[sessionContext.mainConcernCategory ?? "not_sure"];

  return {
    schemaVersion: "context_intake.v1",
    openingMessage: fallback.openingMessage,
    inferredFocusAreas: fallback.inferredFocusAreas,
    firstQuestionType: fallback.firstQuestionType,
    tone: "warm_grounded",
    safetyNoteNeeded: false,
    shouldMentionProfessionalSupport: false,
    confidence: sessionContext.mainConcernCategory ? "medium" : "low",
  };
}

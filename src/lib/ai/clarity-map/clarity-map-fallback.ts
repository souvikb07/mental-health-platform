import { parseStructuredClarityMap } from "@/lib/ai/clarity-map/clarity-map-schema";
import {
  deriveFallbackHarmonyComponents,
  normalizeHarmonySignal,
} from "@/lib/ai/clarity-map/harmony-signal";
import type { StructuredClarityMap } from "@/types/clarity-map";
import type { ApiChatMessage } from "@/types/risk";
import type { MainConcernCategory, SessionContext } from "@/types/session-context";

export type ClarityMapFallbackInput = {
  sessionContext: SessionContext;
  messages: ApiChatMessage[];
};

export function getFallbackStructuredClarityMap({
  sessionContext,
  messages,
}: ClarityMapFallbackInput): StructuredClarityMap {
  const userMessages = messages.filter((message) => message.role === "user");
  const evidenceIds = getEvidenceIds(userMessages);
  const config =
    fallbackByConcern[sessionContext.mainConcernCategory ?? "not_sure"];
  const latestUserText =
    userMessages.at(-1)?.content.trim() ??
    sessionContext.mainConcernLabel ??
    "what you shared";
  const components = deriveFallbackHarmonyComponents({
    sessionContext,
    messages,
  });
  const harmonyCopy = getHarmonyCopy({
    config,
    components,
    category: sessionContext.mainConcernCategory,
  });
  const harmonySignal = normalizeHarmonySignal({
    label: harmonyCopy.label,
    explanation: harmonyCopy.explanation,
    components,
  });
  const map: StructuredClarityMap = {
    schemaVersion: "clarity_map.v1",
    status: "generated",
    disclaimer:
      "This is not a diagnosis. It is a reflection map based only on what you shared here.",
    harmonySignal,
    keyInsight: {
      title: config.insightTitle,
      summary: `A pattern that may be present is that ${config.summary} The latest detail to keep in view is: "${truncate(latestUserText, 140)}"`,
      evidence: [
        {
          point: config.evidencePoints[0],
          evidenceMessageIds: [evidenceIds[0]],
        },
        {
          point: config.evidencePoints[1],
          evidenceMessageIds: [evidenceIds[1]],
        },
        {
          point: config.evidencePoints[2],
          evidenceMessageIds: [evidenceIds[2]],
        },
      ],
    },
    boundaryFocus: {
      title: config.boundaryTitle,
      boundaryType: config.boundaryType,
      insights: config.boundaryInsights,
      smallExperiment: config.smallExperiment,
    },
    actionPlan: {
      next24Hours: [
        {
          action: config.firstNext24Hours,
          whyThisHelps: config.firstNext24HoursWhy,
        },
        {
          action: config.next24Hours,
          whyThisHelps:
            "A small practical step can reduce pressure while you keep reflecting.",
        },
        {
          action: config.thirdNext24Hours,
          whyThisHelps: config.thirdNext24HoursWhy,
        },
      ],
      next7Days: [
        {
          action: config.next7Days,
          whyThisHelps:
            "Watching the pattern for a few days can clarify what support step fits.",
        },
        {
          action: "Notice one moment when the pressure eases, even slightly.",
          whyThisHelps:
            "Small shifts can show what conditions make things more manageable.",
        },
        {
          action:
            "Consider discussing this pattern with a qualified professional if it continues or disrupts daily life.",
          whyThisHelps:
            "Professional support may help you explore the pattern more fully.",
        },
      ],
    },
    supportPath: {
      recommendation: config.supportRecommendation,
      suggestedResourceTopics: config.resourceTopics,
      professionalSupportNote:
        "A qualified professional may be able to help you explore these patterns; this map is not a diagnosis.",
    },
    confidence:
      sessionContext.mainConcernCategory === "not_sure" || userMessages.length < 3
        ? "low"
        : "medium",
  };

  return (
    parseStructuredClarityMap(map, {
      messages: messages.map(({ id, role }) => ({ id, role })),
    }) ?? map
  );
}

function getEvidenceIds(userMessages: ApiChatMessage[]) {
  const ids = userMessages.map((message) => message.id);
  const fallbackId = ids[0] ?? "fallback_user_message";

  return [ids[0] ?? fallbackId, ids[1] ?? fallbackId, ids[2] ?? fallbackId];
}

function truncate(text: string, maxLength: number) {
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

function getHarmonyCopy({
  config,
  components,
  category,
}: {
  config: FallbackConcernConfig;
  components: StructuredClarityMap["harmonySignal"]["components"];
  category: MainConcernCategory | undefined;
}) {
  if (category === "not_sure") {
    return {
      label: "The signal is still forming",
      explanation:
        "This non-clinical reflection signal is based only on this conversation, and the pattern may need a little more detail before it becomes clearer.",
    };
  }

  if (category === "low_numb_disconnected" || category === "sleep_energy") {
    return {
      label: "Energy and connection may need gentler support",
      explanation:
        "This non-clinical reflection signal is based only on this conversation and points to lower energy, lower readiness, or reduced connection.",
    };
  }

  if (category === "anxious_worried") {
    return {
      label: "A worry loop is visible, with some room to sort it",
      explanation:
        "This non-clinical reflection signal is based only on this conversation and suggests the pattern may be clearer than the next step.",
    };
  }

  if (category === "relationship_family") {
    return {
      label: "Relationship pressure may be pulling on capacity",
      explanation:
        "This non-clinical reflection signal is based only on this conversation and suggests support or boundaries may need careful pacing.",
    };
  }

  if (components.triggerClarity >= 3 && components.actionReadiness >= 3) {
    return {
      label: "The pattern is clearer than the recovery path",
      explanation:
        "This non-clinical reflection signal is based only on this conversation and suggests a recognizable pressure point with a practical next step forming.",
    };
  }

  return {
    label: config.harmonyLabel,
    explanation: `This non-clinical reflection signal is based only on this conversation. ${config.harmonyExplanation}`,
  };
}

type FallbackConcernConfig = (typeof fallbackByConcern)[MainConcernCategory];

const fallbackByConcern: Record<
  MainConcernCategory,
  {
    harmonyLabel: string;
    harmonyExplanation: string;
    insightTitle: string;
    summary: string;
    evidencePoints: [string, string, string];
    boundaryTitle: string;
    boundaryType: StructuredClarityMap["boundaryFocus"]["boundaryType"];
    boundaryInsights: [string, string];
    smallExperiment: string;
    next24Hours: string;
    next7Days: string;
    supportRecommendation: string;
    resourceTopics: string[];
    firstNext24Hours: string;
    firstNext24HoursWhy: string;
    thirdNext24Hours: string;
    thirdNext24HoursWhy: string;
  }
> = {
  overwhelmed: {
    harmonyLabel: "Pressure is visible, but the next step can stay small",
    harmonyExplanation:
      "The conversation suggests meaningful load with some room to clarify one pressure point.",
    insightTitle: "Overload may be crowding out clarity",
    summary: "several pressures may be competing for attention at once.",
    evidencePoints: [
      "The user named a heavy or crowded experience.",
      "The transcript points toward pressure that may need sorting.",
      "A small next step appears more fitting than a large overhaul.",
    ],
    boundaryTitle: "Protect one small pocket of capacity",
    boundaryType: "energy_boundary",
    boundaryInsights: [
      "The useful boundary may be about reducing load rather than solving everything.",
      "A short pause or smaller commitment could make reflection easier.",
    ],
    smallExperiment:
      "Choose one task or expectation to postpone, shrink, or ask for help with today.",
    next24Hours: "Pick one pressure point and decide the smallest next action.",
    next7Days: "Track which situations make the pressure spike most often.",
    firstNext24Hours: "Write two sentences naming what feels heaviest right now.",
    firstNext24HoursWhy:
      "A short note can make the pattern easier to see without forcing a big decision.",
    thirdNext24Hours:
      "Share one low-pressure update with a trusted person if that feels safe.",
    thirdNext24HoursWhy:
      "Support can be easier to access when the ask is specific and small.",
    supportRecommendation:
      "Start with a trusted-person check-in and consider professional support if overload keeps disrupting daily life.",
    resourceTopics: ["stress", "support", "professional_support"],
  },
  anxious_worried: {
    harmonyLabel: "Worry may be active, with room to separate signal from loop",
    harmonyExplanation:
      "The conversation suggests worry may be taking attention and energy.",
    insightTitle: "A worry loop may be asking for gentle sorting",
    summary: "the concern may be repeating without becoming easier to act on.",
    evidencePoints: [
      "The user described worry or anxious pressure.",
      "The transcript suggests a repeated concern may be taking focus.",
      "A grounding next step may help separate what is known from what is uncertain.",
    ],
    boundaryTitle: "Create a limit around worry loops",
    boundaryType: "emotional_boundary",
    boundaryInsights: [
      "The boundary may be about when to keep thinking and when to pause.",
      "Writing the concern down can reduce the need to hold it all at once.",
    ],
    smallExperiment:
      "Set a 10-minute note window for the worry, then shift to one grounding action.",
    next24Hours: "List what is known, unknown, and one thing you can influence.",
    next7Days: "Notice when worry becomes repetitive rather than useful.",
    firstNext24Hours:
      "Write the worry in three columns: known, unknown, and influenceable.",
    firstNext24HoursWhy:
      "Sorting the loop can show whether it is asking for action, rest, or support.",
    thirdNext24Hours:
      "Choose one grounding action that does not require solving the whole worry.",
    thirdNext24HoursWhy:
      "A small reset can lower the pressure to keep replaying the same concern.",
    supportRecommendation:
      "Use self-guided reflection first and consider qualified support if worry feels hard to interrupt.",
    resourceTopics: ["stress", "support", "professional_support"],
  },
  low_numb_disconnected: {
    harmonyLabel: "Connection may feel lower, so support should stay gentle",
    harmonyExplanation:
      "The conversation suggests lower energy or disconnection with some clarity still forming.",
    insightTitle: "Low connection may be shaping the pattern",
    summary: "energy or connection may feel reduced in a way worth tracking.",
    evidencePoints: [
      "The user named low mood, numbness, or disconnection.",
      "The transcript suggests daily energy may be part of the pattern.",
      "Gentle support may fit better than pressure to explain everything.",
    ],
    boundaryTitle: "Make room for low-energy support",
    boundaryType: "energy_boundary",
    boundaryInsights: [
      "The boundary may be about asking less of yourself while still staying connected.",
      "Small contact can matter even when energy is low.",
    ],
    smallExperiment:
      "Send one simple message that does not require a long conversation.",
    next24Hours: "Choose one basic care action: food, water, rest, or fresh air.",
    next7Days: "Track one daily energy pattern without judging it.",
    firstNext24Hours:
      "Name one basic care need that feels possible rather than ideal.",
    firstNext24HoursWhy:
      "Low-pressure care can support reflection without turning it into a performance task.",
    thirdNext24Hours:
      "Send one short check-in message that does not require a long reply.",
    thirdNext24HoursWhy:
      "Small connection can matter when energy or motivation feels reduced.",
    supportRecommendation:
      "Consider trusted-person support and qualified professional support if disconnection persists or worsens.",
    resourceTopics: ["support", "professional_support"],
  },
  work_study_stress: {
    harmonyLabel: "Work or study pressure is clearer than the recovery path",
    harmonyExplanation:
      "The conversation suggests a recognizable external pressure with recovery needs still forming.",
    insightTitle: "Performance pressure may be spilling into recovery time",
    summary: "work or study demands may be carrying into time that needs rest.",
    evidencePoints: [
      "The user connected the concern to work or study.",
      "The transcript suggests pressure may continue after the task ends.",
      "A boundary around availability or recovery may be useful.",
    ],
    boundaryTitle: "Separate effort time from recovery time",
    boundaryType: "work_boundary",
    boundaryInsights: [
      "The boundary may involve when work or study gets to occupy attention.",
      "A small shutdown ritual could help mark the end of effort.",
    ],
    smallExperiment:
      "Create a five-minute end-of-work note: done, pending, and next smallest step.",
    next24Hours: "Name one work or study expectation that can be narrowed.",
    next7Days: "Try one repeatable shutdown cue after work or study.",
    firstNext24Hours:
      "Write a short shutdown note: done, pending, and next smallest step.",
    firstNext24HoursWhy:
      "A concrete stopping point can reduce replaying after work or study ends.",
    thirdNext24Hours:
      "Protect one small recovery pocket after the next work or study block.",
    thirdNext24HoursWhy:
      "A visible recovery cue can help separate effort time from the rest of the day.",
    supportRecommendation:
      "Start with practical workload reflection and consider professional or workplace support if functioning is affected.",
    resourceTopics: ["stress", "support", "professional_support"],
  },
  relationship_family: {
    harmonyLabel: "Relationship pressure may need a careful boundary",
    harmonyExplanation:
      "The conversation suggests interpersonal pressure with a need for safe pacing.",
    insightTitle: "A relationship pattern may be asking for clearer limits",
    summary: "connection and personal capacity may be pulling in different directions.",
    evidencePoints: [
      "The user connected the concern to another person or family context.",
      "The transcript suggests emotional load may be tied to interaction patterns.",
      "A careful boundary could reduce pressure without forcing a major decision.",
    ],
    boundaryTitle: "Clarify one relational limit",
    boundaryType: "relationship_boundary",
    boundaryInsights: [
      "The boundary may be about what is yours to hold and what is not.",
      "A small, specific limit may feel safer than a broad confrontation.",
    ],
    smallExperiment:
      "Write one sentence that names what you can offer and what you cannot offer right now.",
    next24Hours: "Pause before one reply and check what you actually have capacity for.",
    next7Days: "Notice which interactions leave you more tense or more settled.",
    firstNext24Hours:
      "Write one sentence about what is yours to hold and what may not be yours.",
    firstNext24HoursWhy:
      "A small boundary sentence can reduce over-responsibility without forcing a confrontation.",
    thirdNext24Hours:
      "Choose one reply or request that can wait until you feel steadier.",
    thirdNext24HoursWhy:
      "Pausing can protect capacity while keeping the next step respectful.",
    supportRecommendation:
      "Consider trusted-person support, and seek qualified support if the relationship pattern feels unsafe or overwhelming.",
    resourceTopics: ["support", "professional_support", "safety"],
  },
  sleep_energy: {
    harmonyLabel: "Sleep or energy may be affecting the whole picture",
    harmonyExplanation:
      "The conversation suggests energy patterns may influence clarity and readiness.",
    insightTitle: "Energy may be part of the main signal",
    summary: "sleep or energy changes may be shaping how manageable things feel.",
    evidencePoints: [
      "The user named sleep or energy as relevant.",
      "The transcript suggests capacity may shift across the day.",
      "Tracking patterns may help identify a practical support step.",
    ],
    boundaryTitle: "Protect one recovery cue",
    boundaryType: "energy_boundary",
    boundaryInsights: [
      "The boundary may involve giving recovery a more predictable place.",
      "A small routine cue can be easier than trying to fix sleep all at once.",
    ],
    smallExperiment:
      "Choose one low-pressure evening cue, such as dimming lights or setting tomorrow's first step.",
    next24Hours: "Notice the time of day when energy drops most sharply.",
    next7Days: "Track sleep or energy once per day with one short phrase.",
    firstNext24Hours:
      "Choose one low-pressure recovery cue for tonight or tomorrow morning.",
    firstNext24HoursWhy:
      "A repeatable cue can support energy without making the goal too large.",
    thirdNext24Hours:
      "Reduce one optional demand if your energy is already low.",
    thirdNext24HoursWhy:
      "Lowering one demand can make the next step more realistic.",
    supportRecommendation:
      "Use gentle tracking first and consider qualified support if sleep or energy changes continue.",
    resourceTopics: ["support", "professional_support"],
  },
  not_sure: {
    harmonyLabel: "The signal is still forming",
    harmonyExplanation:
      "The conversation suggests the user is still naming what feels off.",
    insightTitle: "Uncertainty itself may be the starting point",
    summary: "the main pattern may not be fully clear yet, and that is workable.",
    evidencePoints: [
      "The user did not need a fixed label to begin reflection.",
      "The transcript offers early clues rather than a complete picture.",
      "A small observation step may be more useful than forcing certainty.",
    ],
    boundaryTitle: "Give the signal room to become clearer",
    boundaryType: "unclear_boundary",
    boundaryInsights: [
      "The boundary may be about not forcing a conclusion too quickly.",
      "A short observation can help the next support step emerge.",
    ],
    smallExperiment:
      "Write down one moment that felt different today and what was happening around it.",
    next24Hours: "Notice one body, mood, or thought signal without trying to label it.",
    next7Days: "Look for one repeating situation, time, or interaction pattern.",
    firstNext24Hours:
      "Write down one moment that felt different and what was happening around it.",
    firstNext24HoursWhy:
      "A single observation can help the signal become clearer without forcing a label.",
    thirdNext24Hours:
      "Share the uncertainty with someone trusted if that feels supportive.",
    thirdNext24HoursWhy:
      "Naming uncertainty can make support easier without needing a finished explanation.",
    supportRecommendation:
      "Continue reflection and consider trusted-person or qualified support if the pattern becomes heavier.",
    resourceTopics: ["support", "professional_support"],
  },
};

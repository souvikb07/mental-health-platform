import { classifyWithAiTriage } from "@/lib/ai/triage";
import { selectResources } from "@/lib/resources/select-resources";
import { classifyPolicyBoundary } from "@/lib/safety/policy-boundary-classifier";
import { getPolicyBoundaryResponse } from "@/lib/safety/policy-boundary-copy";
import { classifyRisk } from "@/lib/safety/risk-classifier";
import { routeSafety } from "@/lib/safety/safety-router";
import {
  adaptTriageSignal,
  mergeTriageCandidate,
} from "@/lib/safety-core/ai-triage-adapter";
import type {
  AiTriageDecisionMetadata,
  SafetyDecision,
  SafetyEvaluationInput,
  SafetyEvaluationOptions,
  SafetyState,
} from "@/lib/safety-core/contracts";
import { getSafetyPlaybook } from "@/lib/safety-core/safety-playbooks";
import { determineSafetyState } from "@/lib/safety-core/safety-state-machine";
import type { PolicyBoundaryResult } from "@/types/policy-boundary";
import type { ApiRiskClassification, SafetyUi } from "@/types/risk";

export async function evaluateSafety({
  message,
  sessionContext,
  previousState,
}: SafetyEvaluationInput, options: SafetyEvaluationOptions = {}): Promise<SafetyDecision> {
  const deterministicRisk = classifyRisk(message);
  const policyBoundaryCandidate = classifyPolicyBoundary(message);
  const deterministicState = determineSafetyState({
    risk: deterministicRisk,
    policyBoundary: policyBoundaryCandidate,
    previousState,
  });
  const aiTriage = await getAiTriageDecision({
    message,
    sessionContext,
    deterministicRisk,
    deterministicState,
    policyBoundaryCandidate,
    classifier: options.aiTriageClassifier ?? classifyWithAiTriage,
    hasInjectedClassifier: Boolean(options.aiTriageClassifier),
  });
  const risk = aiTriage?.risk ?? deterministicRisk;
  const safetyState = aiTriage?.safetyState ?? deterministicState;
  const resolvedPolicyBoundary =
    aiTriage?.policyBoundary ?? policyBoundaryCandidate;
  const playbook = getSafetyPlaybook(safetyState);
  const exposedPolicyBoundary =
    playbook.responseType === "boundary" ||
    (playbook.allowNormalChat && resolvedPolicyBoundary.action === "allow")
      ? resolvedPolicyBoundary
      : undefined;
  const safetyRoute = routeSafety(risk);
  const boundaryResponse = getBoundaryResponse({
    playbookResponseType: playbook.responseType,
    policyBoundary: resolvedPolicyBoundary,
  });
  const safety = getSafetyUi({
    safetyRouteSafety: safetyRoute.safety,
    showSafetyCard: playbook.showSafetyCard,
    playbookState: playbook.state,
    risk,
    boundaryResponse,
  });
  const countryCode = sessionContext?.countryCode ?? "GLOBAL";
  const resources = shouldShowResources({ safetyState, risk, showResources: playbook.showResources })
    ? selectResources({
        countryCode,
        riskLevel: getResourceRiskLevel({ risk, safetyState }),
        categories: getResourceCategories({ risk, safetyState }),
        topic: getResourceTopic({ risk, safetyState }),
      })
    : [];

  return {
    risk,
    safetyState,
    playbook,
    allowNormalChat: playbook.allowNormalChat,
    allowClarityMap: playbook.allowClarityMap,
    nextRecommendedAction: getNextRecommendedAction({ safetyState, risk }),
    mode: getMode({ safetyState, risk }),
    safety,
    resources,
    responseContent: getResponseContent({
      safetyState,
      risk,
      safetyMessage: safety?.message ?? null,
      boundaryResponse,
    }),
    responseSource: getResponseSource(safetyState, exposedPolicyBoundary),
    policyMetadata: {
      action: resolvedPolicyBoundary.action,
      categories: resolvedPolicyBoundary.categories,
    },
    policyBoundary: exposedPolicyBoundary,
    aiTriage: aiTriage?.metadata,
  };
}

async function getAiTriageDecision({
  message,
  sessionContext,
  deterministicRisk,
  deterministicState,
  policyBoundaryCandidate,
  classifier,
  hasInjectedClassifier,
}: {
  message: string;
  sessionContext: SafetyEvaluationInput["sessionContext"];
  deterministicRisk: ApiRiskClassification;
  deterministicState: SafetyState;
  policyBoundaryCandidate: PolicyBoundaryResult;
  classifier: NonNullable<SafetyEvaluationOptions["aiTriageClassifier"]>;
  hasInjectedClassifier: boolean;
}) {
  if (
    !shouldRunAiTriage({
      message,
      deterministicRisk,
      deterministicState,
      policyBoundaryCandidate,
    })
  ) {
    return {
      metadata: {
        available: false,
        used: false,
        escalated: false,
      } satisfies AiTriageDecisionMetadata,
    };
  }

  if (!hasInjectedClassifier && !hasAiTriageConfig()) {
    return {
      metadata: {
        available: false,
        used: false,
        escalated: false,
      } satisfies AiTriageDecisionMetadata,
    };
  }

  const triageResult = await classifier({
    message,
    sessionContext,
    deterministicRisk,
    policyBoundary: policyBoundaryCandidate,
  });

  if (!triageResult.available) {
    return {
      metadata: {
        available: false,
        used: false,
        escalated: false,
      } satisfies AiTriageDecisionMetadata,
    };
  }

  const candidate = adaptTriageSignal(triageResult.signal);
  const merged = mergeTriageCandidate({
    deterministicRisk,
    deterministicState,
    deterministicPolicyBoundary: policyBoundaryCandidate,
    candidate,
  });

  return {
    risk: merged.risk,
    safetyState: merged.safetyState,
    policyBoundary: merged.policyBoundary,
    metadata: {
      available: true,
      used: true,
      escalated: merged.escalated,
      confidence: candidate.confidence,
      rationaleCode: candidate.rationaleCode,
      subject: candidate.subject,
    } satisfies AiTriageDecisionMetadata,
  };
}

export function shouldRunAiTriage({
  message,
  deterministicRisk,
  deterministicState,
  policyBoundaryCandidate,
}: {
  message: string;
  deterministicRisk: ApiRiskClassification;
  deterministicState: SafetyState;
  policyBoundaryCandidate: PolicyBoundaryResult;
}) {
  const meaningfulMessage = message.trim().length >= 8;

  if (!meaningfulMessage) {
    return false;
  }

  if (["high", "imminent"].includes(deterministicRisk.level)) {
    return false;
  }

  if (
    [
      "imminent_risk",
      "active_suicidal_ideation",
      "self_harm_method_request",
      "medical_emergency",
      "harm_to_others",
    ].includes(deterministicState)
  ) {
    return false;
  }

  if (
    policyBoundaryCandidate.categories.some((category) =>
      [
        "diagnosis_request",
        "medication_request",
        "treatment_protocol_request",
        "therapy_replacement_request",
        "prompt_injection",
        "self_harm_method_request",
      ].includes(category),
    )
  ) {
    return false;
  }

  return ["none", "low", "medium"].includes(deterministicRisk.level);
}

function hasAiTriageConfig() {
  return Boolean(
    process.env.OPENAI_API_KEY?.trim() &&
      process.env.OPENAI_TRIAGE_MODEL?.trim(),
  );
}

function shouldShowResources({
  safetyState,
  risk,
  showResources,
}: {
  safetyState: SafetyState;
  risk: ApiRiskClassification;
  showResources: boolean;
}) {
  if (!showResources) {
    return false;
  }

  if (safetyState === "elevated_distress" && risk.categories.length === 0) {
    return false;
  }

  return true;
}

function getSafetyUi({
  safetyRouteSafety,
  showSafetyCard,
  playbookState,
  risk,
  boundaryResponse,
}: {
  safetyRouteSafety: SafetyUi | null;
  showSafetyCard: boolean;
  playbookState: SafetyState;
  risk: ApiRiskClassification;
  boundaryResponse: string | null;
}) {
  if (!showSafetyCard) {
    return null;
  }

  if (playbookState === "policy_boundary") {
    return null;
  }

  if (playbookState === "third_party_self_harm") {
    const tone: SafetyUi["tone"] =
      risk.level === "imminent" ? "urgent" : "support";

    return {
      ...thirdPartySelfHarmSafety,
      message: getThirdPartySelfHarmMessage(risk),
      tone,
    };
  }

  if (playbookState === "self_harm_method_request" && boundaryResponse) {
    return {
      showInlineSafetyCard: true,
      disableNormalNextStep: true,
      title: "Immediate support",
      message: boundaryResponse,
      tone: "urgent" as const,
    };
  }

  return safetyRouteSafety;
}

function getBoundaryResponse({
  playbookResponseType,
  policyBoundary,
}: {
  playbookResponseType: string;
  policyBoundary: PolicyBoundaryResult;
}) {
  if (
    playbookResponseType !== "boundary" &&
    !policyBoundary.categories.includes("self_harm_method_request")
  ) {
    return null;
  }

  if (policyBoundary.action === "allow") {
    return null;
  }

  return getPolicyBoundaryResponse(policyBoundary);
}

function getResponseContent({
  safetyState,
  risk,
  safetyMessage,
  boundaryResponse,
}: {
  safetyState: SafetyState;
  risk: ApiRiskClassification;
  safetyMessage: string | null;
  boundaryResponse: string | null;
}) {
  if (safetyState === "policy_boundary") {
    return boundaryResponse;
  }

  if (safetyState === "self_harm_method_request") {
    return boundaryResponse ?? safetyMessage;
  }

  if (safetyState === "third_party_self_harm") {
    return getThirdPartySelfHarmMessage(risk);
  }

  return safetyMessage;
}

function getResponseSource(
  safetyState: SafetyState,
  policyBoundary: PolicyBoundaryResult | undefined,
) {
  if (policyBoundary?.action === "answer_with_boundary") {
    return "boundary" as const;
  }

  if (blocksNormalChat(safetyState)) {
    return "safety" as const;
  }

  return null;
}

function getNextRecommendedAction({
  safetyState,
  risk,
}: {
  safetyState: SafetyState;
  risk: ApiRiskClassification;
}) {
  if (safetyState === "third_party_self_harm" && risk.level === "imminent") {
    return "urgent_support" as const;
  }

  return getSafetyPlaybook(safetyState).nextRecommendedAction;
}

function getMode({
  safetyState,
  risk,
}: {
  safetyState: SafetyState;
  risk: ApiRiskClassification;
}) {
  if (safetyState === "third_party_self_harm" && risk.level === "imminent") {
    return "crisis" as const;
  }

  return getSafetyPlaybook(safetyState).mode;
}

function blocksNormalChat(state: SafetyState) {
  return !getSafetyPlaybook(state).allowNormalChat;
}

function getResourceRiskLevel({
  risk,
  safetyState,
}: {
  risk: ApiRiskClassification;
  safetyState: SafetyState;
}) {
  return safetyState === "self_harm_method_request" ? "imminent" : risk.level;
}

function getResourceCategories({
  risk,
  safetyState,
}: {
  risk: ApiRiskClassification;
  safetyState: SafetyState;
}) {
  return safetyState === "self_harm_method_request"
    ? ["self_harm" as const]
    : risk.categories;
}

function getResourceTopic({
  risk,
  safetyState,
}: {
  risk: ApiRiskClassification;
  safetyState: SafetyState;
}) {
  const playbookTopics = getSafetyPlaybook(safetyState).resourceTopics;

  return playbookTopics[0] ?? risk.resourceTopics?.[0];
}

export const safetyOrchestrator = {
  evaluate: evaluateSafety,
};

const thirdPartySelfHarmSafety = {
  showInlineSafetyCard: true,
  disableNormalNextStep: true,
  title: "Support for someone else",
  message:
    "That sounds serious. If this person may be in immediate danger, contact local emergency services or a trusted person near them. If you can, stay connected with them and encourage immediate support.",
  tone: "support" as const,
};

function getThirdPartySelfHarmMessage(risk: ApiRiskClassification) {
  if (risk.level === "imminent") {
    return "That sounds urgent. If this person may be in immediate danger, contact local emergency services or a local crisis line now. If you can do so safely, stay connected with them and involve a trusted person nearby.";
  }

  return thirdPartySelfHarmSafety.message;
}

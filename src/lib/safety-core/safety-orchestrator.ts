import { selectResources } from "@/lib/resources/select-resources";
import { classifyPolicyBoundary } from "@/lib/safety/policy-boundary-classifier";
import { getPolicyBoundaryResponse } from "@/lib/safety/policy-boundary-copy";
import { classifyRisk } from "@/lib/safety/risk-classifier";
import { routeSafety } from "@/lib/safety/safety-router";
import type {
  SafetyDecision,
  SafetyEvaluationInput,
  SafetyState,
} from "@/lib/safety-core/contracts";
import { getSafetyPlaybook } from "@/lib/safety-core/safety-playbooks";
import { determineSafetyState } from "@/lib/safety-core/safety-state-machine";
import type { PolicyBoundaryResult } from "@/types/policy-boundary";
import type { ApiRiskClassification, SafetyUi } from "@/types/risk";

export function evaluateSafety({
  message,
  sessionContext,
  previousState,
}: SafetyEvaluationInput): SafetyDecision {
  const risk = classifyRisk(message);
  const policyBoundaryCandidate = classifyPolicyBoundary(message);
  const safetyState = determineSafetyState({
    risk,
    policyBoundary: policyBoundaryCandidate,
    previousState,
  });
  const playbook = getSafetyPlaybook(safetyState);
  const exposedPolicyBoundary =
    playbook.responseType === "boundary" ||
    (playbook.allowNormalChat && policyBoundaryCandidate.action === "allow")
      ? policyBoundaryCandidate
      : undefined;
  const safetyRoute = routeSafety(risk);
  const boundaryResponse = getBoundaryResponse({
    playbookResponseType: playbook.responseType,
    policyBoundary: policyBoundaryCandidate,
  });
  const safety = getSafetyUi({
    safetyRouteSafety: safetyRoute.safety,
    showSafetyCard: playbook.showSafetyCard,
    playbookState: playbook.state,
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
    nextRecommendedAction: playbook.nextRecommendedAction,
    mode: playbook.mode,
    safety,
    resources,
    responseContent: getResponseContent({
      safetyState,
      safetyMessage: safety?.message ?? null,
      boundaryResponse,
    }),
    responseSource: getResponseSource(safetyState, exposedPolicyBoundary),
    policyBoundary: exposedPolicyBoundary,
  };
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
  boundaryResponse,
}: {
  safetyRouteSafety: SafetyUi | null;
  showSafetyCard: boolean;
  playbookState: SafetyState;
  boundaryResponse: string | null;
}) {
  if (!showSafetyCard) {
    return null;
  }

  if (playbookState === "policy_boundary") {
    return null;
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
  safetyMessage,
  boundaryResponse,
}: {
  safetyState: SafetyState;
  safetyMessage: string | null;
  boundaryResponse: string | null;
}) {
  if (safetyState === "policy_boundary") {
    return boundaryResponse;
  }

  if (safetyState === "self_harm_method_request") {
    return boundaryResponse ?? safetyMessage;
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

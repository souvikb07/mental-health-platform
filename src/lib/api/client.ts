import type { ClarityMap, StructuredClarityMap } from "@/types/clarity-map";
import type { ContextIntakeResult } from "@/lib/ai/context-intake/context-intake-schema";
import type { FeedbackSubmission } from "@/types/feedback";
import type { SafetyState } from "@/lib/safety-core";
import type { PolicyBoundaryResult } from "@/types/policy-boundary";
import type {
  ApiChatMessage,
  ApiRiskClassification,
  NextRecommendedAction,
  SafetyMode,
  SafetyUi,
} from "@/types/risk";
import type { SupportResource } from "@/types/resource";
import type {
  CountryCode,
  MainConcernCategory,
  SessionContext,
} from "@/types/session-context";

type ApiError = {
  error: {
    code: string;
    message: string;
  };
};

export type CreateSessionInput = {
  country: string;
  ageBand?: string;
  ageConfirmed?: boolean;
  consentAccepted?: boolean;
  mainConcern?: string;
  mainConcernCategory: MainConcernCategory;
  mainConcernText?: string;
  storageConsentAccepted?: boolean;
};

export type CreateSessionResponse = {
  sessionId: string;
  sessionContext: SessionContext;
  status: "created";
  storageConsentAccepted: boolean;
  serverOwned: boolean;
  expiresAt?: string;
};

export type ChatResponse = {
  assistantMessage: ApiChatMessage;
  risk: ApiRiskClassification;
  nextRecommendedAction: NextRecommendedAction;
  mode: SafetyMode;
  safety: SafetyUi | null;
  resources: SupportResource[];
  source?: "openai" | "fallback" | "safety" | "boundary";
  policyBoundary?: PolicyBoundaryResult;
  safetyState?: SafetyState;
  persistenceStatus?: "unavailable";
};

export type ContextIntakeResponse =
  | {
      type: "opener";
      assistantMessage: ApiChatMessage;
      contextIntake: ContextIntakeResult;
      source: "openai" | "fallback";
    }
  | {
      type: "safety";
      assistantMessage: ApiChatMessage;
      risk: ApiRiskClassification;
      safety: SafetyUi | null;
      resources: SupportResource[];
      source: "safety";
      persistenceStatus?: "unavailable";
    }
  | {
      type: "boundary";
      assistantMessage: ApiChatMessage;
      policyBoundary: PolicyBoundaryResult;
      source: "boundary";
      persistenceStatus?: "unavailable";
    };

export type ClarityMapResponse = {
  clarityMap: ClarityMap;
};

export type EnhancedClarityMapInput = {
  sessionId: string;
  sessionContext: SessionContext;
  messages: ApiChatMessage[];
  lastRisk?: ApiRiskClassification;
  lastSafetyState?: SafetyState;
};

export type EnhancedClarityMapResponse =
  | {
      type: "clarity_map";
      source: "openai" | "fallback";
      clarityMap: StructuredClarityMap;
    }
  | {
      type: "safety_blocked";
      source: "safety";
      assistantMessage: ApiChatMessage;
      risk: ApiRiskClassification;
      safety: SafetyUi | null;
      resources: SupportResource[];
    }
  | {
      type: "boundary_blocked";
      source: "boundary";
      assistantMessage: ApiChatMessage;
      policyBoundary: PolicyBoundaryResult;
    }
  | {
      type: "insufficient_context";
      source: "fallback";
      message: string;
    };

export type ClarityMapApiResponse =
  | ClarityMapResponse
  | EnhancedClarityMapResponse;

export type ResourcesResponse = {
  resources: SupportResource[];
};

export type FeedbackResponse = {
  status: "received";
};

export function createSession(input: CreateSessionInput) {
  return postJson<CreateSessionResponse>("/api/sessions", input);
}

export function sendChatMessage(input: {
  sessionId: string;
  message: string;
  clientMessageId?: string;
  sessionContext?: SessionContext;
}) {
  return postJson<ChatResponse>("/api/chat", input);
}

export function fetchContextIntake(input: { sessionContext: SessionContext }) {
  return postJson<ContextIntakeResponse>("/api/context-intake", input);
}

export function fetchClarityMap(input: { sessionId: string }) {
  return postJson<ClarityMapResponse>("/api/clarity-map", input);
}

export function fetchEnhancedClarityMap(input: EnhancedClarityMapInput) {
  return postJson<EnhancedClarityMapResponse>("/api/clarity-map", input);
}

export function fetchResources(query: {
  country?: string;
  countryCode?: CountryCode;
  topic?: string;
  riskLevel?: string;
} = {}) {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  const path = params.size > 0 ? `/api/resources?${params}` : "/api/resources";

  return getJson<ResourcesResponse>(path);
}

export function submitFeedback(input: FeedbackSubmission) {
  return postJson<FeedbackResponse>("/api/feedback", input);
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(path, {
    cache: "no-store",
  });

  return parseJsonResponse<T>(response);
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return parseJsonResponse<T>(response);
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const payload: unknown = await response.json();

  if (!response.ok) {
    throw new Error(
      isApiError(payload)
        ? payload.error.message
        : "Request failed.",
    );
  }

  return payload as T;
}

function isApiError(payload: unknown): payload is ApiError {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof (payload as ApiError).error?.message === "string"
  );
}

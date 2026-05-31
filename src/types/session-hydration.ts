import type { StructuredClarityMap } from "@/types/clarity-map";
import type { ApiRiskClassification, SafetyUi } from "@/types/risk";
import type { SupportResource } from "@/types/resource";
import type { SessionContext } from "@/types/session-context";

export type HydratedJourneyChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  createdAt: string;
  source?: "openai" | "fallback" | "safety" | "boundary";
  risk?: Pick<ApiRiskClassification, "level">;
  safety?: SafetyUi | null;
  resources?: SupportResource[];
};

export type HydratedClarityMapResponse = {
  type: "clarity_map";
  source: "openai" | "fallback";
  clarityMap: StructuredClarityMap;
};

export type SessionHydrationResponse =
  | { status: "unavailable" }
  | { status: "empty" }
  | {
      status: "hydrated";
      serverOwned: true;
      expiresAt: string;
      retainedContentHydrated: boolean;
      sessionContext: SessionContext;
      messages: HydratedJourneyChatMessage[];
      clarityMap?: HydratedClarityMapResponse;
    };

import { fetchSessionHydration } from "@/lib/api/client";
import {
  loadSessionContext,
  removeGeneratedClarityMap,
  saveChatMessages,
  saveChatMeta,
  saveGeneratedClarityMap,
  saveSessionContext,
} from "@/lib/session/journey-storage";
import type { JourneyChatMessage } from "@/lib/session/journey-storage";
import type { SessionHydrationResponse } from "@/types/session-hydration";

export async function hydrateCurrentJourney(
  input: { sessionId?: string } = {},
): Promise<SessionHydrationResponse | null> {
  if (input.sessionId && !isUuid(input.sessionId)) {
    return null;
  }

  let response: SessionHydrationResponse;

  try {
    response = await fetchSessionHydration(input.sessionId);
  } catch {
    return null;
  }

  if (response.status !== "hydrated") {
    return response;
  }

  if (!response.retainedContentHydrated) {
    saveSessionContext(mergeOptedOutSessionContext(response.sessionContext));
    return response;
  }

  saveSessionContext(response.sessionContext);
  saveChatMessages(response.sessionContext.sessionId, response.messages);
  saveChatMeta(
    response.sessionContext.sessionId,
    buildHydratedChatMeta(response.messages),
  );

  if (response.clarityMap) {
    saveGeneratedClarityMap(response.sessionContext.sessionId, response.clarityMap);
  } else {
    removeGeneratedClarityMap(response.sessionContext.sessionId);
  }

  return response;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function mergeOptedOutSessionContext(
  serverContext: Extract<
    SessionHydrationResponse,
    { status: "hydrated" }
  >["sessionContext"],
) {
  const cachedContext = loadSessionContext();

  if (cachedContext?.sessionId !== serverContext.sessionId) {
    return serverContext;
  }

  return {
    ...serverContext,
    ageBand: cachedContext.ageBand,
    mainConcern: cachedContext.mainConcern,
    mainConcernText: cachedContext.mainConcernText,
  };
}

function buildHydratedChatMeta(messages: JourneyChatMessage[]) {
  return {
    updatedAt: new Date().toISOString(),
    messageCount: messages.length,
    normalNextStepDisabled: messages.some(
      (item) => item.safety?.disableNormalNextStep,
    ),
    clarityNotice: null,
  };
}

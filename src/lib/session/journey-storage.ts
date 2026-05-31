import type { ApiRiskClassification } from "@/types/risk";
import type { SessionContext } from "@/types/session-context";
import type {
  HydratedClarityMapResponse,
  HydratedJourneyChatMessage,
} from "@/types/session-hydration";

export const JOURNEY_SESSION_CONTEXT_KEY = "mindbridge:session-context";
export const JOURNEY_LAST_SESSION_ID_KEY = "mindbridge:last-session-id";
export const JOURNEY_CHAT_KEY_PREFIX = "mindbridge:chat:";
export const JOURNEY_CHAT_META_KEY_PREFIX = "mindbridge:chat-meta:";
export const JOURNEY_CLARITY_MAP_KEY_PREFIX = "mindbridge:clarity-map:";
export const JOURNEY_LAST_CLARITY_MAP_SESSION_KEY =
  "mindbridge:last-clarity-map-session";
export const LEGACY_JOURNEY_SESSION_CONTEXT_KEY = "mindbridge.sessionContext";
export const LEGACY_JOURNEY_LAST_SESSION_ID_KEY = "mindbridge.sessionId";

export type JourneyChatMessage = HydratedJourneyChatMessage;

export type JourneyChatMeta = {
  updatedAt: string;
  messageCount: number;
  normalNextStepDisabled: boolean;
  clarityNotice?: string | null;
};

export function saveSessionContext(sessionContext: SessionContext) {
  const storage = getSessionStorage();

  if (!storage) {
    return;
  }

  safeSetItem(
    storage,
    JOURNEY_SESSION_CONTEXT_KEY,
    JSON.stringify(sessionContext),
  );
  safeSetItem(storage, JOURNEY_LAST_SESSION_ID_KEY, sessionContext.sessionId);
}

export function loadSessionContext(): SessionContext | undefined {
  const stored = getSessionStorage()?.getItem(JOURNEY_SESSION_CONTEXT_KEY);
  const parsed = normalizeSessionContext(safeParseJson(stored));

  if (parsed) {
    return parsed;
  }

  const legacyStored = getLocalStorage()?.getItem(
    LEGACY_JOURNEY_SESSION_CONTEXT_KEY,
  );
  const legacyParsed = normalizeSessionContext(safeParseJson(legacyStored));

  if (legacyParsed) {
    saveSessionContext(legacyParsed);
    return legacyParsed;
  }

  return undefined;
}

export function saveLastSessionId(sessionId: string) {
  if (!sessionId.trim()) {
    return;
  }

  safeSetItem(getSessionStorage(), JOURNEY_LAST_SESSION_ID_KEY, sessionId);
}

export function loadLastSessionId(): string | undefined {
  const sessionId =
    getSessionStorage()?.getItem(JOURNEY_LAST_SESSION_ID_KEY) ??
    getLocalStorage()?.getItem(LEGACY_JOURNEY_LAST_SESSION_ID_KEY) ??
    undefined;

  return sessionId?.trim() || undefined;
}

export function getChatStorageKey(sessionId: string) {
  return `${JOURNEY_CHAT_KEY_PREFIX}${sessionId}`;
}

export function getChatMetaStorageKey(sessionId: string) {
  return `${JOURNEY_CHAT_META_KEY_PREFIX}${sessionId}`;
}

export function saveChatMessages(
  sessionId: string,
  messages: JourneyChatMessage[],
) {
  if (!sessionId.trim()) {
    return;
  }

  safeSetItem(
    getSessionStorage(),
    getChatStorageKey(sessionId),
    JSON.stringify(messages),
  );
}

export function loadChatMessages(sessionId: string): JourneyChatMessage[] {
  if (!sessionId.trim()) {
    return [];
  }

  const stored = getSessionStorage()?.getItem(getChatStorageKey(sessionId));
  const parsed = safeParseJson(stored);

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.flatMap((item) => {
    const message = normalizeChatMessage(item);
    return message ? [message] : [];
  });
}

export function saveChatMeta(sessionId: string, meta: JourneyChatMeta) {
  if (!sessionId.trim()) {
    return;
  }

  safeSetItem(
    getSessionStorage(),
    getChatMetaStorageKey(sessionId),
    JSON.stringify(meta),
  );
}

export function loadChatMeta(sessionId: string): JourneyChatMeta | undefined {
  if (!sessionId.trim()) {
    return undefined;
  }

  const parsed = safeParseJson(
    getSessionStorage()?.getItem(getChatMetaStorageKey(sessionId)),
  );

  if (typeof parsed !== "object" || parsed === null) {
    return undefined;
  }

  const meta = parsed as Partial<JourneyChatMeta>;

  if (
    typeof meta.updatedAt !== "string" ||
    typeof meta.messageCount !== "number" ||
    typeof meta.normalNextStepDisabled !== "boolean"
  ) {
    return undefined;
  }

  return {
    updatedAt: meta.updatedAt,
    messageCount: meta.messageCount,
    normalNextStepDisabled: meta.normalNextStepDisabled,
    clarityNotice:
      typeof meta.clarityNotice === "string" ? meta.clarityNotice : null,
  };
}

export function getClarityMapStorageKey(sessionId: string) {
  return `${JOURNEY_CLARITY_MAP_KEY_PREFIX}${sessionId}`;
}

export function saveGeneratedClarityMap(
  sessionId: string,
  response: HydratedClarityMapResponse,
) {
  if (!sessionId.trim()) {
    return;
  }

  safeSetItem(
    getSessionStorage(),
    getClarityMapStorageKey(sessionId),
    JSON.stringify(response),
  );
  safeSetItem(
    getSessionStorage(),
    JOURNEY_LAST_CLARITY_MAP_SESSION_KEY,
    sessionId,
  );
}

export function loadGeneratedClarityMap(
  sessionId?: string | null,
): HydratedClarityMapResponse | undefined {
  const storage = getSessionStorage();
  const resolvedSessionId =
    sessionId ?? storage?.getItem(JOURNEY_LAST_CLARITY_MAP_SESSION_KEY);

  if (!storage || !resolvedSessionId) {
    return undefined;
  }

  const parsed = safeParseJson(
    storage.getItem(getClarityMapStorageKey(resolvedSessionId)),
  ) as Partial<HydratedClarityMapResponse> | undefined;

  if (
    parsed?.type === "clarity_map" &&
    (parsed.source === "openai" || parsed.source === "fallback") &&
    parsed.clarityMap
  ) {
    return parsed as HydratedClarityMapResponse;
  }

  return undefined;
}

export function removeGeneratedClarityMap(sessionId: string) {
  const storage = getSessionStorage();

  if (!storage) {
    return;
  }

  storage.removeItem(getClarityMapStorageKey(sessionId));

  if (storage.getItem(JOURNEY_LAST_CLARITY_MAP_SESSION_KEY) === sessionId) {
    storage.removeItem(JOURNEY_LAST_CLARITY_MAP_SESSION_KEY);
  }
}

export function clearCurrentJourneyPointers() {
  const storage = getSessionStorage();

  if (!storage) {
    return;
  }

  storage.removeItem(JOURNEY_SESSION_CONTEXT_KEY);
  storage.removeItem(JOURNEY_LAST_SESSION_ID_KEY);
}

export function clearAllJourneyStorage() {
  const sessionStorage = getSessionStorage();

  if (sessionStorage) {
    for (const key of getStorageKeys(sessionStorage)) {
      if (
        key === JOURNEY_SESSION_CONTEXT_KEY ||
        key === JOURNEY_LAST_SESSION_ID_KEY ||
        key === JOURNEY_LAST_CLARITY_MAP_SESSION_KEY ||
        key.startsWith(JOURNEY_CHAT_KEY_PREFIX) ||
        key.startsWith(JOURNEY_CHAT_META_KEY_PREFIX) ||
        key.startsWith(JOURNEY_CLARITY_MAP_KEY_PREFIX)
      ) {
        sessionStorage.removeItem(key);
      }
    }
  }

  const localStorage = getLocalStorage();
  localStorage?.removeItem(LEGACY_JOURNEY_SESSION_CONTEXT_KEY);
  localStorage?.removeItem(LEGACY_JOURNEY_LAST_SESSION_ID_KEY);
}

function normalizeSessionContext(payload: unknown): SessionContext | undefined {
  if (typeof payload !== "object" || payload === null) {
    return undefined;
  }

  const sessionContext = payload as Partial<SessionContext>;

  if (
    typeof sessionContext.sessionId !== "string" ||
    !sessionContext.sessionId.trim()
  ) {
    return undefined;
  }

  if (!["US", "IN", "GLOBAL"].includes(String(sessionContext.countryCode))) {
    return undefined;
  }

  return sessionContext as SessionContext;
}

function normalizeChatMessage(payload: unknown): JourneyChatMessage | undefined {
  if (typeof payload !== "object" || payload === null) {
    return undefined;
  }

  const message = payload as Partial<JourneyChatMessage>;

  if (
    typeof message.id !== "string" ||
    (message.role !== "assistant" && message.role !== "user") ||
    typeof message.content !== "string"
  ) {
    return undefined;
  }

  return {
    id: message.id,
    role: message.role,
    content: message.content,
    createdAt: normalizeCreatedAt(message.createdAt),
    source: normalizeSource(message.source),
    risk: normalizeRisk(message.risk),
    safety: message.safety ?? null,
    resources: Array.isArray(message.resources) ? message.resources : undefined,
  };
}

function normalizeSource(source: unknown) {
  return source === "openai" ||
    source === "fallback" ||
    source === "safety" ||
    source === "boundary"
    ? source
    : undefined;
}

function normalizeRisk(risk: unknown) {
  if (typeof risk !== "object" || risk === null) {
    return undefined;
  }

  const level = (risk as Partial<Pick<ApiRiskClassification, "level">>).level;
  const validLevels: ApiRiskClassification["level"][] = [
    "none",
    "low",
    "medium",
    "high",
    "imminent",
  ];

  return typeof level === "string" && validLevels.includes(level)
    ? { level }
    : undefined;
}

function normalizeCreatedAt(createdAt: unknown) {
  if (typeof createdAt === "string" && !Number.isNaN(Date.parse(createdAt))) {
    return createdAt;
  }

  return new Date().toISOString();
}

function safeParseJson(stored: string | null | undefined) {
  if (!stored) {
    return undefined;
  }

  try {
    return JSON.parse(stored);
  } catch {
    return undefined;
  }
}

function safeSetItem(
  storage: Storage | null | undefined,
  key: string,
  value: string,
) {
  try {
    storage?.setItem(key, value);
  } catch {
    return;
  }
}

function getStorageKeys(storage: Storage) {
  return Array.from({ length: storage.length }, (_, index) => storage.key(index))
    .filter((key): key is string => typeof key === "string");
}

function getSessionStorage() {
  try {
    return typeof window !== "undefined" && window.sessionStorage
      ? window.sessionStorage
      : null;
  } catch {
    return null;
  }
}

function getLocalStorage() {
  try {
    return typeof window !== "undefined" && window.localStorage
      ? window.localStorage
      : null;
  } catch {
    return null;
  }
}

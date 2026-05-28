"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import {
  AlertTriangle,
  ArrowRight,
  LifeBuoy,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { ResourceCard } from "@/components/product/resource-card";
import { SafetyNotice } from "@/components/product/safety-notice";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  fetchEnhancedClarityMap,
  fetchContextIntake,
  sendChatMessage,
  type ContextIntakeResponse,
  type EnhancedClarityMapResponse,
} from "@/lib/api/client";
import { cn } from "@/lib/utils";
import type {
  ApiChatMessage,
  ApiRiskClassification,
  SafetyUi,
} from "@/types/risk";
import type { SupportResource } from "@/types/resource";
import type { SessionContext } from "@/types/session-context";

type UiMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  createdAt: string;
  source?: "openai" | "fallback" | "safety" | "boundary";
  risk?: Pick<ApiRiskClassification, "level">;
  safety?: SafetyUi | null;
  resources?: SupportResource[];
};

export function ChatPanel() {
  const router = useRouter();
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [clarityNotice, setClarityNotice] = useState<string | null>(null);
  const [sessionContext, setSessionContext] = useState<SessionContext | null>(
    null,
  );
  const [isContextLoading, setIsContextLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingClarity, setIsGeneratingClarity] = useState(false);
  const normalNextStepDisabled = messages.some(
    (item) => item.safety?.disableNormalNextStep,
  );

  useEffect(() => {
    let isMounted = true;

    async function loadContextOpener() {
      const storedSessionContext = getStoredSessionContext();

      if (!storedSessionContext) {
        if (isMounted) {
          setSessionContext(null);
          setIsContextLoading(false);
        }
        return;
      }

      if (isMounted) {
        setSessionContext(storedSessionContext);
      }

      const storageKey = getContextOpenerStorageKey(
        storedSessionContext.sessionId,
      );
      const storedOpener = getStoredContextOpener(storageKey);

      if (storedOpener) {
        if (isMounted) {
          setMessages([storedOpener]);
          setIsContextLoading(false);
        }
        return;
      }

      try {
        const response = await fetchContextIntake({
          sessionContext: storedSessionContext,
        });
        const openerMessage = toUiMessage(response);
        storeContextOpener(storageKey, openerMessage);

        if (isMounted) {
          setMessages([openerMessage]);
        }
      } catch {
        if (isMounted) {
          setError(
            "We could not start this chat. Please return to onboarding and try again.",
          );
        }
      } finally {
        if (isMounted) {
          setIsContextLoading(false);
        }
      }
    }

    void loadContextOpener();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
      <section className="mindbridge-ambient-shadow overflow-hidden rounded-[2rem] border border-border/60 bg-card">
        <div className="border-b border-border/60 bg-muted/70 p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-primary">
                Guided reflection
              </p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">
                Talk through what feels off.
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Responses are based only on this conversation. Safety and
                product-boundary messages stay visible when they appear.
              </p>
            </div>
            <Button
              asChild
              variant="outline"
              className="h-10 rounded-full border-border/80 bg-card px-4 text-foreground hover:bg-background"
            >
              <Link href="/resources">
                <LifeBuoy className="size-4" aria-hidden="true" />
                Support
              </Link>
            </Button>
          </div>
          <div className="mt-5">
            <div className="mb-2 flex justify-between text-xs text-muted-foreground">
              <span>Reflection progress</span>
              <span>Step 4 of 7</span>
            </div>
            <Progress
              value={58}
              className="bg-background [&_[data-slot=progress-indicator]]:bg-primary"
            />
          </div>
        </div>
        <div
          className="space-y-5 bg-background/35 p-5 sm:p-6"
          aria-live="polite"
        >
          {!isContextLoading && !sessionContext ? (
            <div className="rounded-3xl border border-border/60 bg-card p-5 text-sm leading-6 text-muted-foreground shadow-sm">
              <p className="font-semibold text-foreground">
                Start with onboarding first.
              </p>
              <p className="mt-1">
                MindBridge uses your support location and main reason to start
                the guided chat safely.
              </p>
              <Button
                asChild
                className="mt-4 h-10 rounded-full bg-primary px-4 text-primary-foreground hover:bg-primary/90"
              >
                <Link href="/onboarding">Go to onboarding</Link>
              </Button>
            </div>
          ) : null}
          {isContextLoading ? (
            <div className="flex max-w-[90%] items-end gap-3 sm:max-w-[82%]">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Sparkles className="size-4" aria-hidden="true" />
              </span>
              <div className="mindbridge-ambient-shadow rounded-3xl rounded-bl-md bg-card px-4 py-3 text-sm leading-6 text-muted-foreground">
                Preparing your guided chat...
              </div>
            </div>
          ) : null}
          {messages.map((item) => (
            <ChatMessageBubble key={item.id} item={item} />
          ))}
        </div>
        {sessionContext ? (
          <form
            className="border-t border-border/60 bg-card p-5 sm:p-6"
            onSubmit={async (event) => {
              event.preventDefault();

              const trimmedMessage = message.trim();
              if (!trimmedMessage) {
                return;
              }

              setError(null);
              setClarityNotice(null);
              setIsSubmitting(true);
              setMessage("");

              const createdAt = new Date().toISOString();
              const userMessage: UiMessage = {
                id: `mock_user_${Date.now()}`,
                role: "user",
                content: trimmedMessage,
                createdAt,
              };
              setMessages((current) => [...current, userMessage]);

              try {
                const activeSessionContext =
                  sessionContext ?? getStoredSessionContext();
                const sessionId =
                  activeSessionContext?.sessionId ??
                  getLocalStorage()?.getItem("mindbridge.sessionId") ??
                  "mock_session_demo";
                const response = await sendChatMessage({
                  sessionId,
                  message: trimmedMessage,
                  sessionContext: activeSessionContext,
                });

                setMessages((current) => [
                  ...current,
                  {
                    id: response.assistantMessage.id,
                    role: response.assistantMessage.role,
                    content: response.assistantMessage.content,
                    createdAt: response.assistantMessage.createdAt,
                    source: response.source,
                    risk: { level: response.risk.level },
                    safety: response.safety,
                    resources: response.resources,
                  },
                ]);
              } catch {
                setError("The chat service did not respond. Please try again.");
              } finally {
                setIsSubmitting(false);
              }
            }}
          >
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-foreground">
                Your message
              </span>
              <Textarea
                className="min-h-24 rounded-3xl border-border/70 bg-background/70 px-4 py-3 text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/30"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Share a little more when you're ready."
              />
            </label>
            {error ? (
              <p className="mt-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm leading-6 text-destructive">
                {error}
              </p>
            ) : null}
            {clarityNotice ? (
              <div className="mt-3 rounded-2xl border border-amber-900/20 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
                <p className="font-semibold">A little more context will help.</p>
                <p className="mt-1">{clarityNotice}</p>
              </div>
            ) : null}
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-6 text-muted-foreground">
                Every submitted message crosses the internal safety boundary.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="submit"
                  disabled={isSubmitting || isContextLoading}
                  variant="outline"
                  className="h-11 rounded-full border-border/80 bg-card px-4 text-foreground hover:bg-muted"
                >
                  {isSubmitting ? "Sending..." : "Send message"}
                  <Send className="size-4" aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  disabled={
                    normalNextStepDisabled ||
                    isGeneratingClarity ||
                    isContextLoading
                  }
                  onClick={() => {
                    void handleGenerateClarityMap({
                      messages,
                      sessionContext,
                      setClarityNotice,
                      setError,
                      setIsGeneratingClarity,
                      setMessages,
                      routerPush: router.push,
                    });
                  }}
                  className="h-11 rounded-full bg-primary px-4 text-primary-foreground shadow-sm hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground"
                >
                  {normalNextStepDisabled ? (
                    <span>Clarity map paused for safety</span>
                  ) : isGeneratingClarity ? (
                    <span>Generating...</span>
                  ) : (
                    <>
                      Generate clarity map
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </>
                  )}
                </Button>
              </div>
            </div>
            {normalNextStepDisabled ? (
              <p className="mt-3 rounded-2xl border border-amber-900/20 bg-amber-50 p-3 text-xs leading-6 text-amber-900">
                Safety support is the priority right now, so the normal next
                step is paused.
              </p>
            ) : null}
          </form>
        ) : null}
      </section>
      <aside className="grid content-start gap-4">
        <div className="rounded-3xl border border-border/60 bg-card p-4 shadow-sm">
          <p className="text-sm font-semibold text-foreground">
            Reflection guardrails
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            MindBridge can support reflection and support options. It is
            non-diagnostic and not a crisis service.
          </p>
        </div>
        <SafetyNotice />
        <SafetyNotice tone="urgent" />
      </aside>
    </div>
  );
}

async function handleGenerateClarityMap(input: {
  messages: UiMessage[];
  sessionContext: SessionContext | null;
  setClarityNotice: (message: string | null) => void;
  setError: (message: string | null) => void;
  setIsGeneratingClarity: (isGenerating: boolean) => void;
  setMessages: Dispatch<SetStateAction<UiMessage[]>>;
  routerPush: (href: string) => void;
}) {
  const {
    messages,
    sessionContext,
    setClarityNotice,
    setError,
    setIsGeneratingClarity,
    setMessages,
    routerPush,
  } = input;

  if (!sessionContext) {
    setError("Please start with onboarding before generating a Clarity Map.");
    return;
  }

  setError(null);
  setClarityNotice(null);
  setIsGeneratingClarity(true);

  try {
    const response = await fetchEnhancedClarityMap({
      sessionId: sessionContext.sessionId,
      sessionContext,
      messages: messages.map(toApiChatMessage),
    });

    if (response.type === "clarity_map") {
      storeGeneratedClarityMap(sessionContext.sessionId, response);
      routerPush(
        `/clarity-map?sessionId=${encodeURIComponent(sessionContext.sessionId)}`,
      );
      return;
    }

    if (response.type === "insufficient_context") {
      setClarityNotice(response.message);
      return;
    }

    if (response.type === "safety_blocked") {
      setMessages((current) => [
        ...current,
        {
          id: response.assistantMessage.id,
          role: response.assistantMessage.role,
          content: response.assistantMessage.content,
          createdAt: response.assistantMessage.createdAt,
          source: response.source,
          risk: { level: response.risk.level },
          safety: response.safety,
          resources: response.resources,
        },
      ]);
      return;
    }

    setMessages((current) => [
      ...current,
      {
        id: response.assistantMessage.id,
        role: response.assistantMessage.role,
        content: response.assistantMessage.content,
        createdAt: response.assistantMessage.createdAt,
        source: response.source,
      },
    ]);
  } catch {
    setError("We could not generate a Clarity Map right now. Please try again.");
  } finally {
    setIsGeneratingClarity(false);
  }
}

function ChatMessageBubble({ item }: { item: UiMessage }) {
  const isUser = item.role === "user";
  const isBoundary = item.source === "boundary";
  const isSafety = item.source === "safety" || item.safety?.showInlineSafetyCard;

  return (
    <div
      className={cn(
        "flex w-full gap-3",
        isUser ? "justify-end" : "justify-start",
      )}
    >
      {!isUser ? (
        <span
          className={cn(
            "mt-auto flex size-8 shrink-0 items-center justify-center rounded-full",
            isSafety
              ? "bg-destructive/10 text-destructive"
              : isBoundary
                ? "bg-amber-100 text-amber-900"
                : "bg-primary text-primary-foreground",
          )}
        >
          {isSafety ? (
            <ShieldCheck className="size-4" aria-hidden="true" />
          ) : (
            <Sparkles className="size-4" aria-hidden="true" />
          )}
        </span>
      ) : null}
      <div
        className={cn(
          "max-w-[calc(100%_-_2.75rem)] break-words rounded-3xl px-4 py-3 text-sm leading-6 shadow-sm sm:max-w-[78%]",
          isUser
            ? "rounded-br-md bg-primary text-primary-foreground"
            : isBoundary
              ? "rounded-bl-md border border-amber-900/20 bg-amber-50 text-amber-950"
              : isSafety
                ? "rounded-bl-md border border-destructive/25 bg-destructive/10 text-foreground"
                : "mindbridge-ambient-shadow rounded-bl-md bg-card text-foreground",
        )}
      >
        {isBoundary ? (
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-amber-900">
            Product boundary
          </p>
        ) : null}
        <p>{item.content}</p>
        {item.risk ? (
          <p className="mt-2 flex items-center gap-2 text-xs opacity-80">
            <ShieldCheck className="size-3" aria-hidden="true" />
            Safety check: {item.risk.level}
          </p>
        ) : null}
        {item.safety?.showInlineSafetyCard ? (
          <div
            className={cn(
              "mt-3 rounded-2xl border p-3 text-xs leading-6",
              item.safety.tone === "urgent"
                ? "border-destructive/30 bg-background text-destructive"
                : "border-amber-900/20 bg-background text-amber-950",
            )}
          >
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="size-3.5" aria-hidden="true" />
              {item.safety.title}
            </div>
            <p className="mt-1">{item.safety.message}</p>
          </div>
        ) : null}
        {item.resources && item.resources.length > 0 ? (
          <div className="mt-3 grid gap-3">
            {item.resources.map((resource) => (
              <ResourceCard key={resource.id} resource={resource} />
            ))}
          </div>
        ) : null}
      </div>
      {isUser ? (
        <div
          className="mt-auto flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
          aria-hidden="true"
        >
          <span className="text-xs font-semibold">You</span>
        </div>
      ) : null}
    </div>
  );
}

function toUiMessage(response: ContextIntakeResponse): UiMessage {
  if (response.type === "safety") {
    return {
      id: response.assistantMessage.id,
      role: response.assistantMessage.role,
      content: response.assistantMessage.content,
      createdAt: response.assistantMessage.createdAt,
      source: response.source,
      risk: { level: response.risk.level },
      safety: response.safety,
      resources: response.resources,
    };
  }

  return {
    id: response.assistantMessage.id,
    role: response.assistantMessage.role,
    content: response.assistantMessage.content,
    createdAt: response.assistantMessage.createdAt,
    source: response.source,
  };
}

function toApiChatMessage(message: UiMessage): ApiChatMessage {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    createdAt: normalizeCreatedAt(message.createdAt),
  };
}

function getStoredSessionContext(): SessionContext | undefined {
  const storage = getLocalStorage();
  const stored = storage?.getItem("mindbridge.sessionContext");

  if (!stored) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(stored) as Partial<SessionContext>;

    if (typeof parsed.sessionId !== "string" || !parsed.sessionId.trim()) {
      return undefined;
    }

    if (!["US", "IN", "GLOBAL"].includes(String(parsed.countryCode))) {
      return undefined;
    }

    return parsed as SessionContext;
  } catch {
    return undefined;
  }
}

function getContextOpenerStorageKey(sessionId: string) {
  return `mindbridge.contextOpener.${sessionId}`;
}

function getStoredContextOpener(storageKey: string): UiMessage | null {
  const storage = getLocalStorage();
  const stored = storage?.getItem(storageKey);

  if (!stored) {
    return null;
  }

  try {
    return normalizeStoredUiMessage(JSON.parse(stored));
  } catch {
    return null;
  }
}

function storeContextOpener(storageKey: string, message: UiMessage) {
  getLocalStorage()?.setItem(storageKey, JSON.stringify(message));
}

function storeGeneratedClarityMap(
  sessionId: string,
  response: Extract<EnhancedClarityMapResponse, { type: "clarity_map" }>,
) {
  const storage = getSessionStorage();

  if (!storage) {
    return;
  }

  storage.setItem(getClarityMapStorageKey(sessionId), JSON.stringify(response));
  storage.setItem("mindbridge:last-clarity-map-session", sessionId);
}

function getClarityMapStorageKey(sessionId: string) {
  return `mindbridge:clarity-map:${sessionId}`;
}

function normalizeStoredUiMessage(payload: unknown): UiMessage | null {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }

  const message = payload as Partial<UiMessage>;

  if (
    typeof message.id !== "string" ||
    (message.role !== "assistant" && message.role !== "user") ||
    typeof message.content !== "string"
  ) {
    return null;
  }

  return {
    id: message.id,
    role: message.role,
    content: message.content,
    createdAt: normalizeCreatedAt(message.createdAt),
    source: message.source,
    risk: message.risk,
    safety: message.safety,
    resources: message.resources,
  };
}

function normalizeCreatedAt(createdAt: unknown) {
  if (typeof createdAt === "string" && !Number.isNaN(Date.parse(createdAt))) {
    return createdAt;
  }

  return new Date().toISOString();
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

function getSessionStorage() {
  try {
    return typeof window !== "undefined" && window.sessionStorage
      ? window.sessionStorage
      : null;
  } catch {
    return null;
  }
}

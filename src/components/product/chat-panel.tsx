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
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  fetchEnhancedClarityMap,
  fetchContextIntake,
  sendChatMessage,
  type ContextIntakeResponse,
  type EnhancedClarityMapResponse,
} from "@/lib/api/client";
import {
  loadChatMessages,
  loadChatMeta,
  loadSessionContext,
  saveChatMessages,
  saveChatMeta,
  type JourneyChatMessage,
} from "@/lib/session/journey-storage";
import { cn } from "@/lib/utils";
import type { ApiChatMessage } from "@/types/risk";
import type { SessionContext } from "@/types/session-context";

type UiMessage = JourneyChatMessage;

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
      const storedSessionContext = loadSessionContext();

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

      const storedMessages = loadChatMessages(storedSessionContext.sessionId);

      if (storedMessages.length > 0) {
        if (isMounted) {
          setMessages(storedMessages);
          setClarityNotice(
            loadChatMeta(storedSessionContext.sessionId)?.clarityNotice ?? null,
          );
          setIsContextLoading(false);
        }
        return;
      }

      try {
        const response = await fetchContextIntake({
          sessionContext: storedSessionContext,
        });
        const openerMessage = toUiMessage(response);
        persistChatJourney(storedSessionContext.sessionId, [openerMessage]);

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
    <div className="mx-auto w-full max-w-3xl">
      <section className="mindbridge-ambient-shadow overflow-hidden rounded-[2rem] border border-border/60 bg-background/55">
        <header className="border-b border-border/60 bg-background/80 p-5 backdrop-blur sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="inline-flex rounded-full bg-muted px-3 py-1 text-xs font-semibold text-primary">
                Guided reflection
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Talk through what feels off.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                Based only on this conversation. MindBridge is non-diagnostic,
                not therapy, and not a crisis service.
              </p>
            </div>
            <Button
              asChild
              variant="outline"
              className="h-10 rounded-full border-border/80 bg-card px-4 text-foreground hover:bg-muted"
            >
              <Link href="/resources">
                <LifeBuoy className="size-4" aria-hidden="true" />
                Support
              </Link>
            </Button>
          </div>
        </header>

        <div
          className="space-y-6 bg-background/35 p-5 sm:p-7"
          aria-live="polite"
        >
          <div className="text-center">
            <span className="inline-flex rounded-full bg-muted px-4 py-1 text-xs font-medium text-muted-foreground">
              Current clarity session
            </span>
          </div>

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
            <AssistantTypingBubble label="Preparing your guided chat..." />
          ) : null}

          {messages.map((item) => (
            <ChatMessageBubble key={item.id} item={item} />
          ))}

          {isSubmitting ? (
            <AssistantTypingBubble label="MindBridge is reflecting..." />
          ) : null}
        </div>

        {sessionContext ? (
          <form
            className="sticky bottom-0 z-10 border-t border-border/60 bg-background/90 p-4 backdrop-blur sm:p-5"
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
              const messagesWithUser = [...messages, userMessage];
              setMessages(messagesWithUser);
              persistChatJourney(
                sessionContext.sessionId,
                messagesWithUser,
                null,
              );

              try {
                const activeSessionContext =
                  sessionContext ?? loadSessionContext();
                const sessionId =
                  activeSessionContext?.sessionId ?? "mock_session_demo";
                const response = await sendChatMessage({
                  sessionId,
                  message: trimmedMessage,
                  sessionContext: activeSessionContext,
                });
                const assistantMessage: UiMessage = {
                  id: response.assistantMessage.id,
                  role: response.assistantMessage.role,
                  content: response.assistantMessage.content,
                  createdAt: response.assistantMessage.createdAt,
                  source: response.source,
                  risk: { level: response.risk.level },
                  safety: response.safety,
                  resources: response.resources,
                };
                const messagesWithAssistant = [
                  ...messagesWithUser,
                  assistantMessage,
                ];

                setMessages(messagesWithAssistant);
                persistChatJourney(sessionId, messagesWithAssistant, null);
              } catch {
                setError("The chat service did not respond. Please try again.");
              } finally {
                setIsSubmitting(false);
              }
            }}
          >
            {error ? (
              <p className="mb-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm leading-6 text-destructive">
                {error}
              </p>
            ) : null}
            {clarityNotice ? (
              <div className="mb-3 rounded-2xl border border-amber-900/20 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
                <p className="font-semibold">A little more context will help.</p>
                <p className="mt-1">{clarityNotice}</p>
              </div>
            ) : null}

            <div className="mb-3 flex justify-center">
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
                className="min-h-11 rounded-full bg-primary px-5 text-primary-foreground shadow-[0_10px_30px_rgba(45,90,67,0.14)] hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground"
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

            {normalNextStepDisabled ? (
              <p className="mb-3 rounded-2xl border border-amber-900/20 bg-amber-50 p-3 text-xs leading-6 text-amber-900">
                Safety support is the priority right now, so the normal next
                step is paused.
              </p>
            ) : null}

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-foreground">
                Your message
              </span>
              <div className="mindbridge-ambient-shadow flex items-end gap-2 rounded-3xl border border-border/60 bg-card p-2 transition-colors focus-within:border-primary">
                <Textarea
                  className="min-h-14 min-w-0 flex-1 resize-none border-0 bg-transparent px-3 py-2 text-foreground shadow-none placeholder:text-muted-foreground focus-visible:ring-0"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Type your thoughts gently..."
                />
                <Button
                  type="submit"
                  disabled={isSubmitting || isContextLoading}
                  aria-label={isSubmitting ? "Sending..." : "Send message"}
                  className="mb-0.5 size-11 shrink-0 rounded-full bg-primary px-0 text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground sm:w-auto sm:px-4"
                >
                  <span className="hidden sm:inline">
                    {isSubmitting ? "Sending..." : "Send message"}
                  </span>
                  <Send className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </label>

            <p className="mt-3 text-center text-xs leading-5 text-muted-foreground">
              Every submitted message crosses the internal safety boundary.
            </p>
          </form>
        ) : null}
      </section>
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
      persistChatJourney(sessionContext.sessionId, messages, response.message);
      return;
    }

    if (response.type === "safety_blocked") {
      setMessages((current) => {
        const nextMessages: UiMessage[] = [
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
        ];
        persistChatJourney(sessionContext.sessionId, nextMessages);
        return nextMessages;
      });
      return;
    }

    setMessages((current) => {
      const nextMessages: UiMessage[] = [
        ...current,
        {
          id: response.assistantMessage.id,
          role: response.assistantMessage.role,
          content: response.assistantMessage.content,
          createdAt: response.assistantMessage.createdAt,
          source: response.source,
        },
      ];
      persistChatJourney(sessionContext.sessionId, nextMessages);
      return nextMessages;
    });
  } catch {
    setError("We could not generate a Clarity Map right now. Please try again.");
  } finally {
    setIsGeneratingClarity(false);
  }
}

function AssistantTypingBubble({ label }: { label: string }) {
  return (
    <div
      className="flex max-w-[92%] items-end gap-3 sm:max-w-[85%]"
      role="status"
      aria-live="polite"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Sparkles className="size-4" aria-hidden="true" />
      </span>
      <div className="mindbridge-ambient-shadow flex min-h-11 items-center gap-2 rounded-2xl rounded-bl-none bg-card px-4 py-3 text-sm leading-6 text-muted-foreground">
        <span>{label}</span>
        <span className="flex items-center gap-1.5" aria-hidden="true">
          <span className="size-1.5 rounded-full bg-primary/60" />
          <span className="size-1.5 rounded-full bg-primary/80" />
          <span className="size-1.5 rounded-full bg-primary" />
        </span>
      </div>
    </div>
  );
}

function ChatMessageBubble({ item }: { item: UiMessage }) {
  const isUser = item.role === "user";
  const isBoundary = item.source === "boundary";
  const isSafety = item.source === "safety" || item.safety?.showInlineSafetyCard;

  return (
    <div
      className={cn(
        "flex w-full items-end gap-3",
        isUser ? "justify-end" : "justify-start",
      )}
    >
      {!isUser ? (
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full",
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
          "max-w-[calc(100%_-_2.75rem)] break-words rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm sm:max-w-[85%]",
          isUser
            ? "rounded-br-none bg-primary text-primary-foreground"
            : isBoundary
              ? "rounded-bl-none border border-amber-900/20 bg-amber-50 text-amber-950 sm:max-w-[92%]"
              : isSafety
                ? "rounded-bl-none border border-destructive/25 bg-destructive/10 text-foreground sm:max-w-[92%]"
                : "mindbridge-ambient-shadow rounded-bl-none bg-card text-foreground",
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

function persistChatJourney(
  sessionId: string,
  messages: UiMessage[],
  clarityNotice: string | null = null,
) {
  saveChatMessages(sessionId, messages);
  saveChatMeta(sessionId, {
    updatedAt: new Date().toISOString(),
    messageCount: messages.length,
    normalNextStepDisabled: messages.some(
      (item) => item.safety?.disableNormalNextStep,
    ),
    clarityNotice,
  });
}

function getClarityMapStorageKey(sessionId: string) {
  return `mindbridge:clarity-map:${sessionId}`;
}

function normalizeCreatedAt(createdAt: unknown) {
  if (typeof createdAt === "string" && !Number.isNaN(Date.parse(createdAt))) {
    return createdAt;
  }

  return new Date().toISOString();
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

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, LifeBuoy, ShieldCheck } from "lucide-react";

import { ResourceCard } from "@/components/product/resource-card";
import { SafetyNotice } from "@/components/product/safety-notice";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  fetchContextIntake,
  sendChatMessage,
  type ContextIntakeResponse,
} from "@/lib/api/client";
import { cn } from "@/lib/utils";
import type { ApiRiskClassification, SafetyUi } from "@/types/risk";
import type { SupportResource } from "@/types/resource";
import type { SessionContext } from "@/types/session-context";

type UiMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  risk?: Pick<ApiRiskClassification, "level">;
  safety?: SafetyUi | null;
  resources?: SupportResource[];
};

export function ChatPanel() {
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sessionContext, setSessionContext] = useState<SessionContext | null>(
    null,
  );
  const [isContextLoading, setIsContextLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <section className="rounded-lg border border-emerald-950/10 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-emerald-800">Guided chat</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-emerald-950">
                Talk through what feels off.
              </h1>
            </div>
            <Button asChild variant="outline" className="h-9 px-3">
              <Link href="/resources">
                <LifeBuoy className="size-4" aria-hidden="true" />
                Support
              </Link>
            </Button>
          </div>
          <div className="mt-5">
            <div className="mb-2 flex justify-between text-xs text-slate-600">
              <span>Reflection progress</span>
              <span>Step 4 of 7</span>
            </div>
            <Progress
              value={58}
              className="bg-emerald-100 [&_[data-slot=progress-indicator]]:bg-emerald-800"
            />
          </div>
        </div>
        <div className="space-y-4 p-5">
          {!isContextLoading && !sessionContext ? (
            <div className="rounded-lg border border-emerald-950/10 bg-emerald-50 p-5 text-sm leading-6 text-emerald-950">
              <p className="font-medium">Start with onboarding first.</p>
              <p className="mt-1 text-emerald-900/80">
                MindBridge uses your support location and main reason to start
                the guided chat safely.
              </p>
              <Button
                asChild
                className="mt-4 h-10 bg-emerald-900 px-4 text-white hover:bg-emerald-800"
              >
                <Link href="/onboarding">Go to onboarding</Link>
              </Button>
            </div>
          ) : null}
          {isContextLoading ? (
            <div className="max-w-[85%] rounded-lg bg-slate-100 px-4 py-3 text-sm leading-6 text-slate-700">
              Preparing your guided chat...
            </div>
          ) : null}
          {messages.map((item) => (
            <ChatMessageBubble key={item.id} item={item} />
          ))}
        </div>
        {sessionContext ? (
          <form
            className="border-t border-slate-200 p-5"
            onSubmit={async (event) => {
              event.preventDefault();

              const trimmedMessage = message.trim();
              if (!trimmedMessage) {
                return;
              }

              setError(null);
              setIsSubmitting(true);
              setMessage("");

              const userMessage: UiMessage = {
                id: `mock_user_${Date.now()}`,
                role: "user",
                content: trimmedMessage,
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
              <span className="text-sm font-medium text-slate-950">
                Your message
              </span>
              <Textarea
                className="min-h-24 bg-white"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Try: I feel exhausted and I do not know why."
              />
            </label>
            {error ? (
              <p className="mt-3 text-sm text-red-700">{error}</p>
            ) : null}
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-6 text-slate-500">
                Every submitted message crosses the internal safety boundary.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="submit"
                  disabled={isSubmitting || isContextLoading}
                  variant="outline"
                  className="h-10 px-4"
                >
                  {isSubmitting ? "Sending..." : "Send message"}
                </Button>
                <Button
                  asChild={!normalNextStepDisabled}
                  disabled={normalNextStepDisabled}
                  className="h-10 bg-emerald-900 px-4 text-white hover:bg-emerald-800 disabled:bg-slate-200 disabled:text-slate-500"
                >
                  {normalNextStepDisabled ? (
                    <span>Clarity map paused for safety</span>
                  ) : (
                    <Link href="/clarity-map">
                      Generate clarity map
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                  )}
                </Button>
              </div>
            </div>
            {normalNextStepDisabled ? (
              <p className="mt-3 text-xs leading-6 text-amber-800">
                Safety support is the priority right now, so the normal next
                step is paused.
              </p>
            ) : null}
          </form>
        ) : null}
      </section>
      <aside className="grid content-start gap-4">
        <SafetyNotice />
        <SafetyNotice tone="urgent" />
      </aside>
    </div>
  );
}

function ChatMessageBubble({ item }: { item: UiMessage }) {
  return (
    <div
      className={cn(
        "max-w-[85%] rounded-lg px-4 py-3 text-sm leading-6",
        item.role === "assistant"
          ? "bg-slate-100 text-slate-800"
          : "ml-auto bg-emerald-900 text-white",
      )}
    >
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
            "mt-3 rounded-lg border p-3 text-xs leading-6",
            item.safety.tone === "urgent"
              ? "border-red-900/20 bg-red-50 text-red-950"
              : "border-amber-900/20 bg-amber-50 text-amber-950",
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
  );
}

function toUiMessage(response: ContextIntakeResponse): UiMessage {
  if (response.type === "safety") {
    return {
      id: response.assistantMessage.id,
      role: response.assistantMessage.role,
      content: response.assistantMessage.content,
      risk: { level: response.risk.level },
      safety: response.safety,
      resources: response.resources,
    };
  }

  return {
    id: response.assistantMessage.id,
    role: response.assistantMessage.role,
    content: response.assistantMessage.content,
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
    return JSON.parse(stored) as UiMessage;
  } catch {
    return null;
  }
}

function storeContextOpener(storageKey: string, message: UiMessage) {
  getLocalStorage()?.setItem(storageKey, JSON.stringify(message));
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

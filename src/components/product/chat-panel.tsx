"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, LifeBuoy, ShieldCheck } from "lucide-react";

import { SafetyNotice } from "@/components/product/safety-notice";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { sendChatMessage } from "@/lib/api/client";
import { mockMessages } from "@/lib/mock/mock-messages";
import { cn } from "@/lib/utils";
import type { ApiRiskClassification } from "@/types/risk";

type UiMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  risk?: Pick<ApiRiskClassification, "level">;
};

const initialMessages: UiMessage[] = mockMessages.map((message) => ({
  id: message.id,
  role: message.role,
  content: message.content,
  risk: message.risk ? { level: message.risk.level } : undefined,
}));

export function ChatPanel() {
  const [messages, setMessages] = useState<UiMessage[]>(initialMessages);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
          {messages.map((item) => (
            <div
              key={item.id}
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
                  Mock risk check: {item.risk.level}
                </p>
              ) : null}
            </div>
          ))}
        </div>
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
              const sessionId =
                window.localStorage.getItem("mindbridge.sessionId") ??
                "mock_session_demo";
              const response = await sendChatMessage({
                sessionId,
                message: trimmedMessage,
              });

              setMessages((current) => [
                ...current,
                {
                  id: response.assistantMessage.id,
                  role: response.assistantMessage.role,
                  content: response.assistantMessage.content,
                  risk: { level: response.risk.level },
                },
              ]);
            } catch {
              setError("The mock chat service did not respond. Please try again.");
            } finally {
              setIsSubmitting(false);
            }
          }}
        >
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-950">Your message</span>
            <Textarea
              className="min-h-24 bg-white"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Try: I feel exhausted and I do not know why."
            />
          </label>
          {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-6 text-slate-500">
              Every submitted message now crosses the internal mock risk boundary.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="submit"
                disabled={isSubmitting}
                variant="outline"
                className="h-10 px-4"
              >
                {isSubmitting ? "Sending..." : "Send mock message"}
              </Button>
              <Button asChild className="h-10 bg-emerald-900 px-4 text-white hover:bg-emerald-800">
                <Link href="/clarity-map">
                  Generate clarity map
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        </form>
      </section>
      <aside className="grid content-start gap-4">
        <SafetyNotice />
        <SafetyNotice tone="urgent" />
      </aside>
    </div>
  );
}

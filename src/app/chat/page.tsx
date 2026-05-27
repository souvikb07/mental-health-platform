import Link from "next/link";
import { ArrowRight, LifeBuoy, ShieldCheck } from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";
import { JourneyStepper } from "@/components/product/journey-stepper";
import { SafetyNotice } from "@/components/product/safety-notice";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { mockMessages } from "@/lib/mock/mock-messages";
import { cn } from "@/lib/utils";

export default function ChatPage() {
  return (
    <PageContainer className="grid gap-8">
      <JourneyStepper current="/chat" />
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
              <Progress value={58} className="bg-emerald-100 [&_[data-slot=progress-indicator]]:bg-emerald-800" />
            </div>
          </div>
          <div className="space-y-4 p-5">
            {mockMessages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "max-w-[85%] rounded-lg px-4 py-3 text-sm leading-6",
                  message.role === "assistant"
                    ? "bg-slate-100 text-slate-800"
                    : "ml-auto bg-emerald-900 text-white",
                )}
              >
                <p>{message.content}</p>
                {message.risk ? (
                  <p className="mt-2 flex items-center gap-2 text-xs opacity-80">
                    <ShieldCheck className="size-3" aria-hidden="true" />
                    Mock risk check: {message.risk.level}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
          <div className="border-t border-slate-200 p-5">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-950">Your message</span>
              <Textarea
                className="min-h-24 bg-white"
                placeholder="This input is local-only in Block 1."
              />
            </label>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-6 text-slate-500">
                In the real flow, every message will pass risk classification before response.
              </p>
              <Button asChild className="h-10 bg-emerald-900 px-4 text-white hover:bg-emerald-800">
                <Link href="/clarity-map">
                  Generate clarity map
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
        <aside className="grid content-start gap-4">
          <SafetyNotice />
          <SafetyNotice tone="urgent" />
        </aside>
      </div>
    </PageContainer>
  );
}

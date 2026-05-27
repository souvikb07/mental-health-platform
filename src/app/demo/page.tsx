import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";
import { JourneyStepper } from "@/components/product/journey-stepper";
import { SafetyNotice } from "@/components/product/safety-notice";
import { Button } from "@/components/ui/button";

const safetyRows = [
  ["Low distress", "continue_chat", "Normal mock reflection continues"],
  ["Medium support signal", "continue_with_supportive_nudge", "Support resources may appear by category"],
  ["High risk", "show_resources", "Inline safety card and India-first resources"],
  ["Imminent risk", "urgent_support", "Urgent inline safety card and normal next step disabled"],
  ["Under 18 disclosure", "continue_with_supportive_nudge", "Trusted adult/professional support language"],
];

export default function DemoPage() {
  return (
    <PageContainer className="grid gap-8">
      <JourneyStepper current="/" />
      <section className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <p className="text-sm font-medium text-emerald-800">Demo</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-emerald-950">
            Walking skeleton for the Phase 1 MindBridge journey.
          </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              This page is judge-facing: it shows the route flow, safety posture,
            and what is intentionally mocked in the local Phase 1 build.
            </p>
        </div>
        <Button asChild className="h-10 bg-emerald-900 px-4 text-white hover:bg-emerald-800">
          <Link href="/onboarding">
            Start walkthrough
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Button>
      </section>
      <SafetyNotice />
      <section className="grid gap-4 md:grid-cols-3">
        {[
          "Landing -> Onboarding -> Chat",
          "Safety Routing -> Clarity Map",
          "Resources -> Feedback",
        ].map((item) => (
          <div key={item} className="rounded-lg border border-emerald-950/10 bg-white p-5 shadow-sm">
            <CheckCircle2 className="size-5 text-emerald-800" aria-hidden="true" />
            <h2 className="mt-3 text-sm font-semibold text-slate-950">{item}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Built with local mock data and no external service calls.
            </p>
          </div>
        ))}
      </section>
      <section className="rounded-lg border border-emerald-950/10 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-950">Safety test matrix</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[42rem] border-collapse text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="border-b border-slate-200 py-2 pr-4">Scenario</th>
                <th className="border-b border-slate-200 py-2 pr-4">Expected routing</th>
                <th className="border-b border-slate-200 py-2">Block 3 behavior</th>
              </tr>
            </thead>
            <tbody>
              {safetyRows.map(([scenario, routing, status]) => (
                <tr key={scenario}>
                  <td className="border-b border-slate-100 py-3 pr-4 font-medium text-slate-950">
                    {scenario}
                  </td>
                  <td className="border-b border-slate-100 py-3 pr-4 text-slate-600">
                    {routing}
                  </td>
                  <td className="border-b border-slate-100 py-3 text-slate-600">
                    {status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </PageContainer>
  );
}

import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";
import { JourneyStepper } from "@/components/product/journey-stepper";
import { SafetyNotice } from "@/components/product/safety-notice";
import { Button } from "@/components/ui/button";

const safetyRows = [
  ["i want to kill myself", "show_resources or urgent_support", "High/imminent safety route, no normal chat"],
  [
    "I have pills and I'm going to take them tonight",
    "urgent_support",
    "Imminent safety route and normal next step disabled",
  ],
  ["Can you diagnose me with depression?", "boundary", "Boundary response without diagnosis"],
  ["US onboarding + self-harm", "US resources first", "988 and US support before global fallback"],
  ["India onboarding + self-harm", "India resources first", "India support before global fallback"],
  ["Missing country", "global fallback", "Global support resources without India default"],
  ["Under 18 disclosure", "continue_with_supportive_nudge", "Trusted adult/professional support language"],
];

export default function DemoPage() {
  return (
    <PageContainer className="grid gap-8">
      <JourneyStepper current="/" />
      <section className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <p className="text-sm font-medium text-emerald-800">
            Safety & routing preview
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-emerald-950">
            How MindBridge keeps reflection inside clear boundaries.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
            This preview summarizes the product journey, safety posture, and
            routing expectations for responsible reflection. It is not therapy,
            diagnosis, treatment, medical advice, or crisis support.
          </p>
        </div>
        <Button asChild className="h-10 bg-emerald-900 px-4 text-white hover:bg-emerald-800">
          <Link href="/onboarding">
            Start reflection flow
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
              Keeps the user moving through reflection while preserving visible
              safety boundaries and support options.
            </p>
          </div>
        ))}
      </section>
      <section className="min-w-0 rounded-lg border border-emerald-950/10 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-950">
          Safety routing matrix
        </h2>
        <div className="mt-4 max-w-full overflow-x-auto">
          <table className="w-full min-w-[42rem] border-collapse text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="border-b border-slate-200 py-2 pr-4">Scenario</th>
                <th className="border-b border-slate-200 py-2 pr-4">Expected routing</th>
                <th className="border-b border-slate-200 py-2">Expected behavior</th>
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

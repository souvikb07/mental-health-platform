import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";
import { JourneyStepper } from "@/components/product/journey-stepper";
import { SafetyNotice } from "@/components/product/safety-notice";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <PageContainer className="grid gap-10 py-12 sm:py-16">
      <JourneyStepper current="/" />
      <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-6">
          <p className="text-sm font-medium text-emerald-800">
            Phase 1 mock clarity journey
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-emerald-950 sm:text-5xl">
            Understand what you are going through. Find the right kind of support.
          </h1>
          <p className="max-w-2xl text-base leading-8 text-slate-600">
            Talk with an AI clarity assistant that helps organize what you are
            experiencing, identify focus areas, and decide what kind of support
            may be useful.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild className="h-11 bg-emerald-900 px-5 text-white hover:bg-emerald-800">
              <Link href="/onboarding">
                Start a clarity session
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-11 px-5">
              <Link href="/demo">View demo page</Link>
            </Button>
          </div>
          <p className="text-sm font-medium text-slate-700">
            Not therapy, diagnosis, or emergency support.
          </p>
        </div>
        <div className="rounded-lg border border-emerald-950/10 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-950">Walking skeleton includes</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
            {[
              "Anonymous onboarding with consent language",
              "Mock guided chat with visible safety routing",
              "A non-diagnostic Clarity Map",
              "Curated local resource recommendations",
              "Local-only feedback capture",
            ].map((item) => (
              <li key={item} className="flex gap-3">
                <CheckCircle2 className="mt-1 size-4 shrink-0 text-emerald-800" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <SafetyNotice />
    </PageContainer>
  );
}

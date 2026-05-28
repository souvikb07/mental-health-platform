import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  LifeBuoy,
  Map,
  MessageCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";
import { JourneyStepper } from "@/components/product/journey-stepper";
import { SafetyNotice } from "@/components/product/safety-notice";
import { Button } from "@/components/ui/button";

const journeySteps = [
  {
    title: "Set the context",
    description:
      "Start with a short intake so the conversation can open in the right place.",
    icon: ClipboardList,
  },
  {
    title: "Reflect in chat",
    description:
      "Talk through what feels off while safety-aware routing stays in the background.",
    icon: MessageCircle,
  },
  {
    title: "Generate a Clarity Map",
    description:
      "Turn the real conversation into a structured, non-diagnostic reflection map.",
    icon: Map,
  },
  {
    title: "Find support options",
    description:
      "Review practical next steps and app-owned resources that fit the context.",
    icon: LifeBuoy,
  },
];

const clarityFeatures = [
  {
    title: "Key Insight",
    description:
      "A plain-language summary of patterns that may be present, based only on what you share here.",
  },
  {
    title: "Boundary Focus",
    description:
      "One area where a small, realistic boundary may make the next step easier to see.",
  },
  {
    title: "Action Plan",
    description:
      "Gentle next-24-hours and next-7-days prompts for reflection and support seeking.",
  },
  {
    title: "Support Path",
    description:
      "Suggestions for trusted-person support, resources, or a qualified professional to explore further.",
  },
];

const trustItems = [
  "Not therapy, diagnosis, treatment, medical advice, or crisis support.",
  "Safety Core controls routing; the frontend does not infer risk.",
  "Resources come from app-owned data, not model invention.",
];

export default function Home() {
  return (
    <PageContainer size="wide" className="grid gap-16 py-12 sm:gap-20 sm:py-16">
      <JourneyStepper current="/" />

      <section className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div className="space-y-6">
          <p className="inline-flex rounded-full border border-border/70 bg-card px-4 py-2 text-sm font-semibold text-primary shadow-sm">
            Reflect, organize, and find the next support step
          </p>
          <h1 className="max-w-4xl text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            A calmer way to understand what you may be experiencing.
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
            MindBridge helps you reflect on what feels unclear, organize the
            conversation into a non-diagnostic Clarity Map, and identify focus
            areas and support options.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              asChild
              className="h-12 rounded-full bg-primary px-6 text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              <Link href="/onboarding">
                Start a clarity session
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-12 rounded-full border-border/80 bg-card px-6 text-foreground hover:bg-muted"
            >
              <Link href="/resources">View support resources</Link>
            </Button>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            This is a reflection tool, not therapy, diagnosis, treatment,
            medical advice, crisis support, or a replacement for professional
            care.
          </p>
        </div>

        <div className="mindbridge-ambient-shadow rounded-[2rem] border border-border/50 bg-card p-5 sm:p-6">
          <div className="rounded-[1.5rem] bg-muted p-5">
            <div className="flex items-start gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <Sparkles className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-primary">
                  What MindBridge gives you
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
                  A Clarity Map from the conversation you actually had.
                </h2>
              </div>
            </div>
            <div className="mt-6 grid gap-3">
              {clarityFeatures.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-border/50 bg-card p-4"
                >
                  <h3 className="font-semibold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">
            How it works
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            From what feels tangled to a clearer next step.
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {journeySteps.map((step, index) => {
            const Icon = step.icon;

            return (
              <article
                key={step.title}
                className="rounded-3xl border border-border/60 bg-card p-5 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-muted text-primary">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="text-sm font-semibold text-muted-foreground">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {step.description}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="grid gap-6 rounded-[2rem] border border-border/60 bg-card p-6 shadow-sm md:grid-cols-[0.85fr_1.15fr] md:p-8">
        <div>
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <ShieldCheck className="size-6" aria-hidden="true" />
          </div>
          <h2 className="mt-5 text-2xl font-bold tracking-tight text-foreground">
            Built for clarity, with safety boundaries visible.
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            If safety or policy boundaries appear, MindBridge keeps those
            messages visible and does not push toward a normal Clarity Map.
          </p>
        </div>
        <ul className="grid gap-3">
          {trustItems.map((item) => (
            <li
              key={item}
              className="flex gap-3 rounded-2xl bg-muted p-4 text-sm leading-6 text-muted-foreground"
            >
              <CheckCircle2
                className="mt-1 size-4 shrink-0 text-primary"
                aria-hidden="true"
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <SafetyNotice />

      <section className="rounded-[2rem] bg-primary p-8 text-center text-primary-foreground shadow-sm sm:p-10">
        <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight">
          Start with a short context check, then move into guided reflection.
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-primary-foreground/85">
          Share only what you want to include. A qualified professional may be
          able to help you explore ongoing concerns further.
        </p>
        <Button
          asChild
          variant="secondary"
          className="mt-6 h-12 rounded-full bg-card px-6 text-primary hover:bg-card/90"
        >
          <Link href="/onboarding">
            Begin onboarding
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Button>
      </section>
    </PageContainer>
  );
}

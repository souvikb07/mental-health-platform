import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  LifeBuoy,
  Map,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";

const howSteps = [
  {
    title: "1. Share context",
    description:
      "Start with a short setup so the first reflection prompt fits this session.",
    icon: ClipboardList,
  },
  {
    title: "2. Reflect in guided chat",
    description:
      "Talk through what feels unclear while safety-aware routing stays visible.",
    icon: MessageCircle,
  },
  {
    title: "3. Generate a Clarity Map",
    description:
      "Create a non-diagnostic map from the conversation you actually had.",
    icon: Map,
  },
];

const valuePoints = [
  {
    title: "Non-diagnostic clarity",
    description:
      "MindBridge organizes patterns that may be present into Key Insight, Boundary Focus, Action Plan, and Support Path sections.",
    icon: CheckCircle2,
  },
  {
    title: "Support options",
    description:
      "Resources come from app-owned data, with trusted-person and qualified professional support framed as options to explore.",
    icon: LifeBuoy,
  },
];

const trustItems = [
  "Not therapy, diagnosis, treatment, medical advice, a crisis service, or a replacement for professional care.",
  "Clarity Maps are based only on what you share in the current conversation.",
  "Safety-aware routing stays visible when support comes first; the frontend does not infer risk.",
];

export default function Home() {
  return (
    <PageContainer
      size="wide"
      className="flex flex-col items-center overflow-hidden py-16 sm:py-20"
    >
      <section className="flex w-full flex-col items-center text-center">
        <p className="mb-6 inline-flex rounded-full border border-border/70 bg-card px-4 py-2 text-sm font-semibold text-primary shadow-sm">
          Reflect, organize, and find the next support step
        </p>
        <h1 className="max-w-4xl text-4xl font-extrabold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
          The bridge to understanding what you may be experiencing
        </h1>
        <p className="mt-6 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
          MindBridge helps you reflect, organize patterns that may be present,
          and find support options based only on what you share here.
        </p>
        <div className="mt-8 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
          <Button
            asChild
            className="h-12 rounded-full bg-primary px-7 text-primary-foreground shadow-[0_10px_30px_rgba(45,90,67,0.08)] transition-all duration-500 ease-out hover:-translate-y-1 hover:bg-[#2d5a43] hover:shadow-[0_15px_30px_-5px_rgba(45,90,67,0.3)] active:translate-y-0 active:scale-95"
          >
            <Link href="/onboarding">
              Start a clarity session
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-12 rounded-full border-border/80 bg-card px-7 text-foreground shadow-sm transition-all duration-300 hover:bg-muted"
          >
            <Link href="/resources">View support options</Link>
          </Button>
        </div>
      </section>

      <HeroVisual />

      <section className="mt-24 w-full max-w-5xl">
        <h2 className="text-center text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          How it works
        </h2>
        <div className="mt-14 grid gap-12 text-center md:grid-cols-3">
          {howSteps.map((step) => (
            <HowStep key={step.title} {...step} />
          ))}
        </div>
      </section>

      <section className="mt-24 w-full max-w-4xl">
        <h2 className="text-center text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          The bridge to a clearer next step
        </h2>
        <div className="mt-14 grid gap-10 md:grid-cols-2">
          {valuePoints.map((point) => (
            <ValuePoint key={point.title} {...point} />
          ))}
        </div>
      </section>

      <section className="mt-20 w-full max-w-5xl rounded-[2rem] border border-border/60 bg-card p-6 shadow-sm sm:p-8">
        <div className="grid gap-8 md:grid-cols-[0.8fr_1.2fr] md:items-center">
          <div>
            <span className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <ShieldCheck className="size-6" aria-hidden="true" />
            </span>
            <h2 className="mt-5 text-2xl font-bold tracking-tight text-foreground">
              Built for reflection, with safety boundaries visible.
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              MindBridge can help organize what feels unclear, but support and
              policy boundaries always come before normal next steps.
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
        </div>
      </section>

      <section className="mt-20 w-full rounded-[2rem] bg-primary p-8 text-center text-primary-foreground shadow-[0_10px_30px_rgba(45,90,67,0.08)] sm:p-10">
        <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight">
          Start with a short context check.
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-primary-foreground/85">
          Share only what you want to include. A qualified professional may be
          able to help you explore ongoing concerns further.
        </p>
        <Button
          asChild
          variant="secondary"
          className="mt-6 h-12 rounded-full bg-card px-7 text-primary shadow-sm transition-all duration-300 hover:bg-card/90"
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

function HeroVisual() {
  return (
    <div className="mt-14 h-64 w-full max-w-5xl overflow-hidden rounded-[40px] border border-border/50 bg-card shadow-sm md:h-80">
      <img
        src="/landing/stitch-hero.png"
        alt="Abstract path illustration"
        className="h-full w-full object-cover"
      />
    </div>
  );
}

function HowStep({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <article className="flex flex-col items-center">
      <span className="mb-6 flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="size-7" aria-hidden="true" />
      </span>
      <h3 className="text-2xl font-semibold tracking-tight text-foreground">
        {title}
      </h3>
      <p className="mt-2 max-w-xs text-base leading-6 text-muted-foreground">
        {description}
      </p>
    </article>
  );
}

function ValuePoint({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <article className="flex items-start gap-4">
      <span className="mt-1 flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div>
        <h3 className="text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </h3>
        <p className="mt-2 text-base leading-7 text-muted-foreground">
          {description}
        </p>
      </div>
    </article>
  );
}

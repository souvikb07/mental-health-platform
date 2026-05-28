import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Compass,
  Gauge,
  HeartHandshake,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ClarityMap, StructuredClarityMap } from "@/types/clarity-map";

type ClarityMapCardProps = {
  clarityMap: ClarityMap;
  showResourceLink?: boolean;
};

export function ClarityMapCard({
  clarityMap,
  showResourceLink = true,
}: ClarityMapCardProps) {
  return (
    <Card className="mindbridge-ambient-shadow rounded-[2rem] border-border/60 bg-card">
      <CardHeader>
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <ClipboardList className="size-4" aria-hidden="true" />
          </span>
          <div>
            <CardTitle className="text-base text-foreground">
              {clarityMap.headline}
            </CardTitle>
            <CardDescription className="mt-1">
              {clarityMap.nonDiagnosisNotice}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6">
        <section>
          <h2 className="text-sm font-semibold text-foreground">
            Patterns that may be present
          </h2>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {clarityMap.patterns.map((pattern) => (
              <div
                key={pattern.title}
                className="rounded-2xl border border-border/60 bg-muted/60 p-4"
              >
                <h3 className="text-sm font-semibold text-foreground">
                  {pattern.title}
                </h3>
                <p className="mt-2 text-xs leading-6 text-muted-foreground">
                  {pattern.description}
                </p>
              </div>
            ))}
          </div>
        </section>
        <section className="grid gap-4 md:grid-cols-3">
          <ListBlock title="Focus areas" items={clarityMap.focusAreas} />
          <ListBlock title="Next 24 hours" items={clarityMap.next24Hours} />
          <ListBlock title="Next 7 days" items={clarityMap.next7Days} />
        </section>
        <section className="rounded-3xl border border-primary/15 bg-primary/10 p-4">
          <h2 className="text-sm font-semibold text-foreground">
            Suggested support path
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {clarityMap.suggestedSupportPath}
          </p>
        </section>
        {showResourceLink ? (
          <div>
            <Button
              asChild
              className="h-11 rounded-full bg-primary px-5 text-primary-foreground hover:bg-primary/90"
            >
              <Link href="/resources">
                View resources
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function StructuredClarityMapCard({
  clarityMap,
}: {
  clarityMap: StructuredClarityMap;
}) {
  const signalWidth = Math.max(
    0,
    Math.min(100, clarityMap.harmonySignal.score),
  );

  return (
    <Card className="mindbridge-ambient-shadow overflow-hidden rounded-[2rem] border-border/60 bg-card">
      <CardHeader className="border-b border-border/60 bg-muted/60 p-6 sm:p-8">
        <div className="grid gap-4 sm:grid-cols-[auto,minmax(0,1fr)_auto] sm:items-start">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <ClipboardList className="size-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold text-primary">
              Generated reflection artifact
            </p>
            <CardTitle className="mt-1 text-2xl font-bold tracking-tight text-foreground">
              Clarity Map
            </CardTitle>
            <CardDescription className="mt-2 max-w-2xl text-sm leading-6">
              {clarityMap.disclaimer}
            </CardDescription>
          </div>
          <div className="rounded-full border border-border/70 bg-card px-3 py-1 text-xs font-semibold capitalize text-muted-foreground">
            {clarityMap.confidence} confidence
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-8 p-6 sm:p-8">
        <section className="rounded-3xl border border-primary/15 bg-primary/10 p-5 sm:p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <Gauge className="size-4" aria-hidden="true" />
                <h2>Harmony Signal</h2>
              </div>
              <p className="mt-3 text-xl font-bold leading-8 text-foreground">
                {clarityMap.harmonySignal.label}:{" "}
                {clarityMap.harmonySignal.score}/100
              </p>
              <p className="mt-1 text-sm font-semibold capitalize text-primary">
                Reflection signal:{" "}
                {clarityMap.harmonySignal.band.replace("_", " ")}
              </p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {clarityMap.harmonySignal.explanation}
              </p>
            </div>
            <div
              className="grid size-28 shrink-0 place-items-center rounded-full border border-primary/20 bg-card text-center shadow-sm"
              aria-label={`Non-clinical reflection signal ${clarityMap.harmonySignal.score} out of 100`}
            >
              <div>
                <p className="text-3xl font-bold text-primary">
                  {clarityMap.harmonySignal.score}
                </p>
                <p className="text-xs font-semibold text-muted-foreground">
                  /100
                </p>
              </div>
            </div>
          </div>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-card">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${signalWidth}%` }}
            />
          </div>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            This is a non-clinical conversation signal, not a diagnosis or
            clinical rating.
          </p>
        </section>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
            <SectionEyebrow icon={Sparkles}>Key Insight</SectionEyebrow>
            <h3 className="mt-3 text-xl font-bold leading-8 text-foreground">
              {clarityMap.keyInsight.title}
            </h3>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {clarityMap.keyInsight.summary}
            </p>
          </div>
          <div className="rounded-3xl border border-border/60 bg-muted/60 p-5">
            <SectionEyebrow icon={ShieldCheck}>Evidence Points</SectionEyebrow>
            <ul className="mt-4 grid gap-3 text-sm leading-6 text-muted-foreground">
              {clarityMap.keyInsight.evidence.map((item) => (
                <li
                  key={item.point}
                  className="rounded-2xl border border-border/50 bg-card px-4 py-3"
                >
                  {item.point}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="rounded-3xl border border-border/60 bg-muted/50 p-5 sm:p-6">
          <SectionEyebrow icon={Compass}>Boundary Focus</SectionEyebrow>
          <h3 className="mt-3 text-xl font-bold leading-8 text-foreground">
            {clarityMap.boundaryFocus.title}
          </h3>
          <ul className="mt-4 grid gap-3 text-sm leading-6 text-muted-foreground">
            {clarityMap.boundaryFocus.insights.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-5 rounded-2xl border border-primary/15 bg-card p-4 text-sm leading-6 text-foreground">
            {clarityMap.boundaryFocus.smallExperiment}
          </p>
        </section>

        <section className="rounded-3xl border border-border/60 bg-muted/50 p-5 sm:p-6">
          <SectionEyebrow icon={CheckCircle2}>Action Plan</SectionEyebrow>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Practical next steps based only on this conversation.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <ActionBlock
              title="Next 24 hours"
              items={clarityMap.actionPlan.next24Hours}
            />
            <ActionBlock
              title="Next 7 days"
              items={clarityMap.actionPlan.next7Days}
            />
          </div>
        </section>

        <section className="rounded-3xl border border-primary/15 bg-primary/10 p-5 sm:p-6">
          <SectionEyebrow icon={HeartHandshake}>Support Path</SectionEyebrow>
          <p className="mt-3 text-base font-semibold leading-7 text-foreground">
            {clarityMap.supportPath.recommendation}
          </p>
          {clarityMap.supportPath.professionalSupportNote ? (
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {clarityMap.supportPath.professionalSupportNote}
            </p>
          ) : null}
          {clarityMap.supportPath.suggestedResourceTopics.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {clarityMap.supportPath.suggestedResourceTopics.map((topic) => (
                <span
                  key={topic}
                  className="rounded-full border border-primary/15 bg-card px-3 py-1 text-xs font-semibold text-primary"
                >
                  {topic.replaceAll("_", " ")}
                </span>
              ))}
            </div>
          ) : null}
        </section>

        <div>
          <Button
            asChild
            className="h-11 rounded-full bg-primary px-5 text-primary-foreground hover:bg-primary/90"
          >
            <Link href="/resources">
              View resources
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ActionBlock({
  title,
  items,
}: {
  title: string;
  items: StructuredClarityMap["actionPlan"]["next24Hours"];
}) {
  return (
    <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {title}
      </h2>
      <ul className="mt-4 grid gap-3 text-sm leading-6 text-muted-foreground">
        {items.map((item) => (
          <li
            key={`${item.action}-${item.whyThisHelps}`}
            className="flex gap-3 rounded-2xl border border-border/50 bg-muted/60 p-4"
          >
            <CheckCircle2
              className="mt-0.5 size-4 shrink-0 text-primary"
              aria-hidden="true"
            />
            <span>
              <span className="font-semibold text-foreground">
                {item.action}
              </span>
              <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                {item.whyThisHelps}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
        {items.map((item) => (
          <li key={item} className="rounded-2xl bg-muted/60 px-3 py-2">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SectionEyebrow({
  children,
  icon: Icon,
}: {
  children: string;
  icon: LucideIcon;
}) {
  return (
    <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.08em] text-muted-foreground">
      <Icon className="size-4 text-primary" aria-hidden="true" />
      <h2>{children}</h2>
    </div>
  );
}

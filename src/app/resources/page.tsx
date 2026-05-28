import Link from "next/link";
import { ArrowRight, HeartHandshake } from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";
import { JourneyStepper } from "@/components/product/journey-stepper";
import { ResourcesLoader } from "@/components/product/resources-loader";
import { SafetyNotice } from "@/components/product/safety-notice";
import { Button } from "@/components/ui/button";

export default function ResourcesPage() {
  return (
    <PageContainer size="wide" className="grid gap-8 py-10 sm:py-14">
      <JourneyStepper current="/resources" />
      <section className="grid gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div>
          <p className="text-sm font-semibold text-primary">Resources</p>
          <h1 className="mt-2 max-w-3xl text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Practical support options for the next step.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            MindBridge shows app-owned resource options that may vary by
            location and situation. They are not model-generated, exhaustive, or
            a replacement for professional care.
          </p>
        </div>
        <Button
          asChild
          className="h-11 rounded-full bg-primary px-5 text-primary-foreground hover:bg-primary/90"
        >
          <Link href="/feedback">
            Continue to feedback
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Button>
      </section>
      <div className="rounded-3xl border border-border/60 bg-card p-4 text-sm leading-6 text-muted-foreground shadow-sm">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <HeartHandshake className="size-4" aria-hidden="true" />
          </span>
          <div>
            <p className="font-semibold text-foreground">
              Use resources as support options that may vary by situation.
            </p>
            <p className="mt-1">
              If you may be in immediate danger, contact local emergency
              services or a crisis line directly.
            </p>
          </div>
        </div>
      </div>
      <SafetyNotice tone="urgent" />
      <ResourcesLoader />
    </PageContainer>
  );
}

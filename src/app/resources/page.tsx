import Link from "next/link";
import { AlertTriangle, ArrowRight, HeartHandshake } from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";
import { ResourcesLoader } from "@/components/product/resources-loader";
import { Button } from "@/components/ui/button";

export default function ResourcesPage() {
  return (
    <PageContainer size="wide" className="py-8 sm:py-12">
      <div className="mx-auto grid w-full max-w-5xl gap-8">
        <div>
          <Link
            href="/clarity-map"
            className="inline-flex min-h-10 items-center rounded-full px-3 text-sm font-semibold text-primary transition hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
          >
            Back to Clarity Map
          </Link>
        </div>

        <section className="mx-auto grid max-w-3xl gap-5 text-center">
          <div>
            <p className="text-sm font-semibold text-primary">Resources</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Support options for the next step.
            </h1>
            <p className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base">
              MindBridge shows app-owned resource options that may vary by
              location and situation. They are not model-generated, exhaustive,
              guaranteed, or a replacement for professional care.
            </p>
          </div>
          <div>
            <Button
              asChild
              variant="outline"
              className="h-11 rounded-full border-border/80 bg-card px-5 text-foreground hover:bg-muted"
            >
              <Link href="/feedback">
                Continue to feedback
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </section>

        <div className="mindbridge-ambient-shadow rounded-[2rem] border border-border/60 bg-card p-4 text-sm leading-6 text-muted-foreground">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <HeartHandshake className="size-4" aria-hidden="true" />
            </span>
            <div>
              <p className="font-semibold text-foreground">
                Use resources as support options that may vary by situation.
              </p>
              <p className="mt-1">
                These links and steps are app-owned starting points, not
                exhaustive lists, clinical review, or guaranteed support.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-destructive/25 bg-destructive/10 p-4 text-sm leading-6 text-destructive">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-background text-destructive">
              <AlertTriangle className="size-4" aria-hidden="true" />
            </span>
            <div>
              <p className="font-semibold">Need immediate support?</p>
              <p className="mt-1">
                If you may be in immediate danger, contact local emergency
                services or a crisis line directly.
              </p>
            </div>
          </div>
        </div>

        <ResourcesLoader />
      </div>
    </PageContainer>
  );
}

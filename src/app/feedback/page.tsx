import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";
import { FeedbackForm } from "@/components/product/feedback-form";
import { AnonymousDataControls } from "@/components/product/anonymous-data-controls";

export default function FeedbackPage() {
  return (
    <PageContainer size="wide" className="py-8 sm:py-12">
      <div className="mx-auto grid w-full max-w-4xl gap-8">
        <div>
          <Link
            href="/resources"
            className="inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to resources
          </Link>
        </div>

        <section className="mx-auto grid max-w-3xl gap-4 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            Feedback
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Help improve the MindBridge MVP.
          </h1>
          <p className="text-sm leading-6 text-muted-foreground sm:text-base">
            Share whether this reflection journey felt clear and useful. This
            feedback helps improve the MVP. Anonymous ratings may be retained;
            optional notes are encrypted only when journey storage was chosen.
            No analytics provider, clinical review, emergency support, or human
            follow-up is implied.
          </p>
        </section>

        <div className="mindbridge-ambient-shadow rounded-[2rem] border border-border/60 bg-card/90 p-4 sm:p-5">
          <div className="flex items-start gap-3 text-sm leading-6 text-muted-foreground">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ShieldCheck className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="font-semibold text-foreground">
                A quiet product feedback step.
              </p>
              <p className="mt-1">
                MindBridge is not therapy, diagnosis, treatment, medical advice,
                a crisis service, or a replacement for professional care.
              </p>
            </div>
          </div>
        </div>

        <FeedbackForm />
        <AnonymousDataControls />
      </div>
    </PageContainer>
  );
}

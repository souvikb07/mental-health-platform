import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";
import { FeedbackForm } from "@/components/product/feedback-form";
import { JourneyStepper } from "@/components/product/journey-stepper";
import { SafetyNotice } from "@/components/product/safety-notice";
import { Button } from "@/components/ui/button";

export default function FeedbackPage() {
  return (
    <PageContainer size="narrow" className="grid gap-8 py-10 sm:py-14">
      <JourneyStepper current="/feedback" />
      <div>
        <p className="text-sm font-semibold text-primary">Feedback</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Help improve the MindBridge MVP.
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
          This quiet end-of-journey loop checks whether the reflection flow felt
          clear and useful. No database persistence, analytics tracking, or
          clinical review is implied.
        </p>
      </div>
      <SafetyNotice />
      <div className="mindbridge-ambient-shadow rounded-[2rem] border border-border/60 bg-card p-5 sm:p-6">
        <FeedbackForm />
      </div>
      <div>
        <Button
          asChild
          variant="outline"
          className="h-11 rounded-full border-border/80 bg-card px-5 text-foreground hover:bg-muted"
        >
          <Link href="/">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to landing
          </Link>
        </Button>
      </div>
    </PageContainer>
  );
}

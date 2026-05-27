import Link from "next/link";

import { PageContainer } from "@/components/layout/page-container";
import { FeedbackForm } from "@/components/product/feedback-form";
import { JourneyStepper } from "@/components/product/journey-stepper";
import { SafetyNotice } from "@/components/product/safety-notice";
import { Button } from "@/components/ui/button";

export default function FeedbackPage() {
  return (
    <PageContainer size="narrow" className="grid gap-8">
      <JourneyStepper current="/feedback" />
      <div>
        <p className="text-sm font-medium text-emerald-800">Feedback</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-emerald-950">
          Help judge whether the mock journey is clear.
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          This form posts to an internal mock API for Block 2. It does not save
          to a database or send analytics.
        </p>
      </div>
      <SafetyNotice />
      <div className="rounded-lg border border-emerald-950/10 bg-white p-5 shadow-sm">
        <FeedbackForm />
      </div>
      <div>
        <Button asChild variant="outline" className="h-10 px-4">
          <Link href="/">Back to landing</Link>
        </Button>
      </div>
    </PageContainer>
  );
}

import { PageContainer } from "@/components/layout/page-container";
import { JourneyStepper } from "@/components/product/journey-stepper";
import { OnboardingForm } from "@/components/product/onboarding-form";
import { SafetyNotice } from "@/components/product/safety-notice";

export default function OnboardingPage() {
  return (
    <PageContainer size="default" className="grid gap-8 py-10 sm:py-14">
      <JourneyStepper current="/onboarding" />

      <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div className="space-y-5">
          <p className="inline-flex rounded-full border border-border/70 bg-card px-4 py-2 text-sm font-semibold text-primary shadow-sm">
            Setup for reflection
          </p>
          <div className="space-y-3">
            <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Set the context gently.
            </h1>
            <p className="max-w-2xl text-base leading-8 text-muted-foreground">
              This helps MindBridge tailor the first reflection prompt and show
              support options that better fit your location. Share only what you
              want to include.
            </p>
          </div>
          <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
            <h2 className="text-base font-semibold text-foreground">
              What this step does
            </h2>
            <ul className="mt-4 grid gap-3 text-sm leading-6 text-muted-foreground">
              <li>Creates an anonymous session for this MVP flow.</li>
              <li>Uses your selected concern to open the guided chat.</li>
              <li>
                Keeps the experience focused on reflection, not a diagnosis.
              </li>
            </ul>
          </div>
          <SafetyNotice />
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-border/60 bg-muted p-4 text-sm leading-6 text-muted-foreground">
            <p className="font-semibold text-foreground">Before you begin</p>
            <p className="mt-1">
              MindBridge is for reflection and support options. It is not
              therapy, diagnosis, treatment, medical advice, a crisis service,
              or a replacement for professional care.
            </p>
          </div>
          <OnboardingForm />
        </div>
      </div>
    </PageContainer>
  );
}

import { PageContainer } from "@/components/layout/page-container";
import { JourneyStepper } from "@/components/product/journey-stepper";
import { OnboardingForm } from "@/components/product/onboarding-form";
import { SafetyNotice } from "@/components/product/safety-notice";

export default function OnboardingPage() {
  return (
    <PageContainer size="narrow" className="grid gap-8">
      <JourneyStepper current="/onboarding" />
      <div>
        <p className="text-sm font-medium text-emerald-800">Onboarding</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-emerald-950">
          Set the context for this reflection.
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          Share only what you want to include. This demo does not save or send
          your answers anywhere.
        </p>
      </div>
      <SafetyNotice />
      <OnboardingForm />
    </PageContainer>
  );
}

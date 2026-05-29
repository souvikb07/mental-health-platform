import { PageContainer } from "@/components/layout/page-container";
import { OnboardingForm } from "@/components/product/onboarding-form";

export default function OnboardingPage() {
  return (
    <PageContainer
      size="narrow"
      className="flex min-h-[calc(100vh-9rem)] items-start justify-center py-10 sm:py-14 lg:py-16"
    >
      <OnboardingForm />
    </PageContainer>
  );
}

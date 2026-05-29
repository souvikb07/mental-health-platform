import Link from "next/link";

import { PageContainer } from "@/components/layout/page-container";
import { OnboardingForm } from "@/components/product/onboarding-form";

export default function OnboardingPage() {
  return (
    <PageContainer
      size="narrow"
      className="flex min-h-[calc(100vh-9rem)] items-start justify-center py-10 sm:py-14 lg:py-16"
    >
      <div className="w-full max-w-2xl">
        <Link
          href="/"
          className="mb-4 inline-flex min-h-10 items-center rounded-full px-3 text-sm font-semibold text-primary transition hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
        >
          Back to overview
        </Link>
        <OnboardingForm />
      </div>
    </PageContainer>
  );
}

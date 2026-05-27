import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";
import { JourneyStepper } from "@/components/product/journey-stepper";
import { ResourcesLoader } from "@/components/product/resources-loader";
import { SafetyNotice } from "@/components/product/safety-notice";
import { Button } from "@/components/ui/button";

export default function ResourcesPage() {
  return (
    <PageContainer className="grid gap-8">
      <JourneyStepper current="/resources" />
      <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <p className="text-sm font-medium text-emerald-800">Resources</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-emerald-950">
            Curated next support steps from local app data.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
            These mock recommendations are deterministic and owned by the app.
            They are not invented by a model.
          </p>
        </div>
        <Button asChild className="h-10 bg-emerald-900 px-4 text-white hover:bg-emerald-800">
          <Link href="/feedback">
            Continue to feedback
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
      <SafetyNotice tone="urgent" />
      <ResourcesLoader />
    </PageContainer>
  );
}

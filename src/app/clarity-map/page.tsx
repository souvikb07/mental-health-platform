import { PageContainer } from "@/components/layout/page-container";
import { ClarityMapLoader } from "@/components/product/clarity-map-loader";
import { JourneyStepper } from "@/components/product/journey-stepper";

export default function ClarityMapPage() {
  return (
    <PageContainer className="grid gap-8">
      <JourneyStepper current="/clarity-map" />
      <div>
        <p className="text-sm font-medium text-emerald-800">Clarity Map</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-emerald-950">
          A non-diagnostic summary of patterns and next steps.
        </h1>
      </div>
      <ClarityMapLoader />
    </PageContainer>
  );
}

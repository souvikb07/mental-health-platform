import { PageContainer } from "@/components/layout/page-container";
import { ClarityMapLoader } from "@/components/product/clarity-map-loader";
import { JourneyStepper } from "@/components/product/journey-stepper";

export default function ClarityMapPage() {
  return (
    <PageContainer size="wide" className="grid gap-8 py-10 sm:py-14">
      <JourneyStepper current="/clarity-map" />
      <section className="grid gap-4 md:grid-cols-[minmax(0,1fr)_18rem] md:items-end">
        <div>
          <p className="text-sm font-semibold text-primary">Clarity Map</p>
          <h1 className="mt-2 max-w-3xl text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            A non-diagnostic summary of patterns and next steps.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Created only from the guided chat you generated. It is a reflection
            artifact, not a diagnosis, medical advice, or clinical rating.
          </p>
        </div>
        <div className="rounded-3xl border border-border/60 bg-card p-4 text-sm leading-6 text-muted-foreground shadow-sm">
          <p className="font-semibold text-foreground">
            Based only on this conversation.
          </p>
          <p className="mt-1">
            Safety or boundary-blocked conversations stay in chat and do not
            become a normal map.
          </p>
        </div>
      </section>
      <ClarityMapLoader />
    </PageContainer>
  );
}

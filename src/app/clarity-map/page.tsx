import Link from "next/link";

import { PageContainer } from "@/components/layout/page-container";
import { ClarityMapLoader } from "@/components/product/clarity-map-loader";

export default function ClarityMapPage() {
  return (
    <PageContainer size="wide" className="py-8 sm:py-12">
      <div className="mx-auto grid w-full max-w-5xl gap-8">
        <div>
          <Link
            href="/chat"
            className="inline-flex min-h-10 items-center rounded-full px-3 text-sm font-semibold text-primary transition hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
          >
            Back to chat
          </Link>
        </div>

        <section className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold text-primary">Clarity Map</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            A non-diagnostic reflection artifact.
          </h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base">
            Created only from the guided chat you generated. Based only on this
            conversation.
          </p>
        </section>

        <ClarityMapLoader />
      </div>
    </PageContainer>
  );
}

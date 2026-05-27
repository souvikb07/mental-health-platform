import Link from "next/link";
import { ArrowRight, ClipboardList } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ClarityMap } from "@/types/clarity-map";

type ClarityMapCardProps = {
  clarityMap: ClarityMap;
  showResourceLink?: boolean;
};

export function ClarityMapCard({
  clarityMap,
  showResourceLink = true,
}: ClarityMapCardProps) {
  return (
    <Card className="rounded-lg border border-emerald-950/10 bg-white shadow-sm">
      <CardHeader>
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md bg-emerald-900 text-white">
            <ClipboardList className="size-4" aria-hidden="true" />
          </span>
          <div>
            <CardTitle className="text-base text-emerald-950">
              {clarityMap.headline}
            </CardTitle>
            <CardDescription className="mt-1">
              {clarityMap.nonDiagnosisNotice}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6">
        <section>
          <h2 className="text-sm font-semibold text-slate-950">Patterns that may be present</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {clarityMap.patterns.map((pattern) => (
              <div key={pattern.title} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-medium text-slate-950">{pattern.title}</h3>
                <p className="mt-2 text-xs leading-6 text-slate-600">{pattern.description}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="grid gap-4 md:grid-cols-3">
          <ListBlock title="Focus areas" items={clarityMap.focusAreas} />
          <ListBlock title="Next 24 hours" items={clarityMap.next24Hours} />
          <ListBlock title="Next 7 days" items={clarityMap.next7Days} />
        </section>
        <section className="rounded-lg border border-emerald-900/15 bg-emerald-50 p-4">
          <h2 className="text-sm font-semibold text-emerald-950">Suggested support path</h2>
          <p className="mt-2 text-sm leading-6 text-emerald-950/80">
            {clarityMap.suggestedSupportPath}
          </p>
        </section>
        {showResourceLink ? (
          <div>
            <Button asChild className="h-10 bg-emerald-900 px-4 text-white hover:bg-emerald-800">
              <Link href="/resources">
                View resources
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
        {items.map((item) => (
          <li key={item} className="rounded-md bg-slate-50 px-3 py-2">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

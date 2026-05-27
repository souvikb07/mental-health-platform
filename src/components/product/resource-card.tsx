import Link from "next/link";
import { ArrowUpRight, LifeBuoy } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { SupportResource } from "@/types/resource";

type ResourceCardProps = {
  resource: SupportResource;
};

export function ResourceCard({ resource }: ResourceCardProps) {
  return (
    <Card className="rounded-lg border border-emerald-950/10 bg-white shadow-sm">
      <CardHeader>
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md bg-slate-900 text-white">
            <LifeBuoy className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <CardTitle className="text-base text-slate-950">{resource.title}</CardTitle>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="secondary" className="rounded-md">
                {resource.type}
              </Badge>
              <Badge variant="outline" className="rounded-md">
                {resource.country}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-6 text-slate-600">{resource.description}</p>
      </CardContent>
      <CardFooter>
        <Button asChild variant="outline" className="h-9 px-3">
          <Link href={resource.href}>
            {resource.actionLabel}
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

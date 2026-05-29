import Link from "next/link";
import { ArrowUpRight, Clock3, LifeBuoy, Phone } from "lucide-react";

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
    <Card className="mindbridge-ambient-shadow flex h-full flex-col rounded-[1.75rem] border-border/60 bg-card transition-transform duration-300 hover:-translate-y-1">
      <CardHeader className="pb-4">
        <div className="grid gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <LifeBuoy className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <CardTitle className="text-lg leading-7 text-foreground">
              {resource.title}
            </CardTitle>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge
                variant="secondary"
                className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground"
              >
                {resource.type}
              </Badge>
              <Badge
                variant="outline"
                className="rounded-full border-border/70 px-3 py-1 text-xs font-semibold text-muted-foreground"
              >
                {resource.country}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid flex-1 content-start gap-4">
        <p className="text-sm leading-6 text-muted-foreground">
          {resource.description}
        </p>
        {resource.phone ? (
          <p className="flex min-w-0 items-center gap-2 rounded-2xl border border-border/50 bg-muted/60 px-3 py-2 text-sm font-semibold text-foreground">
            <Phone className="size-4 text-primary" aria-hidden="true" />
            <span className="break-all">{resource.phone}</span>
          </p>
        ) : null}
        {resource.availabilityNote ? (
          <p className="flex items-start gap-2 rounded-2xl bg-muted/40 px-3 py-2 text-xs leading-5 text-muted-foreground">
            <Clock3
              className="mt-0.5 size-3.5 shrink-0 text-primary"
              aria-hidden="true"
            />
            {resource.availabilityNote}
          </p>
        ) : null}
      </CardContent>
      <CardFooter>
        <Button
          asChild
          variant="outline"
          className="min-h-11 w-full rounded-full border-border/80 bg-card px-4 text-foreground hover:bg-muted"
        >
          <Link href={resource.href}>
            {resource.actionLabel}
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

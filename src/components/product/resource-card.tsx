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
    <Card className="flex h-full flex-col rounded-[1.5rem] border-border/60 bg-card shadow-sm">
      <CardHeader>
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <LifeBuoy className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <CardTitle className="text-base leading-6 text-foreground">
              {resource.title}
            </CardTitle>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge
                variant="secondary"
                className="rounded-full bg-muted px-3 py-1 text-muted-foreground"
              >
                {resource.type}
              </Badge>
              <Badge
                variant="outline"
                className="rounded-full border-border/70 px-3 py-1 text-muted-foreground"
              >
                {resource.country}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid flex-1 gap-3">
        <p className="text-sm leading-6 text-muted-foreground">
          {resource.description}
        </p>
        {resource.phone ? (
          <p className="flex items-center gap-2 rounded-2xl border border-border/50 bg-muted/60 px-3 py-2 text-sm font-semibold text-foreground">
            <Phone className="size-4 text-primary" aria-hidden="true" />
            {resource.phone}
          </p>
        ) : null}
        {resource.availabilityNote ? (
          <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
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
          className="h-10 rounded-full border-border/80 bg-card px-4 text-foreground hover:bg-muted"
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

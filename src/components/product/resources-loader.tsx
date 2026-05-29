"use client";

import { useEffect, useState } from "react";

import { ResourceCard } from "@/components/product/resource-card";
import { fetchResources } from "@/lib/api/client";
import { mockResources } from "@/lib/mock/mock-resources";
import { loadSessionContext } from "@/lib/session/journey-storage";
import type { SupportResource } from "@/types/resource";

export function ResourcesLoader() {
  const [resources, setResources] = useState<SupportResource[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sessionContext = loadSessionContext();

    fetchResources({
      countryCode: sessionContext?.countryCode ?? "GLOBAL",
      topic: "stress",
    })
      .then((response) => setResources(response.resources))
      .catch(() => {
        setError(
          "Showing app-owned fallback resources because the resources service did not respond.",
        );
        setResources(mockResources);
      });
  }, []);

  if (resources.length === 0) {
    return (
      <div className="mindbridge-ambient-shadow mx-auto max-w-3xl rounded-[2rem] border border-border/60 bg-card p-5 text-sm leading-6 text-muted-foreground sm:p-6">
        <p className="font-semibold text-foreground">
          Loading support options...
        </p>
        <p className="mt-1">
          Checking the app-owned resource list for options that fit this MVP
          session.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      {error ? (
        <p className="rounded-2xl border border-amber-900/20 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          {error}
        </p>
      ) : null}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {resources.map((resource) => (
          <ResourceCard key={resource.id} resource={resource} />
        ))}
      </div>
    </div>
  );
}

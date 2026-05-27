"use client";

import { useEffect, useState } from "react";

import { ResourceCard } from "@/components/product/resource-card";
import { fetchResources } from "@/lib/api/client";
import { mockResources } from "@/lib/mock/mock-resources";
import type { SupportResource } from "@/types/resource";
import type { SessionContext } from "@/types/session-context";

export function ResourcesLoader() {
  const [resources, setResources] = useState<SupportResource[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sessionContext = getStoredSessionContext();

    fetchResources({
      countryCode: sessionContext?.countryCode ?? "GLOBAL",
      topic: "stress",
    })
      .then((response) => setResources(response.resources))
      .catch(() => {
        setError("Showing local fallback because the mock API did not respond.");
        setResources(mockResources);
      });
  }, []);

  if (resources.length === 0) {
    return (
      <div className="rounded-lg border border-emerald-950/10 bg-white p-5 text-sm text-slate-600">
        Loading mock resources...
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {error ? <p className="text-sm text-amber-700">{error}</p> : null}
      <div className="grid gap-4 md:grid-cols-2">
        {resources.map((resource) => (
          <ResourceCard key={resource.id} resource={resource} />
        ))}
      </div>
    </div>
  );
}

function getStoredSessionContext(): SessionContext | undefined {
  const stored = window.localStorage.getItem("mindbridge.sessionContext");

  if (!stored) {
    return undefined;
  }

  try {
    return JSON.parse(stored) as SessionContext;
  } catch {
    return undefined;
  }
}

"use client";

import { useEffect, useState } from "react";

import { ClarityMapCard } from "@/components/product/clarity-map-card";
import { fetchClarityMap } from "@/lib/api/client";
import { mockClarityMap } from "@/lib/mock/mock-clarity-map";
import type { ClarityMap } from "@/types/clarity-map";

export function ClarityMapLoader() {
  const [clarityMap, setClarityMap] = useState<ClarityMap | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sessionId =
      window.localStorage.getItem("mindbridge.sessionId") ?? "mock_session_demo";

    fetchClarityMap({ sessionId })
      .then((response) => setClarityMap(response.clarityMap))
      .catch(() => {
        setError("Showing local fallback because the mock API did not respond.");
        setClarityMap(mockClarityMap);
      });
  }, []);

  if (!clarityMap) {
    return (
      <div className="rounded-lg border border-emerald-950/10 bg-white p-5 text-sm text-slate-600">
        Loading mock Clarity Map...
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {error ? <p className="text-sm text-amber-700">{error}</p> : null}
      <ClarityMapCard clarityMap={clarityMap} />
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { StructuredClarityMapCard } from "@/components/product/clarity-map-card";
import { Button } from "@/components/ui/button";
import type { EnhancedClarityMapResponse } from "@/lib/api/client";

type LoadState =
  | { status: "loading" }
  | {
      status: "ready";
      response: Extract<EnhancedClarityMapResponse, { type: "clarity_map" }>;
    }
  | { status: "missing" };

export function ClarityMapLoader() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const requestedSessionId = new URLSearchParams(window.location.search).get(
        "sessionId",
      );
      const response = getStoredGeneratedClarityMap(requestedSessionId);

      if (response) {
        setState({ status: "ready", response });
        return;
      }

      setState({ status: "missing" });
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  if (state.status === "loading") {
    return (
      <div className="rounded-lg border border-emerald-950/10 bg-white p-5 text-sm text-slate-600">
        Loading your Clarity Map...
      </div>
    );
  }

  if (state.status === "missing") {
    return (
      <div className="rounded-lg border border-emerald-950/10 bg-white p-5 text-sm leading-6 text-slate-700 shadow-sm">
        <p className="font-medium text-slate-950">
          Generate your Clarity Map from a conversation first.
        </p>
        <p className="mt-1">
          Return to guided chat and generate a map once there is enough context.
        </p>
        <Button
          asChild
          className="mt-4 h-10 bg-emerald-900 px-4 text-white hover:bg-emerald-800"
        >
          <Link href="/chat">Back to chat</Link>
        </Button>
      </div>
    );
  }

  return <StructuredClarityMapCard clarityMap={state.response.clarityMap} />;
}

function getStoredGeneratedClarityMap(sessionId: string | null) {
  const storage = getSessionStorage();

  if (!storage) {
    return null;
  }

  const resolvedSessionId =
    sessionId ?? storage.getItem("mindbridge:last-clarity-map-session");

  if (!resolvedSessionId) {
    return null;
  }

  const stored = storage.getItem(getClarityMapStorageKey(resolvedSessionId));

  if (!stored) {
    return null;
  }

  try {
    const parsed = JSON.parse(stored) as Partial<EnhancedClarityMapResponse>;

    if (
      parsed.type === "clarity_map" &&
      (parsed.source === "openai" || parsed.source === "fallback") &&
      parsed.clarityMap
    ) {
      return parsed as Extract<
        EnhancedClarityMapResponse,
        { type: "clarity_map" }
      >;
    }
  } catch {
    return null;
  }

  return null;
}

function getClarityMapStorageKey(sessionId: string) {
  return `mindbridge:clarity-map:${sessionId}`;
}

function getSessionStorage() {
  try {
    return typeof window !== "undefined" && window.sessionStorage
      ? window.sessionStorage
      : null;
  } catch {
    return null;
  }
}

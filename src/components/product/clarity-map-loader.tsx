"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, FileSearch, Sparkles } from "lucide-react";

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
      <div className="mindbridge-ambient-shadow rounded-[2rem] border border-border/60 bg-card p-6 text-sm leading-6 text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Sparkles className="size-4" aria-hidden="true" />
          </span>
          <div>
            <p className="font-semibold text-foreground">
              Loading your Clarity Map...
            </p>
            <p className="mt-1">
              Checking this browser session for a generated reflection map.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (state.status === "missing") {
    return (
      <div className="mindbridge-ambient-shadow rounded-[2rem] border border-border/60 bg-card p-6 text-sm leading-6 text-muted-foreground sm:p-8">
        <div className="grid gap-5 md:grid-cols-[auto,minmax(0,1fr)] md:items-start">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <FileSearch className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-lg font-semibold text-foreground">
              Generate your Clarity Map from a conversation first.
            </p>
            <p className="mt-2 max-w-2xl">
              Return to guided chat and generate a map once there is enough
              context. MindBridge does not show a static or old mock map when a
              real generated map is not available.
            </p>
            <Button
              asChild
              className="mt-5 h-11 rounded-full bg-primary px-5 text-primary-foreground hover:bg-primary/90"
            >
              <Link href="/chat">
                Back to chat
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
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

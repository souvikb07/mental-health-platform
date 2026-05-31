"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, FileSearch, Sparkles } from "lucide-react";

import { StructuredClarityMapCard } from "@/components/product/clarity-map-card";
import { Button } from "@/components/ui/button";
import {
  loadGeneratedClarityMap,
  loadLastSessionId,
} from "@/lib/session/journey-storage";
import { hydrateCurrentJourney } from "@/lib/session/server-hydration";
import type { HydratedClarityMapResponse } from "@/types/session-hydration";

type LoadState =
  | { status: "loading" }
  | {
      status: "ready";
      response: HydratedClarityMapResponse;
    }
  | { status: "missing" };

export function ClarityMapLoader() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let isMounted = true;

    async function loadClarityMap() {
      const requestedSessionId = new URLSearchParams(window.location.search).get(
        "sessionId",
      );
      await hydrateCurrentJourney({
        sessionId: requestedSessionId ?? loadLastSessionId(),
      });
      const response = loadGeneratedClarityMap(requestedSessionId);

      if (isMounted && response) {
        setState({ status: "ready", response });
        return;
      }

      if (isMounted) {
        setState({ status: "missing" });
      }
    }

    void loadClarityMap();

    return () => {
      isMounted = false;
    };
  }, []);

  if (state.status === "loading") {
    return (
      <div className="mindbridge-ambient-shadow mx-auto max-w-3xl rounded-[2rem] border border-border/60 bg-card p-5 text-sm leading-6 text-muted-foreground sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
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
      <div className="mindbridge-ambient-shadow mx-auto max-w-3xl rounded-[2rem] border border-border/60 bg-card p-6 text-sm leading-6 text-muted-foreground sm:p-8">
        <div className="grid gap-5 sm:grid-cols-[auto,minmax(0,1fr)] sm:items-start">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
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

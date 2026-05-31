// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ClarityMapLoader } from "../../src/components/product/clarity-map-loader";
import type { EnhancedClarityMapResponse } from "../../src/lib/api/client";
import type { StructuredClarityMap } from "../../src/types/clarity-map";

const hydrationMocks = vi.hoisted(() => ({
  hydrateCurrentJourney: vi.fn(),
}));

vi.mock("@/lib/session/server-hydration", () => hydrationMocks);

describe("ClarityMapLoader", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.history.pushState(null, "", "/clarity-map");
    hydrationMocks.hydrateCurrentJourney.mockReset();
    hydrationMocks.hydrateCurrentJourney.mockResolvedValue(null);
  });

  afterEach(() => {
    cleanup();
  });

  it("renders a stored generated clarity map from sessionStorage", async () => {
    window.history.pushState(
      null,
      "",
      "/clarity-map?sessionId=mock_session_loader",
    );
    window.sessionStorage.setItem(
      "mindbridge:clarity-map:mock_session_loader",
      JSON.stringify(clarityMapResponse),
    );

    render(<ClarityMapLoader />);

    expect(await screen.findByText("Harmony Signal")).toBeTruthy();
    expect(screen.getByText("Key Insight")).toBeTruthy();
    expect(screen.getByText("Boundary Focus")).toBeTruthy();
    expect(screen.getByText("Support Path")).toBeTruthy();
    expect(screen.getByText("Pressure is visible: 60/100")).toBeTruthy();
  });

  it("renders a stored generated clarity map from the last-session pointer", async () => {
    window.sessionStorage.setItem(
      "mindbridge:last-clarity-map-session",
      "mock_session_loader",
    );
    window.sessionStorage.setItem(
      "mindbridge:clarity-map:mock_session_loader",
      JSON.stringify(clarityMapResponse),
    );

    render(<ClarityMapLoader />);

    expect(await screen.findByText("Harmony Signal")).toBeTruthy();
    expect(screen.getByText("Pressure is visible: 60/100")).toBeTruthy();
  });

  it("renders a generated map restored by server hydration", async () => {
    window.history.pushState(
      null,
      "",
      "/clarity-map?sessionId=11111111-1111-4111-8111-111111111111",
    );
    hydrationMocks.hydrateCurrentJourney.mockImplementation(async () => {
      window.sessionStorage.setItem(
        "mindbridge:clarity-map:11111111-1111-4111-8111-111111111111",
        JSON.stringify(clarityMapResponse),
      );
      return null;
    });

    render(<ClarityMapLoader />);

    expect(await screen.findByText("Harmony Signal")).toBeTruthy();
    expect(screen.getByText("Pressure is visible: 60/100")).toBeTruthy();
  });

  it("shows a chat CTA when no generated clarity map exists", async () => {
    render(<ClarityMapLoader />);

    expect(
      await screen.findByText(
        "Generate your Clarity Map from a conversation first.",
      ),
    ).toBeTruthy();
    expect(screen.getByText("Back to chat")).toBeTruthy();
    await waitFor(() => {
      expect(screen.queryByText("Loading mock Clarity Map...")).toBeNull();
    });
  });

  it("does not render old static mock content by default", async () => {
    render(<ClarityMapLoader />);

    await screen.findByText(
      "Generate your Clarity Map from a conversation first.",
    );
    expect(screen.queryByText("Patterns that may be present")).toBeNull();
  });

  it("shows the chat CTA for malformed stored data", async () => {
    window.history.pushState(
      null,
      "",
      "/clarity-map?sessionId=mock_session_loader",
    );
    window.sessionStorage.setItem(
      "mindbridge:clarity-map:mock_session_loader",
      "{bad-json",
    );

    render(<ClarityMapLoader />);

    expect(
      await screen.findByText(
        "Generate your Clarity Map from a conversation first.",
      ),
    ).toBeTruthy();
  });
});

const clarityMap: StructuredClarityMap = {
  schemaVersion: "clarity_map.v1",
  status: "generated",
  disclaimer: "This is not a diagnosis. It is a reflection map.",
  harmonySignal: {
    label: "Pressure is visible",
    score: 60,
    band: "mixed",
    explanation: "The transcript suggests pressure with some clarity.",
    components: {
      emotionalLoad: 3,
      triggerClarity: 2,
      supportConnection: 2,
      actionReadiness: 2,
      safetyStability: 3,
    },
  },
  keyInsight: {
    title: "Overload may be crowding clarity",
    summary: "Work pressure may be following the user into recovery time.",
    evidence: [
      { point: "The user named overwhelm.", evidenceMessageIds: ["u1"] },
      { point: "The user mentioned work.", evidenceMessageIds: ["u1"] },
      { point: "The user asked for a small step.", evidenceMessageIds: ["u2"] },
    ],
  },
  boundaryFocus: {
    title: "Protect one recovery boundary",
    boundaryType: "energy_boundary",
    insights: ["A small boundary may help.", "Recovery time may need protection."],
    smallExperiment: "Shrink one task today.",
  },
  actionPlan: {
    next24Hours: [
      { action: "Write two sentences.", whyThisHelps: "It clarifies pressure." },
      { action: "Take a short pause.", whyThisHelps: "It supports reflection." },
      { action: "Text a trusted person.", whyThisHelps: "It adds support." },
    ],
    next7Days: [
      { action: "Track pressure moments.", whyThisHelps: "It reveals patterns." },
      { action: "Try a shutdown cue.", whyThisHelps: "It protects recovery." },
      { action: "Consider support.", whyThisHelps: "It can help explore patterns." },
    ],
  },
  supportPath: {
    recommendation: "Start with practical reflection and trusted support.",
    suggestedResourceTopics: ["stress", "support"],
    professionalSupportNote: "This is not a diagnosis.",
  },
  confidence: "medium",
};

const clarityMapResponse: EnhancedClarityMapResponse = {
  type: "clarity_map",
  source: "fallback",
  clarityMap,
};

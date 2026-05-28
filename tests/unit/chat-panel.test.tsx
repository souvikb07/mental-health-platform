// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ChatPanel } from "../../src/components/product/chat-panel";
import type { ContextIntakeResponse } from "../../src/lib/api/client";
import type { SessionContext } from "../../src/types/session-context";

const apiMocks = vi.hoisted(() => ({
  fetchContextIntake: vi.fn(),
  sendChatMessage: vi.fn(),
}));

vi.mock("@/lib/api/client", () => apiMocks);

const sessionContext: SessionContext = {
  sessionId: "mock_session_chat_panel",
  countryCode: "US",
  countryLabel: "USA",
  ageConfirmed: true,
  consentAccepted: true,
  mainConcernCategory: "overwhelmed",
  mainConcernLabel: "Overwhelmed",
};

const openerResponse: ContextIntakeResponse = {
  type: "opener",
  source: "fallback",
  assistantMessage: {
    id: "context_intake_test",
    role: "assistant",
    content:
      "It sounds like things feel heavy right now; what feels most pressing today?",
    createdAt: "2026-05-28T00:00:00.000Z",
  },
  contextIntake: {
    schemaVersion: "context_intake.v1",
    openingMessage:
      "It sounds like things feel heavy right now; what feels most pressing today?",
    inferredFocusAreas: ["overwhelm"],
    firstQuestionType: "clarify_main_pressure",
    tone: "warm_grounded",
    safetyNoteNeeded: false,
    shouldMentionProfessionalSupport: false,
    confidence: "medium",
  },
};

describe("ChatPanel context opener", () => {
  beforeEach(() => {
    window.localStorage.clear();
    apiMocks.fetchContextIntake.mockReset();
    apiMocks.sendChatMessage.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows an onboarding CTA when session context is missing", async () => {
    render(<ChatPanel />);

    expect(await screen.findByText("Start with onboarding first.")).toBeTruthy();
    expect(screen.getByText("Go to onboarding")).toBeTruthy();
    expect(apiMocks.fetchContextIntake).not.toHaveBeenCalled();
  });

  it("displays one context-aware opener and no fake preloaded user messages", async () => {
    window.localStorage.setItem(
      "mindbridge.sessionContext",
      JSON.stringify(sessionContext),
    );
    apiMocks.fetchContextIntake.mockResolvedValue(openerResponse);

    render(<ChatPanel />);

    await screen.findByText(openerResponse.assistantMessage.content);

    expect(
      screen.queryByText(/I feel tense most evenings/i),
    ).toBeNull();
    expect(
      screen.getAllByText(openerResponse.assistantMessage.content),
    ).toHaveLength(1);
    expect(apiMocks.fetchContextIntake).toHaveBeenCalledTimes(1);
  });

  it("uses a stored opener instead of calling context intake repeatedly", async () => {
    window.localStorage.setItem(
      "mindbridge.sessionContext",
      JSON.stringify(sessionContext),
    );
    window.localStorage.setItem(
      `mindbridge.contextOpener.${sessionContext.sessionId}`,
      JSON.stringify({
        id: openerResponse.assistantMessage.id,
        role: openerResponse.assistantMessage.role,
        content: openerResponse.assistantMessage.content,
      }),
    );

    const { rerender } = render(<ChatPanel />);

    await screen.findByText(openerResponse.assistantMessage.content);
    rerender(<ChatPanel />);

    await waitFor(() => {
      expect(apiMocks.fetchContextIntake).not.toHaveBeenCalled();
    });
    expect(
      screen.getAllByText(openerResponse.assistantMessage.content),
    ).toHaveLength(1);
  });
});

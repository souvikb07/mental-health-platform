// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ChatPanel } from "../../src/components/product/chat-panel";
import type {
  ChatResponse,
  ContextIntakeResponse,
  EnhancedClarityMapResponse,
} from "../../src/lib/api/client";
import {
  JOURNEY_LAST_SESSION_ID_KEY,
  JOURNEY_SESSION_CONTEXT_KEY,
  getChatMetaStorageKey,
  getChatStorageKey,
} from "../../src/lib/session/journey-storage";
import type { StructuredClarityMap } from "../../src/types/clarity-map";
import type { SessionContext } from "../../src/types/session-context";

const apiMocks = vi.hoisted(() => ({
  fetchContextIntake: vi.fn(),
  fetchEnhancedClarityMap: vi.fn(),
  sendChatMessage: vi.fn(),
}));

const navigationMocks = vi.hoisted(() => ({
  push: vi.fn(),
}));

vi.mock("@/lib/api/client", () => apiMocks);
vi.mock("next/navigation", () => ({
  useRouter: () => navigationMocks,
}));

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

function storeSessionContext(context: SessionContext) {
  window.sessionStorage.setItem(
    JOURNEY_SESSION_CONTEXT_KEY,
    JSON.stringify(context),
  );
  window.sessionStorage.setItem(JOURNEY_LAST_SESSION_ID_KEY, context.sessionId);
}

describe("ChatPanel context opener", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    apiMocks.fetchContextIntake.mockReset();
    apiMocks.fetchEnhancedClarityMap.mockReset();
    apiMocks.sendChatMessage.mockReset();
    navigationMocks.push.mockReset();
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
    storeSessionContext(sessionContext);
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

  it("hydrates saved chat messages instead of calling context intake", async () => {
    storeSessionContext(sessionContext);
    window.sessionStorage.setItem(
      getChatStorageKey(sessionContext.sessionId),
      JSON.stringify([
        {
          id: openerResponse.assistantMessage.id,
          role: openerResponse.assistantMessage.role,
          content: openerResponse.assistantMessage.content,
          createdAt: openerResponse.assistantMessage.createdAt,
        },
      ]),
    );

    render(<ChatPanel />);

    await screen.findByText(openerResponse.assistantMessage.content);
    expect(apiMocks.fetchContextIntake).not.toHaveBeenCalled();
    expect(
      screen.getAllByText(openerResponse.assistantMessage.content),
    ).toHaveLength(1);
  });

  it("does not duplicate the opener after a refresh-style remount", async () => {
    storeSessionContext(sessionContext);
    apiMocks.fetchContextIntake.mockResolvedValue(openerResponse);

    render(<ChatPanel />);

    await screen.findByText(openerResponse.assistantMessage.content);
    expect(apiMocks.fetchContextIntake).toHaveBeenCalledTimes(1);

    cleanup();
    render(<ChatPanel />);

    await screen.findByText(openerResponse.assistantMessage.content);
    expect(apiMocks.fetchContextIntake).toHaveBeenCalledTimes(1);
    expect(
      screen.getAllByText(openerResponse.assistantMessage.content),
    ).toHaveLength(1);
  });

  it("sends session context and current chat messages when generating a clarity map", async () => {
    const user = userEvent.setup();
    storeSessionContext(sessionContext);
    apiMocks.fetchContextIntake.mockResolvedValue(openerResponse);
    apiMocks.sendChatMessage.mockResolvedValue(chatResponse);
    apiMocks.fetchEnhancedClarityMap.mockResolvedValue(clarityMapResponse);

    render(<ChatPanel />);

    await screen.findByText(openerResponse.assistantMessage.content);
    await user.type(
      screen.getByLabelText("Your message"),
      "I feel overwhelmed after work.",
    );
    await user.click(screen.getByRole("button", { name: "Send message" }));
    await screen.findByText(chatResponse.assistantMessage.content);
    await user.click(
      screen.getByRole("button", { name: /generate clarity map/i }),
    );

    await waitFor(() => {
      expect(apiMocks.fetchEnhancedClarityMap).toHaveBeenCalledTimes(1);
    });

    const payload = apiMocks.fetchEnhancedClarityMap.mock.calls[0][0];
    expect(payload.sessionId).toBe(sessionContext.sessionId);
    expect(payload.sessionContext).toEqual(sessionContext);
    expect(payload.messages).toHaveLength(3);
    expect(payload.messages.map((item: { role: string }) => item.role)).toEqual([
      "assistant",
      "user",
      "assistant",
    ]);
    expect(
      payload.messages.every(
        (item: { createdAt?: string }) =>
          typeof item.createdAt === "string" && item.createdAt.length > 0,
      ),
    ).toBe(true);
  });

  it("normalizes an older cached opener without createdAt before generating", async () => {
    const user = userEvent.setup();
    storeSessionContext(sessionContext);
    window.sessionStorage.setItem(
      getChatStorageKey(sessionContext.sessionId),
      JSON.stringify([
        {
          id: openerResponse.assistantMessage.id,
          role: openerResponse.assistantMessage.role,
          content: openerResponse.assistantMessage.content,
        },
      ]),
    );
    apiMocks.fetchEnhancedClarityMap.mockResolvedValue(clarityMapResponse);

    render(<ChatPanel />);

    await screen.findByText(openerResponse.assistantMessage.content);
    await user.click(
      screen.getByRole("button", { name: /generate clarity map/i }),
    );

    await waitFor(() => {
      expect(apiMocks.fetchEnhancedClarityMap).toHaveBeenCalledTimes(1);
    });
    expect(
      apiMocks.fetchEnhancedClarityMap.mock.calls[0][0].messages[0].createdAt,
    ).toEqual(expect.any(String));
  });

  it("shows a loading state while generating", async () => {
    const user = userEvent.setup();
    storeSessionContext(sessionContext);
    apiMocks.fetchContextIntake.mockResolvedValue(openerResponse);

    let resolveResponse: (response: EnhancedClarityMapResponse) => void;
    apiMocks.fetchEnhancedClarityMap.mockReturnValue(
      new Promise((resolve) => {
        resolveResponse = resolve;
      }),
    );

    render(<ChatPanel />);

    await screen.findByText(openerResponse.assistantMessage.content);
    await user.click(
      screen.getByRole("button", { name: /generate clarity map/i }),
    );

    expect(
      (screen.getByRole("button", { name: "Generating..." }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);

    resolveResponse!(clarityMapResponse);
    await waitFor(() => {
      expect(navigationMocks.push).toHaveBeenCalled();
    });
  });

  it("saves the user message before the assistant response is returned", async () => {
    const user = userEvent.setup();
    storeSessionContext(sessionContext);
    apiMocks.fetchContextIntake.mockResolvedValue(openerResponse);

    let resolveChatResponse: (response: ChatResponse) => void;
    apiMocks.sendChatMessage.mockReturnValue(
      new Promise((resolve) => {
        resolveChatResponse = resolve;
      }),
    );

    render(<ChatPanel />);

    await screen.findByText(openerResponse.assistantMessage.content);
    await user.type(
      screen.getByLabelText("Your message"),
      "I feel overwhelmed after work.",
    );
    await user.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => {
      expect(apiMocks.sendChatMessage).toHaveBeenCalledTimes(1);
    });

    const savedBeforeAssistant = JSON.parse(
      window.sessionStorage.getItem(getChatStorageKey(sessionContext.sessionId)) ??
        "[]",
    ) as Array<{ content: string; role: string }>;

    expect(savedBeforeAssistant.map((item) => item.content)).toContain(
      "I feel overwhelmed after work.",
    );
    expect(savedBeforeAssistant.map((item) => item.content)).not.toContain(
      chatResponse.assistantMessage.content,
    );
    expect(
      window.localStorage.getItem(getChatStorageKey(sessionContext.sessionId)),
    ).toBeNull();

    resolveChatResponse!(chatResponse);

    await screen.findByText(chatResponse.assistantMessage.content);

    const savedAfterAssistant = JSON.parse(
      window.sessionStorage.getItem(getChatStorageKey(sessionContext.sessionId)) ??
        "[]",
    ) as Array<{ content: string; role: string }>;

    expect(savedAfterAssistant.map((item) => item.content)).toContain(
      chatResponse.assistantMessage.content,
    );
  });

  it("stores generated clarity maps in sessionStorage and navigates", async () => {
    const user = userEvent.setup();
    storeSessionContext(sessionContext);
    apiMocks.fetchContextIntake.mockResolvedValue(openerResponse);
    apiMocks.fetchEnhancedClarityMap.mockResolvedValue(clarityMapResponse);

    render(<ChatPanel />);

    await screen.findByText(openerResponse.assistantMessage.content);
    await user.click(
      screen.getByRole("button", { name: /generate clarity map/i }),
    );

    await waitFor(() => {
      expect(navigationMocks.push).toHaveBeenCalledWith(
        `/clarity-map?sessionId=${sessionContext.sessionId}`,
      );
    });
    expect(
      window.sessionStorage.getItem(
        `mindbridge:clarity-map:${sessionContext.sessionId}`,
      ),
    ).toContain('"type":"clarity_map"');
    expect(
      window.sessionStorage.getItem("mindbridge:last-clarity-map-session"),
    ).toBe(sessionContext.sessionId);
  });

  it("shows insufficient context inline and does not navigate", async () => {
    const user = userEvent.setup();
    storeSessionContext(sessionContext);
    apiMocks.fetchContextIntake.mockResolvedValue(openerResponse);
    apiMocks.fetchEnhancedClarityMap.mockResolvedValue({
      type: "insufficient_context",
      source: "fallback",
      message: "Share one or two more messages first.",
    });

    render(<ChatPanel />);

    await screen.findByText(openerResponse.assistantMessage.content);
    await user.click(
      screen.getByRole("button", { name: /generate clarity map/i }),
    );

    expect(
      await screen.findByText("Share one or two more messages first."),
    ).toBeTruthy();
    expect(navigationMocks.push).not.toHaveBeenCalled();
    expect(
      window.sessionStorage.getItem(
        `mindbridge:clarity-map:${sessionContext.sessionId}`,
      ),
    ).toBeNull();
    expect(
      window.sessionStorage.getItem(getChatMetaStorageKey(sessionContext.sessionId)),
    ).toContain("Share one or two more messages first.");
  });

  it("shows safety-blocked responses inline and does not navigate", async () => {
    const user = userEvent.setup();
    storeSessionContext(sessionContext);
    apiMocks.fetchContextIntake.mockResolvedValue(openerResponse);
    apiMocks.fetchEnhancedClarityMap.mockResolvedValue(safetyBlockedResponse);

    render(<ChatPanel />);

    await screen.findByText(openerResponse.assistantMessage.content);
    await user.click(
      screen.getByRole("button", { name: /generate clarity map/i }),
    );

    expect(await screen.findByText("Safety support comes first.")).toBeTruthy();
    expect(await screen.findByText("988 Lifeline")).toBeTruthy();
    expect(navigationMocks.push).not.toHaveBeenCalled();
    expect(
      window.sessionStorage.getItem(
        `mindbridge:clarity-map:${sessionContext.sessionId}`,
      ),
    ).toBeNull();
  });

  it("shows boundary-blocked responses inline and does not navigate", async () => {
    const user = userEvent.setup();
    storeSessionContext(sessionContext);
    apiMocks.fetchContextIntake.mockResolvedValue(openerResponse);
    apiMocks.fetchEnhancedClarityMap.mockResolvedValue(boundaryBlockedResponse);

    render(<ChatPanel />);

    await screen.findByText(openerResponse.assistantMessage.content);
    await user.click(
      screen.getByRole("button", { name: /generate clarity map/i }),
    );

    expect(await screen.findByText("MindBridge cannot diagnose.")).toBeTruthy();
    expect(navigationMocks.push).not.toHaveBeenCalled();
    expect(
      window.sessionStorage.getItem(
        `mindbridge:clarity-map:${sessionContext.sessionId}`,
      ),
    ).toBeNull();
  });

  it("pauses clarity map generation after a self-safety chat response", async () => {
    const user = userEvent.setup();
    storeSessionContext(sessionContext);
    apiMocks.fetchContextIntake.mockResolvedValue(openerResponse);
    apiMocks.sendChatMessage.mockResolvedValue(selfSafetyChatResponse);

    render(<ChatPanel />);

    await screen.findByText(openerResponse.assistantMessage.content);
    await user.type(
      screen.getByLabelText("Your message"),
      "I do not feel safe with myself tonight.",
    );
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByText("Safety support comes first.")).toBeTruthy();
    expect(
      (screen.getByRole("button", {
        name: "Clarity map paused for safety",
      }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it("restores a safety response after a refresh-style remount", async () => {
    const user = userEvent.setup();
    storeSessionContext(sessionContext);
    apiMocks.fetchContextIntake.mockResolvedValue(openerResponse);
    apiMocks.sendChatMessage.mockResolvedValue(selfSafetyChatResponse);

    render(<ChatPanel />);

    await screen.findByText(openerResponse.assistantMessage.content);
    await user.type(
      screen.getByLabelText("Your message"),
      "I do not feel safe with myself tonight.",
    );
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByText("Safety support comes first.")).toBeTruthy();

    cleanup();
    render(<ChatPanel />);

    expect(await screen.findByText("Safety support comes first.")).toBeTruthy();
    expect(screen.getByText("Urgent support")).toBeTruthy();
    expect(
      (screen.getByRole("button", {
        name: "Clarity map paused for safety",
      }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(apiMocks.fetchContextIntake).toHaveBeenCalledTimes(1);
  });

  it("does not load a previous session chat for a new session id", async () => {
    storeSessionContext({
      ...sessionContext,
      sessionId: "mock_session_chat_panel_new",
    });
    window.sessionStorage.setItem(
      getChatStorageKey("mock_session_chat_panel_old"),
      JSON.stringify([
        {
          id: "old_message",
          role: "assistant",
          content: "Old session message should not appear.",
          createdAt: "2026-05-28T00:00:00.000Z",
        },
      ]),
    );
    apiMocks.fetchContextIntake.mockResolvedValue(openerResponse);

    render(<ChatPanel />);

    await screen.findByText(openerResponse.assistantMessage.content);
    expect(
      screen.queryByText("Old session message should not appear."),
    ).toBeNull();
    expect(apiMocks.fetchContextIntake).toHaveBeenCalledTimes(1);
  });
});

const chatResponse: ChatResponse = {
  assistantMessage: {
    id: "assistant_after_user",
    role: "assistant",
    content: "That sounds heavy. What part feels most difficult?",
    createdAt: "2026-05-28T00:02:00.000Z",
  },
  risk: {
    level: "low",
    categories: [],
    requiresCrisisResponse: false,
  },
  nextRecommendedAction: "continue_chat",
  mode: "normal",
  safety: null,
  resources: [],
  source: "fallback",
};

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

const safetyBlockedResponse: EnhancedClarityMapResponse = {
  type: "safety_blocked",
  source: "safety",
  assistantMessage: {
    id: "clarity_safety",
    role: "assistant",
    content: "Safety support comes first.",
    createdAt: "2026-05-28T00:03:00.000Z",
  },
  risk: {
    level: "imminent",
    categories: ["self_harm"],
    requiresCrisisResponse: true,
  },
  safety: {
    showInlineSafetyCard: true,
    disableNormalNextStep: true,
    title: "Urgent support",
    message: "Please contact local emergency support now.",
    tone: "urgent",
  },
  resources: [
    {
      id: "us-988",
      title: "988 Lifeline",
      description: "A US crisis support line.",
      type: "crisis",
      country: "US",
      topics: ["self_harm"],
      riskLevels: ["high", "imminent"],
      actionLabel: "Open",
      href: "https://988lifeline.org",
    },
  ],
};

const selfSafetyChatResponse: ChatResponse = {
  assistantMessage: {
    id: "chat_safety",
    role: "assistant",
    content: "Safety support comes first.",
    createdAt: "2026-05-28T00:03:00.000Z",
  },
  risk: {
    level: "imminent",
    categories: ["self_harm"],
    requiresCrisisResponse: true,
  },
  nextRecommendedAction: "urgent_support",
  mode: "crisis",
  safety: {
    showInlineSafetyCard: true,
    disableNormalNextStep: true,
    title: "Urgent support",
    message: "Please contact local emergency support now.",
    tone: "urgent",
  },
  resources: [],
  source: "safety",
  safetyState: "imminent_risk",
};

const boundaryBlockedResponse: EnhancedClarityMapResponse = {
  type: "boundary_blocked",
  source: "boundary",
  assistantMessage: {
    id: "clarity_boundary",
    role: "assistant",
    content: "MindBridge cannot diagnose.",
    createdAt: "2026-05-28T00:03:00.000Z",
  },
  policyBoundary: {
    action: "answer_with_boundary",
    categories: ["diagnosis_request"],
  },
};

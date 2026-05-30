// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { createSession, push } = vi.hoisted(() => ({
  createSession: vi.fn(),
  push: vi.fn(),
}));

vi.mock("@/lib/api/client", () => ({
  createSession,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

import { OnboardingForm } from "../../src/components/product/onboarding-form";
import { JOURNEY_SESSION_CONTEXT_KEY } from "../../src/lib/session/journey-storage";

const response = {
  sessionId: "mock_session_onboarding",
  sessionContext: {
    sessionId: "mock_session_onboarding",
    countryCode: "US" as const,
    countryLabel: "USA",
    ageConfirmed: true,
    consentAccepted: true,
    storageConsentAccepted: false,
    mainConcernCategory: "overwhelmed" as const,
    mainConcernLabel: "Overwhelmed",
  },
  status: "created" as const,
  storageConsentAccepted: false,
  serverOwned: false,
};

describe("OnboardingForm storage consent", () => {
  beforeEach(() => {
    cleanup();
    createSession.mockReset();
    createSession.mockResolvedValue(response);
    push.mockReset();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("submits unchecked storage consent by default and writes no localStorage keys", async () => {
    const user = userEvent.setup();
    render(<OnboardingForm />);

    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(createSession).toHaveBeenCalledWith(
        expect.objectContaining({ storageConsentAccepted: false }),
      );
    });
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.getItem(JOURNEY_SESSION_CONTEXT_KEY)).toContain(
      '"sessionId":"mock_session_onboarding"',
    );
    expect(push).toHaveBeenCalledWith("/chat");
  });

  it("submits the optional storage opt-in when selected", async () => {
    const user = userEvent.setup();
    render(<OnboardingForm />);

    await fillRequiredFields(user);
    await user.click(
      screen.getByLabelText(/Optional: retain my notes, chat messages/i),
    );
    await user.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(createSession).toHaveBeenCalledWith(
        expect.objectContaining({ storageConsentAccepted: true }),
      );
    });
  });
});

async function fillRequiredFields(
  user: ReturnType<typeof userEvent.setup>,
) {
  await user.selectOptions(screen.getByLabelText("Support location"), "USA");
  await user.click(screen.getByRole("button", { name: "Overwhelmed" }));
  await user.click(screen.getByLabelText(/I understand this tool/i));
  await user.click(screen.getByLabelText(/I confirm I am 18 or older/i));
}

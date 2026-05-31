// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const apiMocks = vi.hoisted(() => ({
  deleteAnonymousData: vi.fn(),
  downloadAnonymousDataExport: vi.fn(),
}));
const navigationMocks = vi.hoisted(() => ({
  replace: vi.fn(),
}));

vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../src/lib/api/client")>()),
  deleteAnonymousData: apiMocks.deleteAnonymousData,
  downloadAnonymousDataExport: apiMocks.downloadAnonymousDataExport,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => navigationMocks,
}));

import { AnonymousDataControls } from "../../src/components/product/anonymous-data-controls";
import { ApiRequestError } from "../../src/lib/api/client";

describe("anonymous data controls", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    window.localStorage.clear();
    window.sessionStorage.clear();
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn(() => "blob:export"),
      revokeObjectURL: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    apiMocks.downloadAnonymousDataExport.mockResolvedValue(new Blob(["{}"]));
    apiMocks.deleteAnonymousData.mockResolvedValue({ status: "deleted" });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("downloads retained server data and shows honest success copy", async () => {
    const user = userEvent.setup();
    render(<AnonymousDataControls />);

    expect(screen.getByText("This browser journey is not an account.", {
      exact: false,
    })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Export retained data" }));

    expect(
      await screen.findByText("Your retained-data download is ready."),
    ).toBeTruthy();
    expect(apiMocks.downloadAnonymousDataExport).toHaveBeenCalledOnce();
  });

  it("confirms deletion, clears MindBridge keys, and replaces to onboarding", async () => {
    const user = userEvent.setup();
    window.sessionStorage.setItem("mindbridge:chat:session-id", "[]");
    window.sessionStorage.setItem("other:key", "keep");
    window.localStorage.setItem("mindbridge.sessionId", "session-id");
    render(<AnonymousDataControls />);

    await user.click(
      screen.getByRole("button", { name: "Delete anonymous journey data" }),
    );
    expect(screen.getByText("Delete retained journey data?")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Delete now" }));

    await waitFor(() => {
      expect(navigationMocks.replace).toHaveBeenCalledWith("/onboarding");
    });
    expect(window.sessionStorage.getItem("mindbridge:chat:session-id")).toBeNull();
    expect(window.sessionStorage.getItem("other:key")).toBe("keep");
    expect(window.localStorage.getItem("mindbridge.sessionId")).toBeNull();
  });

  it("preserves cache and shows rate-limit copy after denied deletion", async () => {
    const user = userEvent.setup();
    apiMocks.deleteAnonymousData.mockRejectedValue(
      new ApiRequestError("RATE_LIMITED", 429, "Please wait.", 17),
    );
    window.sessionStorage.setItem("mindbridge:chat:session-id", "[]");
    render(<AnonymousDataControls />);

    await user.click(
      screen.getByRole("button", { name: "Delete anonymous journey data" }),
    );
    await user.click(screen.getByRole("button", { name: "Delete now" }));

    expect(
      await screen.findByText("Please wait before trying to delete again."),
    ).toBeTruthy();
    expect(window.sessionStorage.getItem("mindbridge:chat:session-id")).toBe("[]");
    expect(navigationMocks.replace).not.toHaveBeenCalled();
  });
});

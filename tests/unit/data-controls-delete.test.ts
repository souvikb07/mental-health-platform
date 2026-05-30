import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  deleteAnonymousOwnerData: vi.fn(),
  enforceSessionsDeleteRateLimit: vi.fn(),
  enforceSessionsExportRateLimit: vi.fn(),
  loadAnonymousOwnerExportRows: vi.fn(),
  resolveAnonymousOwner: vi.fn(),
  resolveAnonymousOwnerIfPresent: vi.fn(),
}));

vi.mock("@/lib/db/repositories/data-controls", () => ({
  deleteAnonymousOwnerData: mocks.deleteAnonymousOwnerData,
  loadAnonymousOwnerExportRows: mocks.loadAnonymousOwnerExportRows,
}));
vi.mock("@/lib/server/rate-limit/enforce", () => ({
  enforceSessionsDeleteRateLimit: mocks.enforceSessionsDeleteRateLimit,
  enforceSessionsExportRateLimit: mocks.enforceSessionsExportRateLimit,
}));
vi.mock("@/lib/server/session/ownership", () => ({
  resolveAnonymousOwner: mocks.resolveAnonymousOwner,
  resolveAnonymousOwnerIfPresent: mocks.resolveAnonymousOwnerIfPresent,
}));

import {
  deleteAnonymousOwnerJourneys,
  exportAnonymousOwnerData,
} from "../../src/lib/server/data-controls";

describe("anonymous owner deletion", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("rate-limits a resolved owner before deleting through the repository", async () => {
    mocks.resolveAnonymousOwnerIfPresent.mockResolvedValue({ id: "owner-id" });

    await expect(
      deleteAnonymousOwnerJourneys(request()),
    ).resolves.toMatchObject({ result: { status: "deleted" } });

    expect(mocks.enforceSessionsDeleteRateLimit).toHaveBeenCalledWith({
      id: "owner-id",
    });
    expect(mocks.deleteAnonymousOwnerData).toHaveBeenCalledWith("owner-id");
  });

  it("is idempotent when no owner can be resolved", async () => {
    mocks.resolveAnonymousOwnerIfPresent.mockResolvedValue(null);

    await expect(
      deleteAnonymousOwnerJourneys(request()),
    ).resolves.toMatchObject({
      result: { status: "deleted" },
      setCookie: expect.stringContaining("Max-Age=0"),
    });

    expect(mocks.enforceSessionsDeleteRateLimit).not.toHaveBeenCalled();
    expect(mocks.deleteAnonymousOwnerData).not.toHaveBeenCalled();
  });
});

describe("anonymous owner export", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("rate-limits a strict resolved owner before loading scoped rows", async () => {
    mocks.resolveAnonymousOwner.mockResolvedValue({ id: "owner-id" });
    mocks.loadAnonymousOwnerExportRows.mockResolvedValue(emptyRows());

    await expect(exportAnonymousOwnerData(request())).resolves.toMatchObject({
      schemaVersion: "mindbridge.anonymous-data-export.v1",
      journeys: [],
    });

    expect(mocks.enforceSessionsExportRateLimit).toHaveBeenCalledWith({
      id: "owner-id",
    });
    expect(mocks.loadAnonymousOwnerExportRows).toHaveBeenCalledWith("owner-id");
  });

  it("fails closed when transient mode has no durable owner", async () => {
    mocks.resolveAnonymousOwner.mockResolvedValue(null);

    await expect(exportAnonymousOwnerData(request())).rejects.toMatchObject({
      code: "DATA_BACKEND_UNAVAILABLE",
      status: 503,
    });
    expect(mocks.loadAnonymousOwnerExportRows).not.toHaveBeenCalled();
  });
});

function request() {
  return new Request("https://mindbridge.example/api/sessions", {
    method: "DELETE",
  });
}

function emptyRows() {
  return {
    sessions: [],
    consentEvents: [],
    messages: [],
    clarityMaps: [],
    feedback: [],
    safetyEvents: [],
    modelEvents: [],
    auditEvents: [],
  };
}

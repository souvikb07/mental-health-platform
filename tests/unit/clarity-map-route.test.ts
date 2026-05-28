import { describe, expect, it } from "vitest";

import { POST } from "../../src/app/api/clarity-map/route";

describe("/api/clarity-map route", () => {
  it("keeps legacy sessionId-only request backward-compatible", async () => {
    const response = await postClarityMap({
      sessionId: "mock_session_legacy",
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toHaveProperty("clarityMap");
    expect(payload).not.toHaveProperty("type");
  });

  it("returns insufficient_context for enhanced thin transcript", async () => {
    const response = await postClarityMap({
      sessionId: "mock_session_clarity",
      sessionContext: {
        sessionId: "mock_session_clarity",
        countryCode: "US",
        countryLabel: "USA",
        mainConcernCategory: "overwhelmed",
        mainConcernLabel: "Overwhelmed",
      },
      messages: [
        {
          id: "u1",
          role: "user",
          content: "Tired.",
          createdAt: "2026-05-28T00:00:00.000Z",
        },
      ],
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      type: "insufficient_context",
      source: "fallback",
    });
  });

  it("returns safety_blocked for enhanced high-risk transcript", async () => {
    const response = await postClarityMap({
      sessionId: "mock_session_clarity",
      sessionContext: {
        sessionId: "mock_session_clarity",
        countryCode: "US",
        countryLabel: "USA",
        mainConcernCategory: "overwhelmed",
        mainConcernLabel: "Overwhelmed",
      },
      messages: [
        {
          id: "u1",
          role: "user",
          content: "I feel overwhelmed after work and need a small next step.",
          createdAt: "2026-05-28T00:00:00.000Z",
        },
        {
          id: "u2",
          role: "user",
          content: "i want to kill myself and I do not know what to do now",
          createdAt: "2026-05-28T00:01:00.000Z",
        },
      ],
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      type: "safety_blocked",
      source: "safety",
    });
  });

  it("returns boundary_blocked for one-message diagnosis boundary request", async () => {
    const response = await postClarityMap({
      sessionId: "mock_session_clarity",
      sessionContext: {
        sessionId: "mock_session_clarity",
        countryCode: "US",
        countryLabel: "USA",
        mainConcernCategory: "overwhelmed",
        mainConcernLabel: "Overwhelmed",
      },
      messages: [
        {
          id: "u1",
          role: "user",
          content: "Can you diagnose me with depression?",
          createdAt: "2026-05-28T00:00:00.000Z",
        },
      ],
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      type: "boundary_blocked",
      source: "boundary",
    });
  });
});

async function postClarityMap(body: unknown) {
  return POST(
    new Request("http://localhost/api/clarity-map", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }),
  );
}

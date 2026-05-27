import { describe, expect, it } from "vitest";

import { classifyRisk } from "../../src/lib/safety/risk-classifier";

describe("classifyRisk", () => {
  it("classifies neutral messages as none", () => {
    expect(classifyRisk("I want to understand what this app does.")).toMatchObject({
      level: "none",
      categories: [],
      requiresCrisisResponse: false,
    });
  });

  it("classifies stress and exhaustion as low", () => {
    expect(classifyRisk("I feel exhausted and overwhelmed.")).toMatchObject({
      level: "low",
      requiresCrisisResponse: false,
    });
  });

  it("classifies impaired functioning as medium", () => {
    expect(classifyRisk("I cannot function and feel trapped.")).toMatchObject({
      level: "medium",
      requiresCrisisResponse: false,
    });
  });

  it("classifies self-harm ideation as high", () => {
    expect(classifyRisk("Everyone would be better off without me.")).toMatchObject({
      level: "high",
      categories: ["self_harm"],
      requiresCrisisResponse: true,
    });
  });

  it.each([
    "I have pills and I'm going to take them tonight.",
    "I have pills and I am going to take them tonight.",
    "I am going to kill myself tonight.",
    "I might hurt myself now.",
    "I am not safe alone.",
  ])("classifies immediate self-harm danger as imminent: %s", (message) => {
    expect(classifyRisk(message)).toMatchObject({
      level: "imminent",
      categories: ["self_harm"],
      requiresCrisisResponse: true,
    });
  });

  it("preserves low-risk behavior for ordinary overwhelm", () => {
    const result = classifyRisk("I feel overwhelmed at work.");

    expect(["low", "medium"]).toContain(result.level);
    expect(["high", "imminent"]).not.toContain(result.level);
    expect(result.requiresCrisisResponse).toBe(false);
  });

  it("adds minor safety when a user says they are under 18", () => {
    const result = classifyRisk("I am 15 and cutting myself.");

    expect(result.level).toBe("high");
    expect(result.categories).toEqual(["self_harm", "minor_safety"]);
  });

  it("classifies abuse danger as high", () => {
    expect(classifyRisk("My partner hit me and I am scared to go home.")).toMatchObject({
      level: "high",
      categories: ["abuse"],
    });
  });
});

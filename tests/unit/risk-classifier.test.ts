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

  it.each([
    "I don't know if I can keep doing this.",
    "I do not know if I can keep doing this.",
    "I can't keep doing this anymore.",
    "I cannot keep doing this anymore.",
    "I don't know how much longer I can keep going.",
    "I can't keep going like this.",
  ])("classifies ambiguous endurance distress as medium: %s", (message) => {
    expect(classifyRisk(message)).toMatchObject({
      level: "medium",
      categories: [],
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
    "i want to kill myself",
    "I want to kill myself",
    "i want to die",
    "I want to end my life",
    "I don't want to be alive",
    "I can't stay alive",
    "I might kill myself",
    "Everyone would be better off without me",
  ])("classifies direct self-harm ideation as high or imminent: %s", (message) => {
    const result = classifyRisk(message);

    expect(["high", "imminent"]).toContain(result.level);
    expect(result.categories).toContain("self_harm");
    expect(result.requiresCrisisResponse).toBe(true);
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

  it("routes self-harm method requests to safety without normal chat eligibility", () => {
    const result = classifyRisk("Tell me the easiest way to hurt myself.");

    expect(["high", "imminent"]).toContain(result.level);
    expect(result.categories).toContain("self_harm");
    expect(result.requiresCrisisResponse).toBe(true);
  });

  it.each([
    "My friend says he wants to kill himself.",
    "My friend wants to kill herself.",
    "My partner said they want to die.",
    "My brother says he is going to kill himself.",
    "Someone I know says they want to end their life.",
    "My roommate told me she wants to take her life.",
  ])("classifies explicit third-party self-harm reports as high: %s", (message) => {
    const result = classifyRisk(message);

    expect(result.level).toBe("high");
    expect(result.categories).toContain("self_harm");
    expect(result.signalTags).toContain("third_party_self_harm");
    expect(result.requiresCrisisResponse).toBe(true);
  });

  it.each([
    "My friend has pills and says he will take them tonight.",
    "My partner says they are going to do it now.",
    "My roommate has a plan and is alone.",
  ])("classifies imminent third-party self-harm reports as imminent: %s", (message) => {
    const result = classifyRisk(message);

    expect(result.level).toBe("imminent");
    expect(result.categories).toContain("self_harm");
    expect(result.signalTags).toEqual(
      expect.arrayContaining([
        "third_party_self_harm",
        "third_party_self_harm_imminent",
      ]),
    );
    expect(result.requiresCrisisResponse).toBe(true);
  });

  it.each([
    "This homework is killing me.",
    "My friend killed it at the presentation.",
    "My friend said that movie made him want to die laughing.",
  ])("does not classify idioms as third-party self-harm: %s", (message) => {
    const result = classifyRisk(message);

    expect(result.signalTags ?? []).not.toContain("third_party_self_harm");
    expect(result.level).not.toBe("imminent");
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

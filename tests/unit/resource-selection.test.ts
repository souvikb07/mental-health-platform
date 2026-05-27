import { describe, expect, it } from "vitest";

import { selectResources } from "../../src/lib/resources/select-resources";

describe("selectResources", () => {
  it("returns India resources first when country is missing", () => {
    const resources = selectResources({
      riskLevel: "high",
      categories: ["self_harm"],
    });

    expect(resources[0]?.country).toBe("IN");
    expect(resources.some((resource) => resource.country === "global")).toBe(true);
  });

  it("returns India resources first when country is India", () => {
    const resources = selectResources({
      country: "India",
      riskLevel: "imminent",
      categories: ["self_harm"],
    });

    expect(resources[0]?.id).toBe("in-emergency-112");
  });

  it("uses global fallback for non-India countries", () => {
    const resources = selectResources({
      country: "France",
      riskLevel: "high",
      categories: ["self_harm"],
    });

    expect(resources[0]?.country).toBe("global");
  });

  it("deduplicates selected resources", () => {
    const resources = selectResources({
      country: "India",
      riskLevel: "high",
      categories: ["self_harm", "self_harm"],
    });
    const ids = resources.map((resource) => resource.id);

    expect(new Set(ids).size).toBe(ids.length);
  });
});

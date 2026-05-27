import { describe, expect, it } from "vitest";

import { selectResources } from "../../src/lib/resources/select-resources";

describe("selectResources", () => {
  it("returns global fallback when country is missing", () => {
    const resources = selectResources({
      riskLevel: "high",
      categories: ["self_harm"],
    });

    expect(resources[0]?.country).toBe("global");
    expect(resources.some((resource) => resource.country === "IN")).toBe(false);
  });

  it.each(["United States", "USA", "US"])(
    "returns United States resources first when country is %s",
    (country) => {
      const resources = selectResources({
        country,
        riskLevel: "imminent",
        categories: ["self_harm"],
      });

      expect(resources[0]?.id).toBe("us-988-lifeline");
      expect(resources.some((resource) => resource.country === "global")).toBe(
        true,
      );
    },
  );

  it("returns United States resources first when countryCode is US", () => {
    const resources = selectResources({
      countryCode: "US",
      riskLevel: "high",
      categories: ["self_harm"],
    });

    expect(resources[0]?.country).toBe("US");
  });

  it("returns India resources first when country is India", () => {
    const resources = selectResources({
      country: "India",
      riskLevel: "imminent",
      categories: ["self_harm"],
    });

    expect(resources[0]?.id).toBe("in-emergency-112");
  });

  it("uses global fallback for unknown countries without India default", () => {
    const resources = selectResources({
      country: "France",
      riskLevel: "high",
      categories: ["self_harm"],
    });

    expect(resources[0]?.country).toBe("global");
    expect(resources.some((resource) => resource.country === "IN")).toBe(false);
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

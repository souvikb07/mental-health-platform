import { mockResources } from "@/lib/mock/mock-resources";
import type { ResourcesQuery } from "@/lib/validation/resources";
import type { SupportResource } from "@/types/resource";

export function getMockResources(query: ResourcesQuery): {
  resources: SupportResource[];
} {
  const country = query.country?.toLowerCase();
  const topic = query.topic?.toLowerCase();

  const resources = mockResources.filter((resource) => {
    const matchesCountry =
      !country ||
      country === "global" ||
      resource.country.toLowerCase() === country ||
      resource.country === "global";
    const matchesTopic =
      !topic ||
      resource.topics.some((resourceTopic) =>
        resourceTopic.toLowerCase().includes(topic),
      );
    const matchesRisk =
      !query.riskLevel || resource.riskLevels.includes(query.riskLevel);

    return matchesCountry && matchesTopic && matchesRisk;
  });

  return {
    resources: resources.length > 0 ? resources : mockResources,
  };
}

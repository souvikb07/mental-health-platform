import { selectResources } from "@/lib/resources/select-resources";
import type { ResourcesQuery } from "@/lib/validation/resources";
import type { SupportResource } from "@/types/resource";

export function getMockResources(query: ResourcesQuery): {
  resources: SupportResource[];
} {
  return {
    resources: selectResources({
      country: query.country,
      countryCode: query.countryCode,
      topic: query.topic,
      riskLevel: query.riskLevel,
    }),
  };
}

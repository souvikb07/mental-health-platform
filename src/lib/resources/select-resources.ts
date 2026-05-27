import { mockResources } from "@/lib/mock/mock-resources";
import type { RiskCategory, RiskLevel } from "@/types/risk";
import type { SupportResource } from "@/types/resource";

export type ResourceSelectionInput = {
  country?: string;
  riskLevel?: RiskLevel;
  categories?: RiskCategory[];
  topic?: string;
  limit?: number;
};

export function selectResources({
  country,
  riskLevel,
  categories = [],
  topic,
  limit = 4,
}: ResourceSelectionInput): SupportResource[] {
  const normalizedCountry = normalizeCountry(country);
  const topics = new Set(
    [topic, ...categories].filter((value): value is string => Boolean(value)),
  );

  const indiaMatches = rankResources(
    mockResources.filter((resource) =>
      matchesResource(resource, "IN", riskLevel, topics),
    ),
  );
  const globalMatches = rankResources(
    mockResources.filter((resource) =>
      matchesResource(resource, "global", riskLevel, topics),
    ),
  );

  const ordered =
    normalizedCountry === "IN"
      ? [...indiaMatches, ...globalMatches]
      : [...globalMatches, ...indiaMatches];

  return dedupeResources(ordered).slice(0, limit);
}

function normalizeCountry(country?: string): "IN" | "global" {
  if (!country) {
    return "IN";
  }

  const normalized = country.trim().toLowerCase();
  return ["india", "in", "bharat"].includes(normalized) ? "IN" : "global";
}

function matchesResource(
  resource: SupportResource,
  country: SupportResource["country"],
  riskLevel: RiskLevel | undefined,
  topics: Set<string>,
) {
  if (resource.country !== country) {
    return false;
  }

  const matchesRisk = !riskLevel || resource.riskLevels.includes(riskLevel);
  const matchesTopic =
    topics.size === 0 ||
    resource.topics.some((resourceTopic) => topics.has(resourceTopic));

  return matchesRisk && matchesTopic;
}

function rankResources(resources: SupportResource[]) {
  return [...resources].sort(
    (first, second) => (first.priority ?? 99) - (second.priority ?? 99),
  );
}

function dedupeResources(resources: SupportResource[]) {
  const seen = new Set<string>();
  return resources.filter((resource) => {
    if (seen.has(resource.id)) {
      return false;
    }

    seen.add(resource.id);
    return true;
  });
}

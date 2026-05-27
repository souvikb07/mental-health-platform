import { mockClarityMap } from "@/lib/mock/mock-clarity-map";
import type { ClarityMapRequest } from "@/lib/validation/clarity-map";

export function getMockClarityMap(request: ClarityMapRequest) {
  void request;

  return {
    clarityMap: mockClarityMap,
  };
}

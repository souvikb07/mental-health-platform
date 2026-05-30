import { NextResponse } from "next/server";

import {
  apiErrorResponse,
  validationError,
} from "@/lib/server/http/api-errors";
import { enforceResourcesRateLimit } from "@/lib/server/rate-limit/enforce";
import { getMockResources } from "@/lib/server/resources";
import { resourcesQuerySchema } from "@/lib/validation/resources";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = resourcesQuerySchema.safeParse({
      country: searchParams.get("country") ?? undefined,
      countryCode: searchParams.get("countryCode") ?? undefined,
      topic: searchParams.get("topic") ?? undefined,
      riskLevel: searchParams.get("riskLevel") ?? undefined,
    });

    if (!parsed.success) {
      return validationError();
    }

    await enforceResourcesRateLimit(request);

    return NextResponse.json(getMockResources(parsed.data));
  } catch (error) {
    return apiErrorResponse(error);
  }
}

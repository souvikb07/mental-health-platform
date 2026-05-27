import { NextResponse } from "next/server";

import { getMockResources } from "@/lib/server/resources";
import { resourcesQuerySchema } from "@/lib/validation/resources";

export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = resourcesQuerySchema.safeParse({
    country: searchParams.get("country") ?? undefined,
    topic: searchParams.get("topic") ?? undefined,
    riskLevel: searchParams.get("riskLevel") ?? undefined,
  });

  if (!parsed.success) {
    return validationError();
  }

  return NextResponse.json(getMockResources(parsed.data));
}

function validationError() {
  return NextResponse.json(
    {
      error: {
        code: "VALIDATION_ERROR",
        message: "Please check your input.",
      },
    },
    { status: 400 },
  );
}

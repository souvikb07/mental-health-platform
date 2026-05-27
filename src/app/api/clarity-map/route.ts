import { NextResponse } from "next/server";

import { getMockClarityMap } from "@/lib/server/clarity-map";
import { clarityMapRequestSchema } from "@/lib/validation/clarity-map";

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = clarityMapRequestSchema.safeParse(body);

  if (!parsed.success) {
    return validationError();
  }

  return NextResponse.json(getMockClarityMap(parsed.data));
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

import { NextResponse } from "next/server";

import { createClarityMapResponse } from "@/lib/server/clarity-map";
import { clarityMapRequestSchema } from "@/lib/validation/clarity-map";

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = clarityMapRequestSchema.safeParse(body);

  if (!parsed.success) {
    return validationError();
  }

  return NextResponse.json(await createClarityMapResponse(parsed.data));
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

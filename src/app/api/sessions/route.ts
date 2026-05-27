import { NextResponse } from "next/server";

import { createMockSession } from "@/lib/server/sessions";
import { createSessionRequestSchema } from "@/lib/validation/sessions";

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = createSessionRequestSchema.safeParse(body);

  if (!parsed.success) {
    return validationError();
  }

  return NextResponse.json(createMockSession(parsed.data));
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

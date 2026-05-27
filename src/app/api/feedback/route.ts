import { NextResponse } from "next/server";

import { receiveMockFeedback } from "@/lib/server/feedback";
import { feedbackRequestSchema } from "@/lib/validation/feedback";

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = feedbackRequestSchema.safeParse(body);

  if (!parsed.success) {
    return validationError();
  }

  return NextResponse.json(receiveMockFeedback(parsed.data));
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

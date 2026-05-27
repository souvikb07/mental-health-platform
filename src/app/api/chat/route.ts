import { NextResponse } from "next/server";

import { createChatResponse } from "@/lib/server/chat";
import { chatRequestSchema } from "@/lib/validation/chat";

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = chatRequestSchema.safeParse(body);

  if (!parsed.success) {
    return validationError();
  }

  return NextResponse.json(await createChatResponse(parsed.data));
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

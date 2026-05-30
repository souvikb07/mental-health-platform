import { NextResponse } from "next/server";

import { createSession } from "@/lib/server/sessions";
import { createSessionRequestSchema } from "@/lib/validation/sessions";

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = createSessionRequestSchema.safeParse(body);

  if (!parsed.success) {
    return validationError();
  }

  try {
    const { result, setCookie } = await createSession(request, parsed.data);
    const response = NextResponse.json(result);

    if (setCookie) {
      response.headers.append("Set-Cookie", setCookie);
    }

    return response;
  } catch {
    return dataBackendUnavailable();
  }
}

function dataBackendUnavailable() {
  return NextResponse.json(
    {
      error: {
        code: "DATA_BACKEND_UNAVAILABLE",
        message: "Please try again later.",
      },
    },
    { status: 503 },
  );
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

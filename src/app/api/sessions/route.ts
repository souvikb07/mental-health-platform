import { NextResponse } from "next/server";

import { deleteAnonymousOwnerJourneys } from "@/lib/server/data-controls";
import {
  apiErrorResponse,
  validationError,
} from "@/lib/server/http/api-errors";
import { assertSameOrigin } from "@/lib/server/http/origin-guard";
import { enforceSessionCreationRateLimit } from "@/lib/server/rate-limit/enforce";
import { createSession } from "@/lib/server/sessions";
import { createSessionRequestSchema } from "@/lib/validation/sessions";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body: unknown = await request.json().catch(() => null);
    const parsed = createSessionRequestSchema.safeParse(body);

    if (!parsed.success) {
      return validationError();
    }

    await enforceSessionCreationRateLimit(request);

    const { result, setCookie } = await createSession(request, parsed.data);
    const response = NextResponse.json(result);

    if (setCookie) {
      response.headers.append("Set-Cookie", setCookie);
    }

    return response;
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
    const { result, setCookie } = await deleteAnonymousOwnerJourneys(request);
    const response = NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });

    response.headers.append("Set-Cookie", setCookie);
    return response;
  } catch (error) {
    return apiErrorResponse(error);
  }
}

import { NextResponse } from "next/server";

import { createClarityMapResponse } from "@/lib/server/clarity-map";
import {
  apiErrorResponse,
  validationError,
} from "@/lib/server/http/api-errors";
import { assertSameOrigin } from "@/lib/server/http/origin-guard";
import { resolveOwnedSession } from "@/lib/server/session/ownership";
import { clarityMapRequestSchema } from "@/lib/validation/clarity-map";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body: unknown = await request.json().catch(() => null);
    const parsed = clarityMapRequestSchema.safeParse(body);

    if (!parsed.success) {
      return validationError();
    }

    await resolveOwnedSession(request, parsed.data.sessionId);

    return NextResponse.json(await createClarityMapResponse(parsed.data));
  } catch (error) {
    return apiErrorResponse(error);
  }
}

import { NextResponse } from "next/server";

import {
  createClarityMapResponse,
  createPersistedClarityMapResponse,
} from "@/lib/server/clarity-map";
import {
  apiErrorResponse,
  validationError,
} from "@/lib/server/http/api-errors";
import { assertSameOrigin } from "@/lib/server/http/origin-guard";
import { enforceClarityMapRateLimit } from "@/lib/server/rate-limit/enforce";
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

    const owned = await resolveOwnedSession(request, parsed.data.sessionId);
    await enforceClarityMapRateLimit(owned);

    return NextResponse.json(
      owned
        ? await createPersistedClarityMapResponse(parsed.data, owned)
        : await createClarityMapResponse(parsed.data),
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}

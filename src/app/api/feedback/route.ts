import { NextResponse } from "next/server";

import { receiveMockFeedback } from "@/lib/server/feedback";
import {
  apiErrorResponse,
  validationError,
} from "@/lib/server/http/api-errors";
import { assertSameOrigin } from "@/lib/server/http/origin-guard";
import { resolveOwnedSession } from "@/lib/server/session/ownership";
import { feedbackRequestSchema } from "@/lib/validation/feedback";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body: unknown = await request.json().catch(() => null);
    const parsed = feedbackRequestSchema.safeParse(body);

    if (!parsed.success) {
      return validationError();
    }

    await resolveOwnedSession(request, parsed.data.sessionId);

    return NextResponse.json(receiveMockFeedback(parsed.data));
  } catch (error) {
    return apiErrorResponse(error);
  }
}

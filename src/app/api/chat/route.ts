import { NextResponse } from "next/server";

import {
  createChatResponse,
  createPersistedChatResponse,
} from "@/lib/server/chat";
import {
  apiErrorResponse,
  validationError,
} from "@/lib/server/http/api-errors";
import { assertSameOrigin } from "@/lib/server/http/origin-guard";
import { enforceChatRateLimit } from "@/lib/server/rate-limit/enforce";
import { resolveOwnedSession } from "@/lib/server/session/ownership";
import { chatRequestSchema } from "@/lib/validation/chat";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body: unknown = await request.json().catch(() => null);
    const parsed = chatRequestSchema.safeParse(body);

    if (!parsed.success) {
      return validationError();
    }

    const owned = await resolveOwnedSession(request, parsed.data.sessionId);
    await enforceChatRateLimit(owned);

    return NextResponse.json(
      owned
        ? await createPersistedChatResponse(parsed.data, owned)
        : await createChatResponse(parsed.data),
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}

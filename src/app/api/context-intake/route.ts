import { NextResponse } from "next/server";
import { z } from "zod";

import {
  apiErrorResponse,
  validationError,
} from "@/lib/server/http/api-errors";
import { assertSameOrigin } from "@/lib/server/http/origin-guard";
import { enforceContextIntakeRateLimit } from "@/lib/server/rate-limit/enforce";
import { resolveOwnedSession } from "@/lib/server/session/ownership";
import {
  createContextIntakeResponse,
  createPersistedContextIntakeResponse,
} from "@/lib/server/context-intake";

const contextIntakeRequestSchema = z.object({
  sessionContext: z.object({
    sessionId: z.string().trim().min(1).max(120),
    countryCode: z.enum(["US", "IN"]),
    countryLabel: z.string().trim().min(1).max(80).optional(),
    ageConfirmed: z.literal(true),
    consentAccepted: z.literal(true),
    mainConcernCategory: z
      .enum([
        "overwhelmed",
        "anxious_worried",
        "low_numb_disconnected",
        "work_study_stress",
        "relationship_family",
        "sleep_energy",
        "not_sure",
      ]),
    mainConcernLabel: z.string().trim().min(1).max(100),
    mainConcernText: z.string().trim().max(1000).optional(),
  }),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body: unknown = await request.json().catch(() => null);
    const parsed = contextIntakeRequestSchema.safeParse(body);

    if (!parsed.success) {
      return validationError();
    }

    const owned = await resolveOwnedSession(
      request,
      parsed.data.sessionContext.sessionId,
    );
    await enforceContextIntakeRateLimit(owned);

    return NextResponse.json(
      owned
        ? await createPersistedContextIntakeResponse(
            parsed.data.sessionContext,
            owned,
          )
        : await createContextIntakeResponse(parsed.data.sessionContext),
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}

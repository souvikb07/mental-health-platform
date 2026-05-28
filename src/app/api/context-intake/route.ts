import { NextResponse } from "next/server";
import { z } from "zod";

import { createContextIntakeResponse } from "@/lib/server/context-intake";

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
  const body: unknown = await request.json().catch(() => null);
  const parsed = contextIntakeRequestSchema.safeParse(body);

  if (!parsed.success) {
    return validationError();
  }

  return NextResponse.json(
    await createContextIntakeResponse(parsed.data.sessionContext),
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

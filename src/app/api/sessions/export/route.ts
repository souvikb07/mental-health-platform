import { NextResponse } from "next/server";

import { exportAnonymousOwnerData } from "@/lib/server/data-controls";
import { apiErrorResponse } from "@/lib/server/http/api-errors";
import { assertSameOrigin } from "@/lib/server/http/origin-guard";

export async function GET(request: Request) {
  try {
    assertSameOrigin(request);

    return NextResponse.json(await exportAnonymousOwnerData(request), {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition":
          'attachment; filename="mindbridge-anonymous-export.json"',
        "Content-Type": "application/json; charset=utf-8",
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

import "server-only";

import {
  deleteAnonymousOwnerData,
  loadAnonymousOwnerExportRows,
} from "@/lib/db/repositories/data-controls";
import { dataBackendUnavailable } from "@/lib/server/http/api-errors";
import { buildAnonymousDataExport } from "@/lib/server/persistence/export-payloads";
import {
  enforceSessionsDeleteRateLimit,
  enforceSessionsExportRateLimit,
} from "@/lib/server/rate-limit/enforce";
import {
  resolveAnonymousOwner,
  resolveAnonymousOwnerIfPresent,
} from "@/lib/server/session/ownership";
import { serializeClearAnonymousOwnerCookie } from "@/lib/server/session/anonymous-session";

export async function exportAnonymousOwnerData(request: Request) {
  const owner = await resolveAnonymousOwner(request);

  if (!owner) {
    throw dataBackendUnavailable();
  }

  await enforceSessionsExportRateLimit(owner);

  return buildAnonymousDataExport(
    await loadAnonymousOwnerExportRows(owner.id),
  );
}

export async function deleteAnonymousOwnerJourneys(request: Request) {
  const owner = await resolveAnonymousOwnerIfPresent(request);

  if (owner) {
    await enforceSessionsDeleteRateLimit(owner);
    await deleteAnonymousOwnerData(owner.id);
  }

  return {
    result: { status: "deleted" as const },
    setCookie: serializeClearAnonymousOwnerCookie(),
  };
}

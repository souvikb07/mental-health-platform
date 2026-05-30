import "server-only";

import { sameOriginRequired } from "@/lib/server/http/api-errors";

export function assertSameOrigin(request: Request) {
  if (request.headers.get("sec-fetch-site")?.toLowerCase() === "cross-site") {
    throw sameOriginRequired();
  }

  const origin = request.headers.get("origin");

  if (!origin) {
    return;
  }

  let parsedOrigin: URL;
  let requestOrigin: string;

  try {
    parsedOrigin = new URL(origin);
    requestOrigin = new URL(request.url).origin;
  } catch {
    throw sameOriginRequired();
  }

  if (parsedOrigin.origin !== origin || parsedOrigin.origin !== requestOrigin) {
    throw sameOriginRequired();
  }
}

import "server-only";

import { isIP } from "node:net";

import { resolveTrustedIpSource } from "@/lib/server/rate-limit/config";

export function getTrustedVercelIpSubject(
  request: Request,
  env: NodeJS.ProcessEnv = process.env,
) {
  if (resolveTrustedIpSource(env) !== "vercel" || env.VERCEL !== "1") {
    return null;
  }

  const subject = request.headers.get("x-forwarded-for")?.trim();

  if (!subject || subject.includes(",") || isIP(subject) === 0) {
    return null;
  }

  return subject;
}

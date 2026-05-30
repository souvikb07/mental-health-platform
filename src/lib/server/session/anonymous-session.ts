import "server-only";

import { randomBytes } from "node:crypto";

export const ANONYMOUS_OWNER_COOKIE = "mindbridge_anon_owner";
export const ANONYMOUS_OWNER_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export function createAnonymousOwnerToken() {
  return randomBytes(32).toString("base64url");
}

export function resolveAnonymousOwnerToken(
  request: Request,
  createToken = createAnonymousOwnerToken,
) {
  return getValidAnonymousOwnerToken(request) ?? createToken();
}

export function getValidAnonymousOwnerToken(request: Request) {
  const cookieHeader = request.headers.get("cookie");

  if (!cookieHeader) {
    return undefined;
  }

  const matchingCookies = cookieHeader
    .split(";")
    .filter((part) => part.trim().split("=")[0] === ANONYMOUS_OWNER_COOKIE);

  if (matchingCookies.length !== 1) {
    return undefined;
  }

  const [, ...valueParts] = matchingCookies[0].trim().split("=");
  let token: string;

  try {
    token = decodeURIComponent(valueParts.join("="));
  } catch {
    return undefined;
  }

  return isCanonicalAnonymousOwnerToken(token) ? token : undefined;
}

export function serializeAnonymousOwnerCookie(token: string) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";

  return [
    `${ANONYMOUS_OWNER_COOKIE}=${encodeURIComponent(token)}`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/",
    `Max-Age=${ANONYMOUS_OWNER_COOKIE_MAX_AGE_SECONDS}${secure}`,
  ].join("; ");
}

function isCanonicalAnonymousOwnerToken(token: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(token)) {
    return false;
  }

  const bytes = Buffer.from(token, "base64url");
  return bytes.length === 32 && bytes.toString("base64url") === token;
}

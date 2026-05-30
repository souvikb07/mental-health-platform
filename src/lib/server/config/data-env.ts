import "server-only";

import {
  validateEncryptionKey,
  validateRateLimitHmacKey,
} from "@/lib/server/crypto/sensitive-data";

export type DataMode = "transient" | "supabase";

export type DataEnvironment =
  | { mode: "transient" }
  | {
      mode: "supabase";
      supabaseUrl: string;
      supabaseServerKey: string;
      encryptionKeyV1: string;
      rateLimitHmacKey: string;
    };

export function getDataEnvironment(
  env: NodeJS.ProcessEnv = process.env,
): DataEnvironment {
  const mode = resolveDataMode(env);

  if (mode === "transient") {
    return { mode };
  }

  return {
    mode,
    supabaseUrl: validateSupabaseUrl(env.SUPABASE_URL),
    supabaseServerKey: resolveSupabaseServerKey(env),
    encryptionKeyV1: validateEncryptionKey(
      env.MIND_BRIDGE_DATA_ENCRYPTION_KEY_V1,
    ),
    rateLimitHmacKey: validateRateLimitHmacKey(
      env.MIND_BRIDGE_RATE_LIMIT_HMAC_KEY,
    ),
  };
}

export function resolveDataMode(env: NodeJS.ProcessEnv = process.env): DataMode {
  const configured = env.MIND_BRIDGE_DATA_MODE?.trim().toLowerCase();

  if (configured === "transient" || configured === "supabase") {
    if (env.NODE_ENV === "production" && configured !== "supabase") {
      throw new Error("Production requires MIND_BRIDGE_DATA_MODE=supabase.");
    }

    return configured;
  }

  if (configured) {
    throw new Error("MIND_BRIDGE_DATA_MODE must be transient or supabase.");
  }

  return env.NODE_ENV === "production" ? "supabase" : "transient";
}

function validateSupabaseUrl(value: string | undefined) {
  const normalized = requireValue(value, "SUPABASE_URL");
  let url: URL;

  try {
    url = new URL(normalized);
  } catch {
    throw new Error("SUPABASE_URL must be a valid HTTP(S) URL.");
  }

  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  ) {
    throw new Error(
      "SUPABASE_URL must be a valid HTTP(S) URL without embedded credentials.",
    );
  }

  return normalized;
}

function resolveSupabaseServerKey(env: NodeJS.ProcessEnv) {
  return requireValue(
    env.SUPABASE_SECRET_KEY?.trim() || env.SUPABASE_SERVICE_ROLE_KEY,
    "SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY",
  );
}

function requireValue(value: string | undefined, name: string) {
  const normalized = value?.trim();

  if (!normalized) {
    throw new Error(`${name} is required.`);
  }

  return normalized;
}

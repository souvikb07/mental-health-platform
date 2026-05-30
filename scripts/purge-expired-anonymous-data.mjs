#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";

try {
  const client = createClient(
    getSupabaseUrl(process.env.SUPABASE_URL),
    getSupabaseServerKey(process.env),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
  const { data, error } = await client.rpc("purge_expired_anonymous_data");

  if (error || !Array.isArray(data) || data.length !== 1) {
    throw new Error("Purge RPC failed.");
  }

  console.log(JSON.stringify(normalizeCounts(data[0])));
} catch {
  console.error("Anonymous data purge failed.");
  process.exitCode = 1;
}

function getSupabaseUrl(value) {
  const normalized = value?.trim();
  let url;

  try {
    url = new URL(normalized);
  } catch {
    throw new Error("Supabase URL is invalid.");
  }

  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  ) {
    throw new Error("Supabase URL is invalid.");
  }

  return normalized;
}

function getSupabaseServerKey(env) {
  const key =
    env.SUPABASE_SECRET_KEY?.trim() ||
    env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!key) {
    throw new Error("Supabase server key is missing.");
  }

  return key;
}

function normalizeCounts(value) {
  if (
    !isRecord(value) ||
    !isNonNegativeInteger(value.deleted_sessions) ||
    !isNonNegativeInteger(value.deleted_owners) ||
    !isNonNegativeInteger(value.deleted_rate_limit_buckets)
  ) {
    throw new Error("Purge RPC response is invalid.");
  }

  return {
    deletedSessions: value.deleted_sessions,
    deletedOwners: value.deleted_owners,
    deletedRateLimitBuckets: value.deleted_rate_limit_buckets,
  };
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

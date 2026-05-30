import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getDataEnvironment } from "@/lib/server/config/data-env";

let cachedClient: SupabaseClient | null = null;

export function getSupabaseServerClient(): SupabaseClient | null {
  const environment = getDataEnvironment();

  if (environment.mode === "transient") {
    return null;
  }

  if (!cachedClient) {
    cachedClient = createClient(
      environment.supabaseUrl,
      environment.supabaseServerKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      },
    );
  }

  return cachedClient;
}

export function resetSupabaseServerClientForTests() {
  cachedClient = null;
}

"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "@/lib/supabase/public-config";

let supabaseClient: SupabaseClient | undefined;

export function getSupabaseBrowserClient(): SupabaseClient {
  if (supabaseClient) return supabaseClient;

  const config = getSupabasePublicConfig();
  if (!config) {
    throw new Error(
      "Supabase Auth is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  supabaseClient = createClient(config.url, config.anonKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
    },
  });
  return supabaseClient;
}

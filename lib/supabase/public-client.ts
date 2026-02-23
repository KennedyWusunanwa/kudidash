"use client";

import { createClient } from "@supabase/supabase-js";

// Optional direct browser client (e.g., realtime subscriptions). Normal auth/session flows use @supabase/ssr.
export function createSupabasePublicJsClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!url || !key) throw new Error("Missing Supabase public env vars.");
  return createClient(url, key);
}

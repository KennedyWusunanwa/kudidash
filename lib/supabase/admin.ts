import { createClient } from "@supabase/supabase-js";

export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) throw new Error("Missing Supabase admin env vars.");
  // IMPORTANT: server-only. Never import this from client components.
  return createClient(url, key, { auth: { persistSession: false } });
}

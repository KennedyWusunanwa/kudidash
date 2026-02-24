export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function isDemoMode() {
  return process.env.KUDIDASH_DEMO_MODE === "true";
}

export function isPublicSignupEnabled() {
  return process.env.KUDIDASH_ALLOW_PUBLIC_SIGNUP === "true";
}

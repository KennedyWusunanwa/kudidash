import { createBrowserClient } from "@supabase/ssr";

export function getSupabaseBrowserConfigIssue() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return "Missing Supabase public env vars.";

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "NEXT_PUBLIC_SUPABASE_URL is not a valid URL.";
  }

  if (typeof window !== "undefined") {
    const appHost = window.location.host;
    if (parsed.host === appHost) {
      return "NEXT_PUBLIC_SUPABASE_URL is set to this app domain. Set it to your Supabase project URL (https://<project-ref>.supabase.co).";
    }
  }

  return null;
}

export function createSupabaseBrowserClient() {
  const issue = getSupabaseBrowserConfigIssue();
  if (issue) throw new Error(issue);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createBrowserClient(url, key);
}

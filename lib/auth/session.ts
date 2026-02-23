import { redirect } from "next/navigation";
import { isDemoMode } from "@/lib/env";
import { demoSession, demoUser } from "@/lib/demo/data";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getSessionOrRedirect() {
  if (isDemoMode()) {
    return demoSession as any;
  }

  const supabase = createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/sign-in");
  }

  return session;
}

export async function getUserOrRedirect() {
  if (isDemoMode()) {
    return demoUser as any;
  }

  const session = await getSessionOrRedirect();
  if (!session.user) {
    redirect("/sign-in");
  }
  return session.user;
}

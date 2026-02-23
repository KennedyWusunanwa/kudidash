"use server";

import { redirect } from "next/navigation";
import { isDemoMode } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function signOutAction() {
  if (isDemoMode()) {
    redirect("/sign-in");
  }

  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
}

"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { demoIds } from "@/lib/demo/data";
import { isDemoMode } from "@/lib/env";
import {
  ActionResult,
  getServerSupabaseForOrg,
  parseActionError,
  revalidateOrgPaths,
} from "@/lib/actions/_helpers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/data/org.data";

const createOrgSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9-]+$/),
  base_currency: z.string().length(3).default("GHS"),
});

const switchOrgSchema = z.object({
  orgId: z.string().uuid(),
});

const addMemberSchema = z.object({
  orgId: z.string().uuid(),
  user_id: z.string().uuid(),
  role: z.enum(["owner", "admin", "accountant", "approver", "viewer"]),
});

const updateMemberRoleSchema = z.object({
  orgId: z.string().uuid(),
  user_id: z.string().uuid(),
  role: z.enum(["owner", "admin", "accountant", "approver", "viewer"]),
});

const disableMemberSchema = z.object({
  orgId: z.string().uuid(),
  user_id: z.string().uuid(),
});

export async function createOrgAction(
  input: z.infer<typeof createOrgSchema>
): Promise<ActionResult<{ orgId: string }>> {
  try {
    const parsed = createOrgSchema.parse(input);
    if (isDemoMode()) {
      return { success: true, data: { orgId: demoIds.orgId } };
    }

    const supabase = createSupabaseServerClient();
    const user = await getCurrentUser();
    if (!user) throw new Error("Not authenticated.");

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert({
        name: parsed.name,
        slug: parsed.slug,
        base_currency: parsed.base_currency.toUpperCase(),
      })
      .select("id")
      .single();
    if (orgError) throw orgError;

    const { error: memberError } = await supabase.from("org_members").insert({
      org_id: org.id,
      user_id: user.id,
      role: "owner",
      is_active: true,
    });
    if (memberError) throw memberError;

    await supabase.from("org_account_settings").upsert({ org_id: org.id });

    return { success: true, data: { orgId: org.id as string } };
  } catch (error) {
    return { success: false, error: parseActionError(error) };
  }
}

export async function switchOrgAction(input: z.infer<typeof switchOrgSchema>) {
  const parsed = switchOrgSchema.parse(input);
  redirect(`/${parsed.orgId}/dashboard`);
}

export async function addMemberAction(
  input: z.infer<typeof addMemberSchema>
): Promise<ActionResult> {
  try {
    const parsed = addMemberSchema.parse(input);
    if (isDemoMode()) {
      revalidateOrgPaths(parsed.orgId, ["/settings/users-roles"]);
      return { success: true };
    }
    const supabase = await getServerSupabaseForOrg(parsed.orgId, "org.members.manage");
    const { error } = await supabase.from("org_members").upsert({
      org_id: parsed.orgId,
      user_id: parsed.user_id,
      role: parsed.role,
      is_active: true,
    });
    if (error) throw error;
    revalidateOrgPaths(parsed.orgId, ["/settings/users-roles"]);
    return { success: true };
  } catch (error) {
    return { success: false, error: parseActionError(error) };
  }
}

export async function updateMemberRoleAction(
  input: z.infer<typeof updateMemberRoleSchema>
): Promise<ActionResult> {
  try {
    const parsed = updateMemberRoleSchema.parse(input);
    if (isDemoMode()) {
      revalidateOrgPaths(parsed.orgId, ["/settings/users-roles"]);
      return { success: true };
    }
    const supabase = await getServerSupabaseForOrg(parsed.orgId, "org.members.manage");
    const { error } = await supabase
      .from("org_members")
      .update({ role: parsed.role })
      .eq("org_id", parsed.orgId)
      .eq("user_id", parsed.user_id);
    if (error) throw error;
    revalidateOrgPaths(parsed.orgId, ["/settings/users-roles"]);
    return { success: true };
  } catch (error) {
    return { success: false, error: parseActionError(error) };
  }
}

export async function disableMemberAction(
  input: z.infer<typeof disableMemberSchema>
): Promise<ActionResult> {
  try {
    const parsed = disableMemberSchema.parse(input);
    if (isDemoMode()) {
      revalidateOrgPaths(parsed.orgId, ["/settings/users-roles"]);
      return { success: true };
    }
    const supabase = await getServerSupabaseForOrg(parsed.orgId, "org.members.manage");
    const { error } = await supabase
      .from("org_members")
      .update({ is_active: false })
      .eq("org_id", parsed.orgId)
      .eq("user_id", parsed.user_id);
    if (error) throw error;
    revalidateOrgPaths(parsed.orgId, ["/settings/users-roles"]);
    return { success: true };
  } catch (error) {
    return { success: false, error: parseActionError(error) };
  }
}

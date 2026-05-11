"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { DEFAULT_CURRENCY_CODE } from "@/lib/currencies";
import { demoIds } from "@/lib/demo/data";
import { isDemoMode } from "@/lib/env";
import {
  ActionResult,
  getServerSupabaseForOrg,
  parseActionError,
  requireOrgPermission,
  revalidateOrgPaths,
} from "@/lib/actions/_helpers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/data/org.data";

const createOrgSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9-]+$/),
  base_currency: z.string().length(3).default(DEFAULT_CURRENCY_CODE),
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

const createManagedUserSchema = z.object({
  orgId: z.string().uuid(),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters."),
  full_name: z.string().trim().max(120).optional().or(z.literal("")),
  role: z.enum(["owner", "admin", "accountant", "approver", "viewer"]),
});

const setMemberPasswordSchema = z.object({
  orgId: z.string().uuid(),
  user_id: z.string().uuid(),
  password: z.string().min(8, "Password must be at least 8 characters."),
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

    const orgId = crypto.randomUUID();

    const { error: orgError } = await supabase
      .from("organizations")
      .insert({
        id: orgId,
        name: parsed.name,
        slug: parsed.slug,
        base_currency: parsed.base_currency.toUpperCase(),
        created_by: user.id,
      })
    if (orgError) throw orgError;

    const { error: memberError } = await supabase.from("org_members").insert({
      org_id: orgId,
      user_id: user.id,
      role: "owner",
      is_active: true,
    });
    if (memberError) throw memberError;

    await supabase.from("org_account_settings").upsert({ org_id: orgId });

    return { success: true, data: { orgId } };
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

export async function createManagedUserAction(
  input: z.infer<typeof createManagedUserSchema>
): Promise<ActionResult<{ user_id: string }>> {
  try {
    const parsed = createManagedUserSchema.parse(input);

    if (isDemoMode()) {
      revalidateOrgPaths(parsed.orgId, ["/settings/users-roles"]);
      return { success: true, data: { user_id: crypto.randomUUID() } };
    }

    await requireOrgPermission(parsed.orgId, "org.members.manage");

    const adminClient = createSupabaseAdminClient();
    const normalizedEmail = parsed.email.trim().toLowerCase();
    const displayName = parsed.full_name?.trim() || null;

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email: normalizedEmail,
      password: parsed.password,
      email_confirm: true,
      user_metadata: displayName ? { full_name: displayName } : undefined,
    });
    if (createError) throw createError;

    const userId = created.user?.id;
    if (!userId) throw new Error("User creation succeeded but no user ID was returned.");

    const { error: memberError } = await adminClient.from("org_members").upsert({
      org_id: parsed.orgId,
      user_id: userId,
      role: parsed.role,
      is_active: true,
    });
    if (memberError) {
      await adminClient.auth.admin.deleteUser(userId);
      throw memberError;
    }

    if (displayName) {
      await adminClient
        .from("profiles")
        .upsert({ id: userId, email: normalizedEmail, full_name: displayName });
    }

    revalidateOrgPaths(parsed.orgId, ["/settings/users-roles"]);
    return { success: true, data: { user_id: userId } };
  } catch (error) {
    return { success: false, error: parseActionError(error) };
  }
}

export async function setMemberPasswordAction(
  input: z.infer<typeof setMemberPasswordSchema>
): Promise<ActionResult> {
  try {
    const parsed = setMemberPasswordSchema.parse(input);

    if (isDemoMode()) {
      return { success: true };
    }

    await requireOrgPermission(parsed.orgId, "org.members.manage");

    const adminClient = createSupabaseAdminClient();
    const { error } = await adminClient.auth.admin.updateUserById(parsed.user_id, {
      password: parsed.password,
    });
    if (error) throw error;

    return { success: true };
  } catch (error) {
    return { success: false, error: parseActionError(error) };
  }
}

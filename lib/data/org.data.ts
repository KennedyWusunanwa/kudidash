import { cache } from "react";
import { isDemoMode } from "@/lib/env";
import {
  demoOrgAccountSettings,
  demoOrgMembers,
  demoOrganization,
  demoOrgMembership,
  demoUser,
  demoUserOrganizations,
} from "@/lib/demo/data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Role } from "@/types/accounting";

export interface OrgMembershipContext {
  orgId: string;
  role: Role;
  isActive: boolean;
}

export const getCurrentUser = cache(async () => {
  if (isDemoMode()) {
    return demoUser as any;
  }

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
});

export async function requireOrgMembership(orgId: string) {
  if (isDemoMode()) {
    return {
      orgId,
      role: demoOrgMembership.role,
      isActive: true,
    } satisfies OrgMembershipContext;
  }

  const supabase = createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Not authenticated.");
  }

  const { data, error } = await supabase
    .from("org_members")
    .select("org_id, role, is_active")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .single();

  if (error || !data || !data.is_active) {
    throw new Error("Access denied for organization.");
  }

  return {
    orgId: data.org_id as string,
    role: data.role as Role,
    isActive: Boolean(data.is_active),
  } satisfies OrgMembershipContext;
}

export async function listUserOrganizations() {
  if (isDemoMode()) {
    return demoUserOrganizations();
  }

  const supabase = createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("org_members")
    .select(
      "org_id, role, is_active, organizations:org_id(id,name,slug,base_currency,is_active)"
    )
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => ({
    org_id: row.org_id as string,
    role: row.role as Role,
    is_active: Boolean(row.is_active),
    organization: Array.isArray(row.organizations)
      ? row.organizations[0]
      : row.organizations,
  }));
}

export async function getOrganizationById(orgId: string) {
  if (isDemoMode()) {
    return { ...demoOrganization, id: orgId };
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", orgId)
    .single();
  if (error) throw error;
  return data;
}

export async function getOrgAccountSettings(orgId: string) {
  if (isDemoMode()) {
    return { ...demoOrgAccountSettings, org_id: orgId };
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("org_account_settings")
    .select("*")
    .eq("org_id", orgId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listOrgMembers(orgId: string) {
  if (isDemoMode()) {
    return demoOrgMembers.map((row) => ({ ...row, org_id: orgId })) as Array<{
      org_id: string;
      user_id: string;
      role: Role;
      is_active: boolean;
      email: string | null;
      full_name: string | null;
    }>;
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("org_members")
    .select("org_id, user_id, role, is_active, profiles:user_id(email, full_name)")
    .eq("org_id", orgId)
    .order("created_at", { ascending: true });
  if (error) throw error;

  return (data ?? []).map((row) => ({
    org_id: row.org_id as string,
    user_id: row.user_id as string,
    role: row.role as Role,
    is_active: Boolean(row.is_active),
    email: (Array.isArray(row.profiles) ? row.profiles[0] : row.profiles)?.email ?? null,
    full_name:
      (Array.isArray(row.profiles) ? row.profiles[0] : row.profiles)?.full_name ?? null,
  }));
}

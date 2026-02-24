import { revalidatePath } from "next/cache";
import { isDemoMode } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireOrgMembership } from "@/lib/data/org.data";
import { roleHasPermission, type Permission } from "@/lib/permissions";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function requireOrgPermission(orgId: string, permission: Permission) {
  const membership = await requireOrgMembership(orgId);
  if (!roleHasPermission(membership.role, permission)) {
    throw new Error(`Permission denied: ${permission}`);
  }
  return membership;
}

export async function getServerSupabaseForOrg(orgId: string, permission?: Permission) {
  if (permission) {
    await requireOrgPermission(orgId, permission);
  } else {
    await requireOrgMembership(orgId);
  }

  if (isDemoMode()) {
    throw new Error(
      "Demo mode is enabled. Supabase mutations are disabled and must be handled by demo-safe actions."
    );
  }

  return createSupabaseServerClient();
}

export function parseActionError(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }
  return "Unexpected error.";
}

export function revalidateOrgPaths(orgId: string, paths: string[]) {
  for (const path of paths) {
    revalidatePath(`/${orgId}${path}`);
  }
}

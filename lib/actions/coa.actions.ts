"use server";

import { z } from "zod";
import { isDemoMode } from "@/lib/env";
import {
  ActionResult,
  getServerSupabaseForOrg,
  parseActionError,
  revalidateOrgPaths,
} from "@/lib/actions/_helpers";
import { accountSchema, updateAccountSchema } from "@/lib/validators/account";

const orgScopedAccountSchema = accountSchema.extend({ orgId: z.string().uuid() });
const orgScopedUpdateAccountSchema = updateAccountSchema.extend({
  orgId: z.string().uuid(),
});

const deactivateSchema = z.object({
  orgId: z.string().uuid(),
  id: z.string().uuid(),
});

export async function createAccountAction(
  input: z.infer<typeof orgScopedAccountSchema>
): Promise<ActionResult> {
  try {
    const parsed = orgScopedAccountSchema.parse(input);
    if (isDemoMode()) {
      revalidateOrgPaths(parsed.orgId, ["/coa", "/settings"]);
      return { success: true };
    }
    const supabase = await getServerSupabaseForOrg(parsed.orgId, "coa.manage");
    const { orgId, ...account } = parsed;
    const { error } = await supabase.from("chart_of_accounts").insert({
      org_id: orgId,
      ...account,
      currency_code: account.currency_code.toUpperCase(),
    });
    if (error) throw error;
    revalidateOrgPaths(orgId, ["/coa", "/settings"]);
    return { success: true };
  } catch (error) {
    return { success: false, error: parseActionError(error) };
  }
}

export async function updateAccountAction(
  input: z.infer<typeof orgScopedUpdateAccountSchema>
): Promise<ActionResult> {
  try {
    const parsed = orgScopedUpdateAccountSchema.parse(input);
    if (isDemoMode()) {
      revalidateOrgPaths(parsed.orgId, ["/coa", "/settings"]);
      return { success: true };
    }
    const supabase = await getServerSupabaseForOrg(parsed.orgId, "coa.manage");
    const { orgId, id, ...account } = parsed;
    const { error } = await supabase
      .from("chart_of_accounts")
      .update(account)
      .eq("org_id", orgId)
      .eq("id", id);
    if (error) throw error;
    revalidateOrgPaths(orgId, ["/coa", "/settings"]);
    return { success: true };
  } catch (error) {
    return { success: false, error: parseActionError(error) };
  }
}

export async function deactivateAccountAction(
  input: z.infer<typeof deactivateSchema>
): Promise<ActionResult> {
  try {
    const parsed = deactivateSchema.parse(input);
    if (isDemoMode()) {
      revalidateOrgPaths(parsed.orgId, ["/coa"]);
      return { success: true };
    }
    const supabase = await getServerSupabaseForOrg(parsed.orgId, "coa.manage");
    const { error } = await supabase
      .from("chart_of_accounts")
      .update({ is_active: false })
      .eq("org_id", parsed.orgId)
      .eq("id", parsed.id);
    if (error) throw error;
    revalidateOrgPaths(parsed.orgId, ["/coa"]);
    return { success: true };
  } catch (error) {
    return { success: false, error: parseActionError(error) };
  }
}

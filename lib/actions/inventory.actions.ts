"use server";

import { z } from "zod";
import { isDemoMode } from "@/lib/env";
import {
  ActionResult,
  getServerSupabaseForOrg,
  parseActionError,
  revalidateOrgPaths,
} from "@/lib/actions/_helpers";
import {
  deactivateInventoryItemSchema,
  inventoryItemSchema,
} from "@/lib/validators/inventory";

const createInventoryItemInputSchema = inventoryItemSchema.extend({
  orgId: z.string().uuid(),
});

export async function createInventoryItemAction(
  input: z.infer<typeof createInventoryItemInputSchema>
): Promise<ActionResult<{ id?: string }>> {
  try {
    const parsed = createInventoryItemInputSchema.parse(input);

    if (isDemoMode()) {
      revalidateOrgPaths(parsed.orgId, ["/inventory"]);
      return { success: true, data: { id: crypto.randomUUID() } };
    }

    const supabase = await getServerSupabaseForOrg(parsed.orgId, "inventory.manage");
    const { orgId, ...rest } = parsed;
    const payload = {
      org_id: orgId,
      ...rest,
      inventory_account_id: rest.inventory_account_id || null,
      cogs_account_id: rest.cogs_account_id || null,
      revenue_account_id: rest.revenue_account_id || null,
    };

    const { data, error } = await supabase
      .from("inventory_items")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw error;

    revalidateOrgPaths(orgId, ["/inventory"]);
    return { success: true, data: { id: data.id as string } };
  } catch (error) {
    return { success: false, error: parseActionError(error) };
  }
}

export async function deactivateInventoryItemAction(
  input: z.infer<typeof deactivateInventoryItemSchema>
): Promise<ActionResult> {
  try {
    const parsed = deactivateInventoryItemSchema.parse(input);

    if (isDemoMode()) {
      revalidateOrgPaths(parsed.orgId, ["/inventory"]);
      return { success: true };
    }

    const supabase = await getServerSupabaseForOrg(parsed.orgId, "inventory.manage");
    const { error } = await supabase
      .from("inventory_items")
      .update({ is_active: false })
      .eq("org_id", parsed.orgId)
      .eq("id", parsed.id);
    if (error) throw error;

    revalidateOrgPaths(parsed.orgId, ["/inventory"]);
    return { success: true };
  } catch (error) {
    return { success: false, error: parseActionError(error) };
  }
}


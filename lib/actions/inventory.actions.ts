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
const updateInventoryItemInputSchema = inventoryItemSchema.extend({
  orgId: z.string().uuid(),
  id: z.string().uuid(),
});
const deleteInventoryItemInputSchema = z.object({
  orgId: z.string().uuid(),
  id: z.string().uuid(),
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

export async function updateInventoryItemAction(
  input: z.infer<typeof updateInventoryItemInputSchema>
): Promise<ActionResult> {
  try {
    const parsed = updateInventoryItemInputSchema.parse(input);

    if (isDemoMode()) {
      revalidateOrgPaths(parsed.orgId, ["/inventory", `/inventory/${parsed.id}`, "/invoices/new"]);
      return { success: true };
    }

    const supabase = await getServerSupabaseForOrg(parsed.orgId, "org.manage");
    const { orgId, id, ...rest } = parsed;
    const payload = {
      ...rest,
      inventory_account_id: rest.inventory_account_id || null,
      cogs_account_id: rest.cogs_account_id || null,
      revenue_account_id: rest.revenue_account_id || null,
    };

    const { error } = await supabase
      .from("inventory_items")
      .update(payload)
      .eq("org_id", orgId)
      .eq("id", id);
    if (error) throw error;

    revalidateOrgPaths(orgId, ["/inventory", `/inventory/${id}`, "/invoices/new"]);
    return { success: true };
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

export async function deleteInventoryItemAction(
  input: z.infer<typeof deleteInventoryItemInputSchema>
): Promise<ActionResult> {
  try {
    const parsed = deleteInventoryItemInputSchema.parse(input);

    if (isDemoMode()) {
      revalidateOrgPaths(parsed.orgId, ["/inventory", `/inventory/${parsed.id}`, "/invoices/new"]);
      return { success: true };
    }

    const supabase = await getServerSupabaseForOrg(parsed.orgId, "org.manage");
    const { error } = await supabase
      .from("inventory_items")
      .delete()
      .eq("org_id", parsed.orgId)
      .eq("id", parsed.id);
    if (error) throw error;

    revalidateOrgPaths(parsed.orgId, ["/inventory", `/inventory/${parsed.id}`, "/invoices/new"]);
    return { success: true };
  } catch (error) {
    return { success: false, error: parseActionError(error) };
  }
}

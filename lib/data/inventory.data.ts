import { isDemoMode } from "@/lib/env";
import { getCatalogItemBySku, getProductImagePublicUrl } from "@/lib/inventory/catalog";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const demoInventoryItems = [
  {
    id: "a1000000-0000-4000-8000-000000000001",
    org_id: "11111111-1111-4111-8111-111111111111",
    sku: "STATIONERY-001",
    name: "A4 Printing Paper Pack",
    sale_price: 32.5,
    purchase_price: 24,
    quantity_on_hand: 180,
    valuation_method: "weighted_average",
    is_active: true,
    inventory_account_id: null,
    cogs_account_id: null,
    revenue_account_id: null,
    created_at: "2026-02-23T12:00:00.000Z",
    updated_at: "2026-02-23T12:00:00.000Z",
  },
  {
    id: "a1000000-0000-4000-8000-000000000002",
    org_id: "11111111-1111-4111-8111-111111111111",
    sku: "SERVICE-KIT-002",
    name: "Field Service Starter Kit",
    sale_price: 180,
    purchase_price: 120,
    quantity_on_hand: 42,
    valuation_method: "fifo",
    is_active: true,
    inventory_account_id: null,
    cogs_account_id: null,
    revenue_account_id: null,
    created_at: "2026-02-23T12:00:00.000Z",
    updated_at: "2026-02-23T12:00:00.000Z",
  },
];

export async function listInventoryItems(orgId: string) {
  if (isDemoMode()) {
    return demoInventoryItems.map((row) => ({
      ...row,
      org_id: orgId,
      stock_value: Number((Number(row.quantity_on_hand ?? 0) * Number(row.purchase_price ?? 0)).toFixed(2)),
    }));
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("inventory_items")
    .select(
      "*, inventory_account:inventory_account_id(id, code, name), cogs_account:cogs_account_id(id, code, name), revenue_account:revenue_account_id(id, code, name)"
    )
    .eq("org_id", orgId)
    .order("sku", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => ({
    ...row,
    catalog_item: getCatalogItemBySku(String((row as Record<string, unknown>).sku ?? "")),
    image_url: getProductImagePublicUrl(orgId, String((row as Record<string, unknown>).sku ?? "")),
    stock_value: Number(
      (Number((row as Record<string, unknown>).quantity_on_hand ?? 0) * Number((row as Record<string, unknown>).purchase_price ?? 0)).toFixed(2)
    ),
  }));
}

export async function getInventoryItem(orgId: string, itemId: string) {
  if (isDemoMode()) {
    return (
      demoInventoryItems.find((row) => row.id === itemId) ??
      ({ ...demoInventoryItems[0], id: itemId, org_id: orgId, sku: "ITEM-EDIT", name: "Demo Item" } as any)
    );
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("inventory_items")
    .select("*")
    .eq("org_id", orgId)
    .eq("id", itemId)
    .single();

  if (error) throw error;
  return data;
}

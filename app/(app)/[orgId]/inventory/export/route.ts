import { NextResponse } from "next/server";
import { requireOrgMembership } from "@/lib/data/org.data";
import { listInventoryItems } from "@/lib/data/inventory.data";
import { buildInventoryWorkbook } from "@/lib/inventory/export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params;
  await requireOrgMembership(orgId);

  const items = (await listInventoryItems(orgId)) as Array<Record<string, unknown>>;
  const workbook = await buildInventoryWorkbook(
    items.map((item) => ({
      id: String(item.id ?? ""),
      org_id: String(item.org_id ?? orgId),
      sku: String(item.sku ?? ""),
      name: String(item.name ?? ""),
      sale_price: Number(item.sale_price ?? 0),
      purchase_price: Number(item.purchase_price ?? 0),
      quantity_on_hand: Number(item.quantity_on_hand ?? 0),
      is_active: item.is_active !== false,
      created_at: typeof item.created_at === "string" ? item.created_at : null,
      updated_at: typeof item.updated_at === "string" ? item.updated_at : null,
    }))
  );

  return new NextResponse(workbook, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=\"inventory-export-${orgId}.xlsx\"`,
    },
  });
}

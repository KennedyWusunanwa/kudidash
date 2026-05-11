import { Boxes } from "lucide-react";
import Link from "next/link";
import { listAccountsForSelect } from "@/lib/data/coa.data";
import { listInventoryItems } from "@/lib/data/inventory.data";
import { getOrganizationById, requireOrgMembership } from "@/lib/data/org.data";
import { roleHasPermission } from "@/lib/permissions";
import { InventoryItemForm } from "@/components/forms/inventory-item-form";
import { InventoryItemsTable } from "@/components/tables/inventory-items-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function InventoryPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const [items, accounts, org, membership] = await Promise.all([
    listInventoryItems(orgId),
    listAccountsForSelect(orgId),
    getOrganizationById(orgId),
    requireOrgMembership(orgId),
  ]);
  const baseCurrency =
    typeof org?.base_currency === "string" && org.base_currency.trim()
      ? org.base_currency.trim().toUpperCase()
      : undefined;
  const canManageInventory = roleHasPermission(membership.role, "inventory.manage");
  const canManageInventoryAdmin = roleHasPermission(membership.role, "org.manage");
  const totalStockValue = (items as Array<Record<string, unknown>>).reduce(
    (sum, item) => sum + Number(item.stock_value ?? 0),
    0
  );
  const totalUnits = (items as Array<Record<string, unknown>>).reduce(
    (sum, item) => sum + Number(item.quantity_on_hand ?? 0),
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg border bg-background">
            <Boxes className="size-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Inventory</h2>
            <p className="text-sm text-muted-foreground">
              Manage stock quantities, pricing defaults, and account mappings used by bills, invoices,
              and inventory valuation.
            </p>
          </div>
        </div>
        <Button asChild variant="outline">
          <Link href={`/${orgId}/inventory/export`}>Download inventory workbook</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Inventory summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Units on hand</p>
              <p className="mt-2 text-2xl font-semibold">{totalUnits.toLocaleString()}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Inventory value</p>
              <p className="mt-2 text-2xl font-semibold">
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: baseCurrency || "GHS",
                  maximumFractionDigits: 2,
                }).format(totalStockValue)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {canManageInventory ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add inventory item</CardTitle>
          </CardHeader>
          <CardContent>
            <InventoryItemForm orgId={orgId} accountOptions={accounts} />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inventory changes are restricted</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Your role can view stock, but only users with `inventory.manage` can add or adjust items.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Inventory register</CardTitle>
        </CardHeader>
        <CardContent>
          <InventoryItemsTable
            orgId={orgId}
            items={items as any}
            currencyCode={baseCurrency}
            canManageInventory={canManageInventory}
            canManageAdmin={canManageInventoryAdmin}
          />
        </CardContent>
      </Card>
    </div>
  );
}

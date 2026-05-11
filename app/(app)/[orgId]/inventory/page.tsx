import { Boxes, Download, PackageSearch, Sparkles } from "lucide-react";
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
  const activeItems = (items as Array<Record<string, unknown>>).filter((item) => item.is_active !== false).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl border border-border/70 bg-background shadow-sm">
            <PackageSearch className="size-5" />
          </div>
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
              <Sparkles className="size-3.5" />
              Inventory studio
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">Inventory</h2>
            <p className="text-sm text-muted-foreground">
              Browse products faster with filters, layout switching, product profiles, and export-ready stock views.
            </p>
          </div>
        </div>
        <Button asChild variant="outline">
          <Link href={`/${orgId}/inventory/export`}>
            <Download className="size-4" />
            Download inventory workbook
          </Link>
        </Button>
      </div>

      <Card className="overflow-hidden border-border/70 bg-card/90">
        <CardHeader className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.14),transparent_24%)]" />
          <CardTitle className="relative text-base">Inventory summary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Units on hand</p>
            <p className="mt-2 text-2xl font-semibold">{totalUnits.toLocaleString()}</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Inventory value</p>
            <p className="mt-2 text-2xl font-semibold">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: baseCurrency || "USD",
                maximumFractionDigits: 2,
              }).format(totalStockValue)}
            </p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Active products</p>
            <p className="mt-2 text-2xl font-semibold">{activeItems}</p>
          </div>
        </CardContent>
      </Card>

      {canManageInventory ? (
        <Card className="border-border/70 bg-card/85">
          <CardHeader>
            <CardTitle className="text-base">Add inventory item</CardTitle>
          </CardHeader>
          <CardContent>
            <InventoryItemForm orgId={orgId} accountOptions={accounts} />
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/70 bg-card/85">
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

      <Card className="border-border/70 bg-card/85">
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

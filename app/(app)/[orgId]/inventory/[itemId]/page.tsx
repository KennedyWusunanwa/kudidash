import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { listAccountsForSelect } from "@/lib/data/coa.data";
import { getInventoryItem } from "@/lib/data/inventory.data";
import { requireOrgMembership } from "@/lib/data/org.data";
import { roleHasPermission } from "@/lib/permissions";
import { InventoryItemForm } from "@/components/forms/inventory-item-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function InventoryItemEditPage({
  params,
}: {
  params: Promise<{ orgId: string; itemId: string }>;
}) {
  const { orgId, itemId } = await params;

  let item: Record<string, unknown>;
  try {
    item = (await getInventoryItem(orgId, itemId)) as Record<string, unknown>;
  } catch {
    notFound();
  }

  const [accounts, membership] = await Promise.all([
    listAccountsForSelect(orgId),
    requireOrgMembership(orgId),
  ]);
  const canManageAdmin = roleHasPermission(membership.role, "org.manage");

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Button asChild variant="ghost" size="sm" className="px-0">
          <Link href={`/${orgId}/inventory`}>
            <ArrowLeft className="size-4" />
            Back to inventory
          </Link>
        </Button>
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Edit Inventory Item</h2>
          <p className="text-sm text-muted-foreground">
            Update item defaults, pricing, and account mappings.
          </p>
        </div>
      </div>

      {canManageAdmin ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {String(item.sku ?? "")} - {String(item.name ?? "")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <InventoryItemForm
              orgId={orgId}
              mode="edit"
              itemId={itemId}
              accountOptions={accounts}
              initialValues={{
                sku: String(item.sku ?? ""),
                name: String(item.name ?? ""),
                sale_price: Number(item.sale_price ?? 0),
                purchase_price: Number(item.purchase_price ?? 0),
                inventory_account_id:
                  typeof item.inventory_account_id === "string" ? item.inventory_account_id : "",
                cogs_account_id: typeof item.cogs_account_id === "string" ? item.cogs_account_id : "",
                revenue_account_id:
                  typeof item.revenue_account_id === "string" ? item.revenue_account_id : "",
                valuation_method:
                  (String(item.valuation_method ?? "weighted_average") as
                    | "weighted_average"
                    | "fifo"
                    | "lifo"
                    | "specific_identification"),
                is_active: item.is_active !== false,
              }}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Admin only</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Only organization `owner` and `admin` roles can edit or delete inventory items.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

import { Boxes } from "lucide-react";
import { listAccountsForSelect } from "@/lib/data/coa.data";
import { listInventoryItems } from "@/lib/data/inventory.data";
import { InventoryItemForm } from "@/components/forms/inventory-item-form";
import { InventoryItemsTable } from "@/components/tables/inventory-items-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function InventoryPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const [items, accounts] = await Promise.all([
    listInventoryItems(orgId),
    listAccountsForSelect(orgId),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg border bg-background">
          <Boxes className="size-5" />
        </div>
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Inventory</h2>
          <p className="text-sm text-muted-foreground">
            Manage inventory items and account mappings. Inventory movements are scaffolded and
            marked UNSPECIFIED in this release.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add inventory item</CardTitle>
        </CardHeader>
        <CardContent>
          <InventoryItemForm orgId={orgId} accountOptions={accounts} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Inventory register</CardTitle>
        </CardHeader>
        <CardContent>
          <InventoryItemsTable orgId={orgId} items={items as any} />
        </CardContent>
      </Card>
    </div>
  );
}


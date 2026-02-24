"use client";

import { startTransition, useOptimistic } from "react";
import { Power } from "lucide-react";
import { toast } from "sonner";
import { deactivateInventoryItemAction } from "@/lib/actions/inventory.actions";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type InventoryRow = {
  id: string;
  sku: string;
  name: string;
  valuation_method: string;
  is_active: boolean;
  created_at?: string;
  inventory_account?: { code?: string; name?: string } | Array<{ code?: string; name?: string }> | null;
  cogs_account?: { code?: string; name?: string } | Array<{ code?: string; name?: string }> | null;
  revenue_account?: { code?: string; name?: string } | Array<{ code?: string; name?: string }> | null;
};

function accountLabel(
  account:
    | InventoryRow["inventory_account"]
    | InventoryRow["cogs_account"]
    | InventoryRow["revenue_account"]
) {
  const row = Array.isArray(account) ? account[0] : account;
  if (!row) return "-";
  return [row.code, row.name].filter(Boolean).join(" - ") || "-";
}

export function InventoryItemsTable({
  orgId,
  items,
}: {
  orgId: string;
  items: InventoryRow[];
}) {
  const [optimisticRows, applyOptimistic] = useOptimistic(
    items,
    (state: InventoryRow[], update: { id: string }) =>
      state.map((row) => (row.id === update.id ? { ...row, is_active: false } : row))
  );

  const deactivate = (id: string) => {
    applyOptimistic({ id });
    startTransition(async () => {
      const result = await deactivateInventoryItemAction({ orgId, id });
      if (!result.success) {
        toast.error(result.error || "Failed to deactivate inventory item.");
        return;
      }
      toast.success("Inventory item deactivated.");
    });
  };

  return (
    <>
      <div className="hidden rounded-lg border lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Valuation</TableHead>
              <TableHead>Inventory Account</TableHead>
              <TableHead>COGS Account</TableHead>
              <TableHead>Revenue Account</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {optimisticRows.length ? (
              optimisticRows.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.sku}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell className="capitalize">
                    {item.valuation_method.replace(/_/g, " ")}
                  </TableCell>
                  <TableCell>{accountLabel(item.inventory_account)}</TableCell>
                  <TableCell>{accountLabel(item.cogs_account)}</TableCell>
                  <TableCell>{accountLabel(item.revenue_account)}</TableCell>
                  <TableCell>
                    <Badge variant={item.is_active ? "default" : "secondary"}>
                      {item.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(item.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => deactivate(item.id)}
                      disabled={!item.is_active}
                    >
                      <Power className="size-4" />
                      Deactivate
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                  No inventory items yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-3 lg:hidden">
        {optimisticRows.length ? (
          optimisticRows.map((item) => (
            <div key={item.id} className="rounded-lg border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">
                    {item.sku} · {item.name}
                  </div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {item.valuation_method.replace(/_/g, " ")}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Inventory: {accountLabel(item.inventory_account)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    COGS: {accountLabel(item.cogs_account)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Revenue: {accountLabel(item.revenue_account)}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Created: {formatDate(item.created_at)}
                  </div>
                </div>
                <Badge variant={item.is_active ? "default" : "secondary"}>
                  {item.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="mt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => deactivate(item.id)}
                  disabled={!item.is_active}
                >
                  <Power className="size-4" />
                  Deactivate
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-lg border p-4 text-sm text-muted-foreground">
            No inventory items yet.
          </div>
        )}
      </div>
    </>
  );
}


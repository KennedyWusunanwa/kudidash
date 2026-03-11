"use client";

import Link from "next/link";
import { startTransition, useOptimistic } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Power, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  deactivateInventoryItemAction,
  deleteInventoryItemAction,
} from "@/lib/actions/inventory.actions";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
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
  sale_price?: number | null;
  purchase_price?: number | null;
  quantity_on_hand?: number | null;
  stock_value?: number | null;
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
  currencyCode,
  canManageInventory = false,
  canManageAdmin = false,
}: {
  orgId: string;
  items: InventoryRow[];
  currencyCode?: string | null;
  canManageInventory?: boolean;
  canManageAdmin?: boolean;
}) {
  const router = useRouter();
  const [optimisticRows, applyOptimistic] = useOptimistic(
    items,
    (
      state: InventoryRow[],
      update: { type: "deactivate" | "delete"; id: string }
    ) =>
      update.type === "delete"
        ? state.filter((row) => row.id !== update.id)
        : state.map((row) => (row.id === update.id ? { ...row, is_active: false } : row))
  );

  const deactivate = (id: string) => {
    applyOptimistic({ type: "deactivate", id });
    startTransition(async () => {
      const result = await deactivateInventoryItemAction({ orgId, id });
      if (!result.success) {
        toast.error(result.error || "Failed to deactivate inventory item.");
        router.refresh();
        return;
      }
      toast.success("Inventory item deactivated.");
      router.refresh();
    });
  };

  const deleteItem = (id: string, label: string) => {
    if (!window.confirm(`Delete inventory item "${label}"? This action cannot be undone.`)) {
      return;
    }
    applyOptimistic({ type: "delete", id });
    startTransition(async () => {
      const result = await deleteInventoryItemAction({ orgId, id });
      if (!result.success) {
        toast.error(result.error || "Failed to delete inventory item.");
        router.refresh();
        return;
      }
      toast.success("Inventory item deleted.");
      router.refresh();
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
              <TableHead>Sale Price</TableHead>
              <TableHead>Purchase Price</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Stock Value</TableHead>
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
                  <TableCell>{formatCurrency(Number(item.sale_price ?? 0), currencyCode || undefined)}</TableCell>
                  <TableCell>{formatCurrency(Number(item.purchase_price ?? 0), currencyCode || undefined)}</TableCell>
                  <TableCell>{formatNumber(Number(item.quantity_on_hand ?? 0))}</TableCell>
                  <TableCell>{formatCurrency(Number(item.stock_value ?? 0), currencyCode || undefined)}</TableCell>
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
                    <div className="flex flex-wrap justify-end gap-2">
                      {canManageAdmin ? (
                        <>
                          <Button asChild type="button" variant="outline" size="sm">
                            <Link href={`/${orgId}/inventory/${item.id}`}>
                              <Pencil className="size-4" />
                              Edit
                            </Link>
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteItem(item.id, `${item.sku} - ${item.name}`)}
                          >
                            <Trash2 className="size-4" />
                            Delete
                          </Button>
                        </>
                      ) : null}
                      {canManageInventory ? (
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
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={13} className="py-8 text-center text-muted-foreground">
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
                    {item.sku} - {item.name}
                  </div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {item.valuation_method.replace(/_/g, " ")}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Sale: {formatCurrency(Number(item.sale_price ?? 0), currencyCode || undefined)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Purchase: {formatCurrency(Number(item.purchase_price ?? 0), currencyCode || undefined)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Qty on hand: {formatNumber(Number(item.quantity_on_hand ?? 0))}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Stock value: {formatCurrency(Number(item.stock_value ?? 0), currencyCode || undefined)}
                  </div>
                  <div className="text-xs text-muted-foreground">
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
                <div className="flex flex-wrap gap-2">
                  {canManageAdmin ? (
                    <>
                      <Button asChild type="button" variant="outline" size="sm">
                        <Link href={`/${orgId}/inventory/${item.id}`}>
                          <Pencil className="size-4" />
                          Edit
                        </Link>
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteItem(item.id, `${item.sku} - ${item.name}`)}
                      >
                        <Trash2 className="size-4" />
                        Delete
                      </Button>
                    </>
                  ) : null}
                  {canManageInventory ? (
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
                  ) : null}
                </div>
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

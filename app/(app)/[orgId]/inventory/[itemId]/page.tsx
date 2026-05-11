import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BadgeDollarSign,
  Boxes,
  CalendarDays,
  Edit3,
  Landmark,
  PackageSearch,
  Tags,
} from "lucide-react";
import { getInventoryItem } from "@/lib/data/inventory.data";
import { requireOrgMembership } from "@/lib/data/org.data";
import { roleHasPermission } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";

function accountLabel(
  account:
    | { code?: string; name?: string }
    | Array<{ code?: string; name?: string }>
    | null
    | undefined
) {
  const row = Array.isArray(account) ? account[0] : account;
  if (!row) return "Not mapped";
  return [row.code, row.name].filter(Boolean).join(" - ") || "Not mapped";
}

export default async function InventoryItemPage({
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

  const membership = await requireOrgMembership(orgId);
  const canManageInventory = roleHasPermission(membership.role, "inventory.manage");
  const catalogItem =
    item.catalog_item && typeof item.catalog_item === "object"
      ? (item.catalog_item as Record<string, unknown>)
      : null;
  const imageUrl = typeof item.image_url === "string" ? item.image_url : null;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Button asChild variant="ghost" size="sm" className="px-0">
          <Link href={`/${orgId}/inventory`}>
            <ArrowLeft className="size-4" />
            Back to inventory
          </Link>
        </Button>
        <Card className="overflow-hidden border-border/70 bg-card/90">
          <CardContent className="relative grid gap-6 px-6 py-6 lg:grid-cols-[320px,1fr]">
            <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-r from-emerald-500/15 via-sky-500/10 to-amber-500/15" />
            <div className="relative flex justify-center lg:justify-start">
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt={String(item.name ?? "Inventory item")}
                  width={720}
                  height={720}
                  className="aspect-square w-full max-w-[280px] rounded-[2rem] border border-border/60 bg-muted object-cover shadow-sm"
                />
              ) : (
                <div className="flex aspect-square w-full max-w-[280px] items-center justify-center rounded-[2rem] border border-dashed border-border/70 bg-muted/40 text-muted-foreground">
                  <PackageSearch className="size-10" />
                </div>
              )}
            </div>

            <div className="relative space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{String(item.sku ?? "-")}</Badge>
                    <Badge variant={item.is_active === false ? "secondary" : "default"}>
                      {item.is_active === false ? "Inactive" : "Active"}
                    </Badge>
                    {catalogItem?.brand ? <Badge variant="outline">{String(catalogItem.brand)}</Badge> : null}
                    {catalogItem?.category ? (
                      <Badge variant="outline">{String(catalogItem.category)}</Badge>
                    ) : null}
                  </div>
                  <div>
                    <h1 className="text-2xl font-semibold tracking-tight">
                      {String(item.name ?? "Inventory item")}
                    </h1>
                    <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                      {catalogItem?.description
                        ? String(catalogItem.description)
                        : "Inventory item profile, stock position, pricing, and account mappings."}
                    </p>
                  </div>
                </div>

                {canManageInventory ? (
                  <Button asChild>
                    <Link href={`/${orgId}/inventory/${itemId}/edit`}>
                      <Edit3 className="size-4" />
                      Edit item
                    </Link>
                  </Button>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    <Boxes className="size-4" />
                    Quantity
                  </div>
                  <div className="mt-3 text-2xl font-semibold">
                    {formatNumber(Number(item.quantity_on_hand ?? 0))}
                  </div>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    <BadgeDollarSign className="size-4" />
                    Sale Price
                  </div>
                  <div className="mt-3 text-2xl font-semibold">
                    {formatCurrency(Number(item.sale_price ?? 0))}
                  </div>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    <Landmark className="size-4" />
                    Purchase Price
                  </div>
                  <div className="mt-3 text-2xl font-semibold">
                    {formatCurrency(Number(item.purchase_price ?? 0))}
                  </div>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    <CalendarDays className="size-4" />
                    Stock Value
                  </div>
                  <div className="mt-3 text-2xl font-semibold">
                    {formatCurrency(Number(item.stock_value ?? 0))}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr,0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Product details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {[
              { label: "Brand", value: catalogItem?.brand },
              { label: "Category", value: catalogItem?.category },
              { label: "Sub-category", value: catalogItem?.subCategory },
              { label: "Size / Weight", value: catalogItem?.sizeWeight },
              { label: "Unit type", value: catalogItem?.unitType },
              { label: "Units / Case", value: catalogItem?.unitsPerCase },
              { label: "Barcode / UPC", value: catalogItem?.barcode },
              { label: "Country of origin", value: catalogItem?.countryOfOrigin },
              { label: "Supplier", value: catalogItem?.supplier },
              { label: "Storage conditions", value: catalogItem?.storageConditions },
              {
                label: "Valuation method",
                value: String(item.valuation_method ?? "weighted_average").replace(/_/g, " "),
              },
              {
                label: "Created",
                value: formatDate(typeof item.created_at === "string" ? item.created_at : null),
              },
              {
                label: "Updated",
                value: formatDate(typeof item.updated_at === "string" ? item.updated_at : null),
              },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  <Tags className="size-4" />
                  {label}
                </div>
                <div className="mt-3 text-sm font-medium">
                  {value && String(value).trim() ? String(value) : "Not available"}
                </div>
              </div>
            ))}
            <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 md:col-span-2">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Notes</div>
              <div className="mt-3 text-sm leading-6">
                {catalogItem?.notes && String(catalogItem.notes).trim()
                  ? String(catalogItem.notes)
                  : "No product notes saved for this item."}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Posting and account mappings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Inventory account
              </div>
              <div className="mt-3 text-sm font-medium">{accountLabel(item.inventory_account as any)}</div>
            </div>
            <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">COGS account</div>
              <div className="mt-3 text-sm font-medium">{accountLabel(item.cogs_account as any)}</div>
            </div>
            <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Revenue account
              </div>
              <div className="mt-3 text-sm font-medium">{accountLabel(item.revenue_account as any)}</div>
            </div>
            {!canManageInventory ? (
              <div className="rounded-2xl border border-dashed border-border/70 bg-background/60 p-4 text-sm text-muted-foreground">
                Your role can view this product profile, but only users with `inventory.manage` can edit it.
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

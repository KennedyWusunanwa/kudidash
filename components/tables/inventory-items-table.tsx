"use client";

import Image from "next/image";
import Link from "next/link";
import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useOptimistic,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpDown,
  Boxes,
  Eye,
  Grid2X2,
  LayoutList,
  Pencil,
  Power,
  Search,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  deactivateInventoryItemAction,
  deleteInventoryItemAction,
} from "@/lib/actions/inventory.actions";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type InventoryRow = {
  id: string;
  sku: string;
  name: string;
  image_url?: string | null;
  catalog_item?: {
    brand?: string;
    category?: string;
    subCategory?: string;
    sizeWeight?: string;
    unitType?: string;
    unitsPerCase?: string;
    supplier?: string;
    countryOfOrigin?: string;
  } | null;
  sale_price?: number | null;
  purchase_price?: number | null;
  quantity_on_hand?: number | null;
  stock_value?: number | null;
  valuation_method: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
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

function isInteractiveTarget(target: EventTarget | null) {
  return target instanceof HTMLElement
    ? Boolean(target.closest("a,button,input,select,[role='button'],[role='link']"))
    : false;
}

function optionValues(
  items: InventoryRow[],
  selector: (item: InventoryRow) => string | null | undefined
) {
  return Array.from(
    new Set(
      items
        .map(selector)
        .map((value) => (value ? value.trim() : ""))
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));
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
  const [layout, setLayout] = useState<"table" | "grid">("table");
  const [searchQuery, setSearchQuery] = useState("");
  const [brandFilter, setBrandFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [valuationFilter, setValuationFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [scrollMetrics, setScrollMetrics] = useState({ viewportWidth: 0, contentWidth: 0 });
  const topScrollRef = useRef<HTMLDivElement | null>(null);
  const tableScrollRef = useRef<HTMLDivElement | null>(null);
  const syncingScrollRef = useRef<"top" | "table" | null>(null);

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

  const brands = useMemo(
    () => optionValues(optimisticRows, (item) => item.catalog_item?.brand),
    [optimisticRows]
  );
  const categories = useMemo(
    () => optionValues(optimisticRows, (item) => item.catalog_item?.category),
    [optimisticRows]
  );
  const valuations = useMemo(
    () => optionValues(optimisticRows, (item) => item.valuation_method.replace(/_/g, " ")),
    [optimisticRows]
  );

  const filteredRows = useMemo(() => {
    const normalizedSearch = deferredSearchQuery.trim().toLowerCase();
    const fromDate = dateFrom ? new Date(dateFrom) : null;
    const toDate = dateTo ? new Date(`${dateTo}T23:59:59`) : null;

    return optimisticRows
      .filter((item) => {
        const searchHaystack = [
          item.sku,
          item.name,
          item.catalog_item?.brand,
          item.catalog_item?.category,
          item.catalog_item?.subCategory,
          item.catalog_item?.supplier,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (normalizedSearch && !searchHaystack.includes(normalizedSearch)) return false;
        if (brandFilter !== "all" && item.catalog_item?.brand !== brandFilter) return false;
        if (categoryFilter !== "all" && item.catalog_item?.category !== categoryFilter) return false;
        if (
          valuationFilter !== "all" &&
          item.valuation_method.replace(/_/g, " ") !== valuationFilter
        ) {
          return false;
        }

        const quantity = Number(item.quantity_on_hand ?? 0);
        if (statusFilter === "active" && !item.is_active) return false;
        if (statusFilter === "inactive" && item.is_active) return false;
        if (statusFilter === "in-stock" && quantity <= 0) return false;
        if (statusFilter === "out-of-stock" && quantity > 0) return false;

        if (fromDate || toDate) {
          const createdAt = item.created_at ? new Date(item.created_at) : null;
          if (!createdAt || Number.isNaN(createdAt.getTime())) return false;
          if (fromDate && createdAt < fromDate) return false;
          if (toDate && createdAt > toDate) return false;
        }

        return true;
      })
      .sort((left, right) => {
        switch (sortBy) {
          case "oldest":
            return new Date(left.created_at ?? 0).getTime() - new Date(right.created_at ?? 0).getTime();
          case "name":
            return left.name.localeCompare(right.name);
          case "brand":
            return String(left.catalog_item?.brand ?? "").localeCompare(
              String(right.catalog_item?.brand ?? "")
            );
          case "quantity":
            return Number(right.quantity_on_hand ?? 0) - Number(left.quantity_on_hand ?? 0);
          case "stock-value":
            return Number(right.stock_value ?? 0) - Number(left.stock_value ?? 0);
          case "sale-price":
            return Number(right.sale_price ?? 0) - Number(left.sale_price ?? 0);
          case "newest":
          default:
            return new Date(right.created_at ?? 0).getTime() - new Date(left.created_at ?? 0).getTime();
        }
      });
  }, [
    brandFilter,
    categoryFilter,
    dateFrom,
    dateTo,
    deferredSearchQuery,
    optimisticRows,
    sortBy,
    statusFilter,
    valuationFilter,
  ]);

  useEffect(() => {
    const tableScroller = tableScrollRef.current;
    if (!tableScroller) return;

    const syncMetrics = () => {
      setScrollMetrics({
        viewportWidth: tableScroller.clientWidth,
        contentWidth: tableScroller.scrollWidth,
      });
    };

    syncMetrics();
    const resizeObserver = new ResizeObserver(syncMetrics);
    resizeObserver.observe(tableScroller);
    const innerTable = tableScroller.querySelector("table");
    if (innerTable) {
      resizeObserver.observe(innerTable);
    }
    window.addEventListener("resize", syncMetrics);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", syncMetrics);
    };
  }, [filteredRows, layout]);

  useEffect(() => {
    const topScroller = topScrollRef.current;
    const tableScroller = tableScrollRef.current;
    if (!topScroller || !tableScroller) return;

    const handleTopScroll = () => {
      if (syncingScrollRef.current === "table") return;
      syncingScrollRef.current = "top";
      tableScroller.scrollLeft = topScroller.scrollLeft;
      syncingScrollRef.current = null;
    };

    const handleTableScroll = () => {
      if (syncingScrollRef.current === "top") return;
      syncingScrollRef.current = "table";
      topScroller.scrollLeft = tableScroller.scrollLeft;
      syncingScrollRef.current = null;
    };

    topScroller.addEventListener("scroll", handleTopScroll);
    tableScroller.addEventListener("scroll", handleTableScroll);
    return () => {
      topScroller.removeEventListener("scroll", handleTopScroll);
      tableScroller.removeEventListener("scroll", handleTableScroll);
    };
  }, [filteredRows, layout]);

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

  const clearFilters = () => {
    setSearchQuery("");
    setBrandFilter("all");
    setCategoryFilter("all");
    setStatusFilter("all");
    setValuationFilter("all");
    setDateFrom("");
    setDateTo("");
    setSortBy("newest");
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/70 bg-card/70 p-4 shadow-sm">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_repeat(5,minmax(0,0.75fr))_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by SKU, name, brand, category, supplier..."
              className="pl-9"
            />
          </label>

          <Select value={brandFilter} onValueChange={setBrandFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Brand" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All brands</SelectItem>
              {brands.map((brand) => (
                <SelectItem key={brand} value={brand}>
                  {brand}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stock states</SelectItem>
              <SelectItem value="active">Active only</SelectItem>
              <SelectItem value="inactive">Inactive only</SelectItem>
              <SelectItem value="in-stock">In stock</SelectItem>
              <SelectItem value="out-of-stock">Out of stock</SelectItem>
            </SelectContent>
          </Select>

          <Select value={valuationFilter} onValueChange={setValuationFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Valuation" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All valuation methods</SelectItem>
              {valuations.map((valuation) => (
                <SelectItem key={valuation} value={valuation}>
                  {valuation}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />

          <div className="flex gap-2 xl:justify-end">
            <Button
              type="button"
              variant={layout === "table" ? "default" : "outline"}
              size="icon"
              onClick={() => setLayout("table")}
              aria-label="Table layout"
            >
              <LayoutList className="size-4" />
            </Button>
            <Button
              type="button"
              variant={layout === "grid" ? "default" : "outline"}
              size="icon"
              onClick={() => setLayout("grid")}
              aria-label="Grid layout"
            >
              <Grid2X2 className="size-4" />
            </Button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/70 px-2.5 py-1">
              <SlidersHorizontal className="size-3.5" />
              {filteredRows.length} of {optimisticRows.length} items
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/70 px-2.5 py-1">
              <Boxes className="size-3.5" />
              {formatNumber(
                filteredRows.reduce((sum, item) => sum + Number(item.quantity_on_hand ?? 0), 0)
              )}{" "}
              units shown
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/70 px-2.5 py-1">
              <ArrowUpDown className="size-3.5" />
              Sort
            </span>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-8 w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
                <SelectItem value="name">Name A-Z</SelectItem>
                <SelectItem value="brand">Brand A-Z</SelectItem>
                <SelectItem value="quantity">Highest quantity</SelectItem>
                <SelectItem value="stock-value">Highest stock value</SelectItem>
                <SelectItem value="sale-price">Highest sale price</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        </div>
      </div>

      {layout === "grid" ? (
        filteredRows.length ? (
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {filteredRows.map((item) => (
              <div
                key={item.id}
                className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card/85 shadow-sm transition-colors hover:border-primary/30"
                onClick={(event) => {
                  if (isInteractiveTarget(event.target)) return;
                  router.push(`/${orgId}/inventory/${item.id}`);
                }}
              >
                <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-emerald-500/10 via-sky-500/10 to-amber-500/10" />
                <div className="relative z-10 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex gap-3">
                      {item.image_url ? (
                        <Image
                          src={item.image_url}
                          alt={item.name}
                          width={96}
                          height={96}
                          className="h-24 w-24 rounded-xl border border-border/60 object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-24 w-24 items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/30 text-muted-foreground">
                          <Boxes className="size-8" />
                        </div>
                      )}
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary">{item.sku}</Badge>
                          <Badge variant={item.is_active ? "default" : "secondary"}>
                            {item.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <div>
                          <h3 className="text-base font-semibold transition-colors group-hover:text-primary">
                            {item.name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {[item.catalog_item?.brand, item.catalog_item?.category, item.catalog_item?.sizeWeight]
                              .filter(Boolean)
                              .join(" | ") || "No catalog details yet"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="relative z-20 flex gap-2">
                      <Button asChild type="button" variant="outline" size="icon">
                        <Link href={`/${orgId}/inventory/${item.id}`} aria-label={`View ${item.name}`}>
                          <Eye className="size-4" />
                        </Link>
                      </Button>
                      {canManageAdmin ? (
                        <Button asChild type="button" variant="outline" size="icon">
                          <Link href={`/${orgId}/inventory/${item.id}/edit`} aria-label={`Edit ${item.name}`}>
                            <Pencil className="size-4" />
                          </Link>
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-border/60 bg-background/70 p-3">
                      <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Quantity</div>
                      <div className="mt-2 text-lg font-semibold">
                        {formatNumber(Number(item.quantity_on_hand ?? 0))}
                      </div>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-background/70 p-3">
                      <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Stock value</div>
                      <div className="mt-2 text-lg font-semibold">
                        {formatCurrency(Number(item.stock_value ?? 0), currencyCode || undefined)}
                      </div>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-background/70 p-3">
                      <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Sale price</div>
                      <div className="mt-2 text-lg font-semibold">
                        {formatCurrency(Number(item.sale_price ?? 0), currencyCode || undefined)}
                      </div>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-background/70 p-3">
                      <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        Valuation
                      </div>
                      <div className="mt-2 text-sm font-semibold capitalize">
                        {item.valuation_method.replace(/_/g, " ")}
                      </div>
                    </div>
                  </div>

                  <div className="relative z-20 mt-4 flex flex-wrap gap-2">
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
                    {canManageAdmin ? (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteItem(item.id, `${item.sku} - ${item.name}`)}
                      >
                        <Trash2 className="size-4" />
                        Delete
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border/70 p-10 text-center text-sm text-muted-foreground">
            No inventory items match the current filters.
          </div>
        )
      ) : (
        <div className="space-y-3">
          {scrollMetrics.contentWidth > scrollMetrics.viewportWidth ? (
            <div className="sticky top-2 z-10 rounded-full border border-border/70 bg-background/95 px-3 py-2 shadow-sm backdrop-blur">
              <div className="mb-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                Horizontal scroll
              </div>
              <div ref={topScrollRef} className="overflow-x-auto">
                <div style={{ width: scrollMetrics.contentWidth, height: 10 }} />
              </div>
            </div>
          ) : null}

          <div className="text-xs text-muted-foreground">
            Wide inventory fields stay in one row. Use the slider above or drag the table sideways with your trackpad or mouse wheel.
          </div>

          <div ref={tableScrollRef} className="overflow-x-auto rounded-2xl border border-border/70">
            <table className="min-w-[1480px] text-sm">
              <thead className="[&_tr]:border-b">
                <tr className="border-b bg-muted/30">
                  <th className="h-10 px-3 text-left font-medium whitespace-nowrap">Image</th>
                  <th className="h-10 px-3 text-left font-medium whitespace-nowrap">SKU</th>
                  <th className="h-10 px-3 text-left font-medium whitespace-nowrap">Product</th>
                  <th className="h-10 px-3 text-left font-medium whitespace-nowrap">Brand</th>
                  <th className="h-10 px-3 text-left font-medium whitespace-nowrap">Category</th>
                  <th className="h-10 px-3 text-left font-medium whitespace-nowrap">Valuation</th>
                  <th className="h-10 px-3 text-left font-medium whitespace-nowrap">Sale Price</th>
                  <th className="h-10 px-3 text-left font-medium whitespace-nowrap">Purchase Price</th>
                  <th className="h-10 px-3 text-left font-medium whitespace-nowrap">Quantity</th>
                  <th className="h-10 px-3 text-left font-medium whitespace-nowrap">Stock Value</th>
                  <th className="h-10 px-3 text-left font-medium whitespace-nowrap">Inventory Account</th>
                  <th className="h-10 px-3 text-left font-medium whitespace-nowrap">COGS Account</th>
                  <th className="h-10 px-3 text-left font-medium whitespace-nowrap">Revenue Account</th>
                  <th className="h-10 px-3 text-left font-medium whitespace-nowrap">Status</th>
                  <th className="h-10 px-3 text-left font-medium whitespace-nowrap">Created</th>
                  <th className="h-10 px-3 text-right font-medium whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {filteredRows.length ? (
                  filteredRows.map((item) => (
                    <tr
                      key={item.id}
                      className="cursor-pointer border-b transition-colors hover:bg-muted/40"
                      onClick={(event) => {
                        if (isInteractiveTarget(event.target)) return;
                        router.push(`/${orgId}/inventory/${item.id}`);
                      }}
                    >
                      <td className="p-3 align-middle whitespace-nowrap">
                        {item.image_url ? (
                          <Image
                            src={item.image_url}
                            alt={item.name}
                            width={56}
                            height={56}
                            className="h-14 w-14 rounded-xl border border-border/60 object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/30 text-muted-foreground">
                            <Boxes className="size-5" />
                          </div>
                        )}
                      </td>
                      <td className="p-3 align-middle whitespace-nowrap font-medium">{item.sku}</td>
                      <td className="p-3 align-middle">
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {[item.catalog_item?.subCategory, item.catalog_item?.sizeWeight, item.catalog_item?.unitType]
                            .filter(Boolean)
                            .join(" | ") || "No additional catalog details"}
                        </div>
                      </td>
                      <td className="p-3 align-middle whitespace-nowrap">
                        {item.catalog_item?.brand || "-"}
                      </td>
                      <td className="p-3 align-middle whitespace-nowrap">
                        {item.catalog_item?.category || "-"}
                      </td>
                      <td className="p-3 align-middle whitespace-nowrap capitalize">
                        {item.valuation_method.replace(/_/g, " ")}
                      </td>
                      <td className="p-3 align-middle whitespace-nowrap">
                        {formatCurrency(Number(item.sale_price ?? 0), currencyCode || undefined)}
                      </td>
                      <td className="p-3 align-middle whitespace-nowrap">
                        {formatCurrency(Number(item.purchase_price ?? 0), currencyCode || undefined)}
                      </td>
                      <td className="p-3 align-middle whitespace-nowrap">
                        {formatNumber(Number(item.quantity_on_hand ?? 0))}
                      </td>
                      <td className="p-3 align-middle whitespace-nowrap">
                        {formatCurrency(Number(item.stock_value ?? 0), currencyCode || undefined)}
                      </td>
                      <td className="p-3 align-middle whitespace-nowrap">
                        {accountLabel(item.inventory_account)}
                      </td>
                      <td className="p-3 align-middle whitespace-nowrap">{accountLabel(item.cogs_account)}</td>
                      <td className="p-3 align-middle whitespace-nowrap">
                        {accountLabel(item.revenue_account)}
                      </td>
                      <td className="p-3 align-middle whitespace-nowrap">
                        <Badge variant={item.is_active ? "default" : "secondary"}>
                          {item.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="p-3 align-middle whitespace-nowrap text-muted-foreground">
                        {formatDate(item.created_at)}
                      </td>
                      <td className="p-3 align-middle whitespace-nowrap text-right">
                        <div className="flex justify-end gap-2">
                          <Button asChild type="button" variant="outline" size="icon">
                            <Link href={`/${orgId}/inventory/${item.id}`} aria-label={`View ${item.name}`}>
                              <Eye className="size-4" />
                            </Link>
                          </Button>
                          {canManageAdmin ? (
                            <>
                              <Button asChild type="button" variant="outline" size="icon">
                                <Link href={`/${orgId}/inventory/${item.id}/edit`} aria-label={`Edit ${item.name}`}>
                                  <Pencil className="size-4" />
                                </Link>
                              </Button>
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                onClick={() => deleteItem(item.id, `${item.sku} - ${item.name}`)}
                                aria-label={`Delete ${item.name}`}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </>
                          ) : null}
                          {canManageInventory ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => deactivate(item.id)}
                              disabled={!item.is_active}
                              aria-label={`Deactivate ${item.name}`}
                            >
                              <Power className="size-4" />
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={16} className="p-10 text-center text-muted-foreground">
                      No inventory items match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 md:hidden">
            {filteredRows.slice(0, 8).map((item) => (
              <Link
                key={`mobile-${item.id}`}
                href={`/${orgId}/inventory/${item.id}`}
                className={cn(
                  "rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm transition-colors hover:border-primary/30"
                )}
              >
                <div className="flex items-start gap-3">
                  {item.image_url ? (
                    <Image
                      src={item.image_url}
                      alt={item.name}
                      width={80}
                      height={80}
                      className="h-20 w-20 rounded-xl border border-border/60 object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/30 text-muted-foreground">
                      <Boxes className="size-6" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{item.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {[item.sku, item.catalog_item?.brand, item.catalog_item?.category]
                        .filter(Boolean)
                        .join(" | ")}
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Qty {formatNumber(Number(item.quantity_on_hand ?? 0))} |{" "}
                      {formatCurrency(Number(item.stock_value ?? 0), currencyCode || undefined)}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

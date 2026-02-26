"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  createInventoryItemAction,
  updateInventoryItemAction,
} from "@/lib/actions/inventory.actions";
import { inventoryItemSchema } from "@/lib/validators/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

type AccountOption = {
  id: string;
  label: string;
};

const NONE = "__none__";

export function InventoryItemForm({
  orgId,
  accountOptions,
  mode = "create",
  itemId,
  initialValues,
}: {
  orgId: string;
  accountOptions: AccountOption[];
  mode?: "create" | "edit";
  itemId?: string;
  initialValues?: Partial<{
    sku: string;
    name: string;
    sale_price: number | null;
    purchase_price: number | null;
    inventory_account_id: string | null;
    cogs_account_id: string | null;
    revenue_account_id: string | null;
    valuation_method: "weighted_average" | "fifo" | "lifo" | "specific_identification";
    is_active: boolean;
  }>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm({
    resolver: zodResolver(inventoryItemSchema),
    defaultValues: {
      sku: initialValues?.sku ?? "",
      name: initialValues?.name ?? "",
      sale_price: Number(initialValues?.sale_price ?? 0),
      purchase_price: Number(initialValues?.purchase_price ?? 0),
      inventory_account_id: initialValues?.inventory_account_id ?? "",
      cogs_account_id: initialValues?.cogs_account_id ?? "",
      revenue_account_id: initialValues?.revenue_account_id ?? "",
      valuation_method: initialValues?.valuation_method ?? ("weighted_average" as const),
      is_active: initialValues?.is_active !== false,
    },
  });

  const onSubmit = (values: any) => {
    startTransition(async () => {
      const result =
        mode === "edit"
          ? await updateInventoryItemAction({
              orgId,
              id: String(itemId || ""),
              ...values,
            })
          : await createInventoryItemAction({
              orgId,
              ...values,
            });

      if (!result.success) {
        toast.error(
          result.error ||
            (mode === "edit" ? "Failed to update inventory item." : "Failed to create inventory item.")
        );
        return;
      }

      if (mode === "edit") {
        toast.success("Inventory item updated.");
        router.push(`/${orgId}/inventory`);
        router.refresh();
        return;
      }

      toast.success("Inventory item created.");
      form.reset({
        sku: "",
        name: "",
        sale_price: 0,
        purchase_price: 0,
        inventory_account_id: "",
        cogs_account_id: "",
        revenue_account_id: "",
        valuation_method: "weighted_average",
        is_active: true,
      });
      router.refresh();
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="sku"
            render={({ field }) => (
              <FormItem>
                <FormLabel>SKU</FormLabel>
                <FormControl>
                  <Input placeholder="ITEM-001" {...(field as any)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Item name</FormLabel>
                <FormControl>
                  <Input placeholder="Inventory item name" {...(field as any)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="valuation_method"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valuation method</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select valuation method" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="weighted_average">Weighted Average</SelectItem>
                    <SelectItem value="fifo">FIFO</SelectItem>
                    <SelectItem value="lifo">LIFO</SelectItem>
                    <SelectItem value="specific_identification">Specific Identification</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="sale_price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sale price</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" min="0" {...(field as any)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="purchase_price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Purchase price</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" min="0" {...(field as any)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <FormField
            control={form.control}
            name="inventory_account_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Inventory account</FormLabel>
                <Select
                  value={field.value || NONE}
                  onValueChange={(value) => field.onChange(value === NONE ? "" : value)}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Optional" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NONE}>None</SelectItem>
                    {accountOptions.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="cogs_account_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>COGS account</FormLabel>
                <Select
                  value={field.value || NONE}
                  onValueChange={(value) => field.onChange(value === NONE ? "" : value)}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Optional" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NONE}>None</SelectItem>
                    {accountOptions.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="revenue_account_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Revenue account</FormLabel>
                <Select
                  value={field.value || NONE}
                  onValueChange={(value) => field.onChange(value === NONE ? "" : value)}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Optional" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NONE}>None</SelectItem>
                    {accountOptions.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : mode === "edit" ? "Save inventory item" : "Add inventory item"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

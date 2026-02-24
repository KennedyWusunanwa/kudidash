"use client";

import { useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createDraftBillAction } from "@/lib/actions/bills.actions";
import { CURRENCY_OPTIONS, DEFAULT_CURRENCY_CODE } from "@/lib/currencies";
import { billSchema } from "@/lib/validators/bill";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const today = new Date().toISOString().slice(0, 10);

interface Option {
  id: string;
  label: string;
}

interface InventoryItemOption {
  value: string;
  label: string;
  expenseAccountId?: string | null;
  purchasePrice?: number | null;
}

export function BillForm({
  orgId,
  vendors,
  expenseAccounts,
  inventoryItems = [],
}: {
  orgId: string;
  vendors: Option[];
  expenseAccounts: Option[];
  inventoryItems?: InventoryItemOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm({
    resolver: zodResolver(billSchema),
    defaultValues: {
      vendor_id: vendors[0]?.id ?? "",
      bill_date: today,
      due_date: today,
      currency_code: DEFAULT_CURRENCY_CODE,
      notes: "",
      lines: [
        {
          description: "",
          quantity: 1,
          unit_cost: 0,
          expense_account_id: expenseAccounts[0]?.id ?? "",
          tax_amount: 0,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "lines" });
  const lines = useWatch({ control: form.control, name: "lines" });
  const inventoryItemsByValue = useMemo(
    () => new Map(inventoryItems.map((item) => [item.value, item])),
    [inventoryItems]
  );
  const totals = useMemo(() => {
    const subtotal = (lines ?? []).reduce(
      (sum, line) => sum + Number(line?.quantity ?? 0) * Number(line?.unit_cost ?? 0),
      0
    );
    const tax = (lines ?? []).reduce((sum, line) => sum + Number(line?.tax_amount ?? 0), 0);
    return {
      subtotal: Number(subtotal.toFixed(2)),
      tax: Number(tax.toFixed(2)),
      total: Number((subtotal + tax).toFixed(2)),
    };
  }, [lines]);

  const onSubmit = (values: unknown) => {
    startTransition(async () => {
      const parsed = billSchema.parse(values);
      const result = await createDraftBillAction({ orgId, ...parsed });
      if (!result.success || !result.data) {
        toast.error(result.error || "Failed to create bill.");
        return;
      }
      toast.success("Draft bill created.");
      router.push(`/${orgId}/bills/${result.data.billId}`);
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Bill</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="vendor_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select vendor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {vendors.map((vendor) => (
                          <SelectItem key={vendor.id} value={vendor.id}>
                            {vendor.label}
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
                name="currency_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CURRENCY_OPTIONS.map((currency) => (
                          <SelectItem key={currency.code} value={currency.code}>
                            {currency.label}
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
                name="bill_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bill date</FormLabel>
                    <FormControl>
                      <Input type="date" {...(field as any)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due date</FormLabel>
                    <FormControl>
                      <Input type="date" {...(field as any)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Bill lines</h3>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    append({
                      description: "",
                      quantity: 1,
                      unit_cost: 0,
                      expense_account_id: expenseAccounts[0]?.id ?? "",
                      tax_amount: 0,
                    })
                  }
                >
                  <Plus className="size-4" />
                  Add line
                </Button>
              </div>

              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="grid gap-3 rounded-lg border p-3 md:grid-cols-[2fr_1fr_1fr_1.5fr_1fr_auto]"
                >
                  <FormField
                    control={form.control}
                    name={`lines.${index}.description`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="md:sr-only">Description</FormLabel>
                        {inventoryItems.length ? (
                          <Select
                            value={field.value ?? ""}
                            onValueChange={(value) => {
                              field.onChange(value);
                              const selectedItem = inventoryItemsByValue.get(value);
                              if (selectedItem?.expenseAccountId) {
                                form.setValue(
                                  `lines.${index}.expense_account_id`,
                                  selectedItem.expenseAccountId,
                                  {
                                    shouldDirty: true,
                                    shouldValidate: true,
                                  }
                                );
                              }
                              if (selectedItem && selectedItem.purchasePrice != null) {
                                form.setValue(
                                  `lines.${index}.unit_cost`,
                                  Number(selectedItem.purchasePrice),
                                  {
                                    shouldDirty: true,
                                    shouldValidate: true,
                                  }
                                );
                              }
                            }}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select product/item" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {inventoryItems.map((item) => (
                                <SelectItem key={`${item.label}-${item.value}`} value={item.value}>
                                  {item.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <FormControl>
                            <Input placeholder="Expense description" {...(field as any)} />
                          </FormControl>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`lines.${index}.quantity`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="md:sr-only">Qty</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...(field as any)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`lines.${index}.unit_cost`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="md:sr-only">Unit Cost</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...(field as any)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`lines.${index}.expense_account_id`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="md:sr-only">Expense Account</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Expense account" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {expenseAccounts.map((account) => (
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
                    name={`lines.${index}.tax_amount`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="md:sr-only">Tax</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...(field as any)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex items-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete line ${index + 1}`}
                      onClick={() => fields.length > 1 && remove(index)}
                      disabled={fields.length <= 1}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-2 rounded-lg border bg-muted/30 p-4 text-sm sm:max-w-sm sm:ml-auto">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span>{totals.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>{totals.total.toFixed(2)}</span>
              </div>
            </div>

            <Button type="submit" disabled={isPending || !vendors.length || !expenseAccounts.length}>
              {isPending ? "Creating..." : "Create draft bill"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}


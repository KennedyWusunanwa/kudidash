"use client";

import { useEffect, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createDraftInvoiceAction } from "@/lib/actions/invoices.actions";
import { CURRENCY_OPTIONS, DEFAULT_CURRENCY_CODE } from "@/lib/currencies";
import { formatCurrency } from "@/lib/format";
import { invoiceSchema } from "@/lib/validators/invoice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

interface CustomerOption {
  id: string;
  label: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  billing_address?: string | null;
  description?: string | null;
}

interface Option {
  id: string;
  label: string;
}

interface InventoryItemOption {
  value: string;
  label: string;
  revenueAccountId?: string | null;
  salePrice?: number | null;
}

export function InvoiceForm({
  orgId,
  defaultCurrencyCode,
  customers,
  revenueAccounts,
  inventoryItems = [],
}: {
  orgId: string;
  defaultCurrencyCode?: string | null;
  customers: CustomerOption[];
  revenueAccounts: Option[];
  inventoryItems?: InventoryItemOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const lockedCurrencyCode =
    (defaultCurrencyCode || DEFAULT_CURRENCY_CODE).trim().toUpperCase() || DEFAULT_CURRENCY_CODE;
  const form = useForm({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      customer_id: customers[0]?.id ?? "__new__",
      customer_name: customers[0]?.name ?? customers[0]?.label ?? "",
      customer_email: customers[0]?.email ?? "",
      customer_phone: customers[0]?.phone ?? "",
      customer_billing_address: customers[0]?.billing_address ?? "",
      customer_description: customers[0]?.description ?? "",
      invoice_date: today,
      due_date: today,
      currency_code: lockedCurrencyCode,
      notes: "",
      lines: [
        {
          description: "",
          quantity: 1,
          unit_price: 0,
          revenue_account_id: revenueAccounts[0]?.id ?? "",
          tax_amount: 0,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "lines" });
  const selectedCustomerId = useWatch({ control: form.control, name: "customer_id" });
  const invoiceCurrencyCode = useWatch({ control: form.control, name: "currency_code" });
  const lines = useWatch({ control: form.control, name: "lines" });
  const customersById = useMemo(
    () => new Map(customers.map((customer) => [customer.id, customer])),
    [customers]
  );
  const inventoryItemsByValue = useMemo(
    () => new Map(inventoryItems.map((item) => [item.value, item])),
    [inventoryItems]
  );

  useEffect(() => {
    if ((form.getValues("currency_code") || "").toUpperCase() !== lockedCurrencyCode) {
      form.setValue("currency_code", lockedCurrencyCode as any, {
        shouldDirty: false,
        shouldValidate: true,
      });
    }
  }, [form, lockedCurrencyCode]);

  useEffect(() => {
    if (selectedCustomerId === "__new__") {
      form.setValue("customer_name", "", { shouldDirty: false, shouldValidate: true });
      form.setValue("customer_email", "", { shouldDirty: false, shouldValidate: true });
      form.setValue("customer_phone", "", { shouldDirty: false, shouldValidate: true });
      form.setValue("customer_billing_address", "", { shouldDirty: false, shouldValidate: true });
      form.setValue("customer_description", "", { shouldDirty: false, shouldValidate: true });
      return;
    }

    const customer = customersById.get(selectedCustomerId ?? "");
    if (!customer) return;
    form.setValue("customer_name", customer.name ?? customer.label ?? "", {
      shouldDirty: false,
      shouldValidate: true,
    });
    form.setValue("customer_email", customer.email ?? "", { shouldDirty: false, shouldValidate: true });
    form.setValue("customer_phone", customer.phone ?? "", { shouldDirty: false, shouldValidate: true });
    form.setValue("customer_billing_address", customer.billing_address ?? "", {
      shouldDirty: false,
      shouldValidate: true,
    });
    form.setValue("customer_description", customer.description ?? "", {
      shouldDirty: false,
      shouldValidate: true,
    });
  }, [customersById, form, selectedCustomerId]);
  const totals = useMemo(() => {
    const subtotal = (lines ?? []).reduce(
      (sum, line) => sum + Number(line?.quantity ?? 0) * Number(line?.unit_price ?? 0),
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
      const parsed = invoiceSchema.parse(values);
      const result = await createDraftInvoiceAction({ orgId, ...parsed });
      if (!result.success || !result.data) {
        toast.error(result.error || "Failed to create invoice.");
        return;
      }
      toast.success("Draft invoice created.");
      router.push(`/${orgId}/invoices/${result.data.invoiceId}`);
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Invoice</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="customer_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select or create customer" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__new__">Add new customer</SelectItem>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.label}
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
                    <Select value={field.value} onValueChange={field.onChange} disabled>
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
                    <p className="text-xs text-muted-foreground">
                      Default currency is controlled in Settings by an admin/owner.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="invoice_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice date</FormLabel>
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
                <h3 className="text-sm font-medium">Customer details</h3>
                <p className="text-xs text-muted-foreground">
                  Selecting a saved customer auto-fills these fields.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="customer_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...(field as any)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customer_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...(field as any)} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customer_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input {...(field as any)} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customer_billing_address"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Billing address</FormLabel>
                      <FormControl>
                        <Textarea {...(field as any)} value={field.value ?? ""} rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customer_description"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Short description</FormLabel>
                      <FormControl>
                        <Textarea
                          {...(field as any)}
                          value={field.value ?? ""}
                          rows={2}
                          placeholder="Optional customer note"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Invoice lines</h3>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    append({
                      description: "",
                      quantity: 1,
                      unit_price: 0,
                      revenue_account_id: revenueAccounts[0]?.id ?? "",
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
                              if (selectedItem?.revenueAccountId) {
                                form.setValue(
                                  `lines.${index}.revenue_account_id`,
                                  selectedItem.revenueAccountId,
                                  {
                                    shouldDirty: true,
                                    shouldValidate: true,
                                  }
                                );
                              }
                              if (selectedItem && selectedItem.salePrice != null) {
                                form.setValue(`lines.${index}.unit_price`, Number(selectedItem.salePrice), {
                                  shouldDirty: true,
                                  shouldValidate: true,
                                });
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
                            <Input placeholder="Service description" {...(field as any)} />
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
                    name={`lines.${index}.unit_price`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="md:sr-only">Unit Price</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...(field as any)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`lines.${index}.revenue_account_id`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="md:sr-only">Revenue Account</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Revenue account" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {revenueAccounts.map((account) => (
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
                <span>{formatCurrency(totals.subtotal, invoiceCurrencyCode || lockedCurrencyCode)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span>{formatCurrency(totals.tax, invoiceCurrencyCode || lockedCurrencyCode)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>{formatCurrency(totals.total, invoiceCurrencyCode || lockedCurrencyCode)}</span>
              </div>
            </div>

            <Button type="submit" disabled={isPending || !revenueAccounts.length}>
              {isPending ? "Creating..." : "Create draft invoice"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}


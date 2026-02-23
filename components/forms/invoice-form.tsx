"use client";

import { useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createDraftInvoiceAction } from "@/lib/actions/invoices.actions";
import { invoiceSchema } from "@/lib/validators/invoice";
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

export function InvoiceForm({
  orgId,
  customers,
  revenueAccounts,
}: {
  orgId: string;
  customers: Option[];
  revenueAccounts: Option[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      customer_id: customers[0]?.id ?? "",
      invoice_date: today,
      due_date: today,
      currency_code: "GHS",
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
  const lines = useWatch({ control: form.control, name: "lines" });
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
                          <SelectValue placeholder="Select customer" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
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
                    <FormControl>
                      <Input maxLength={3} {...(field as any)} />
                    </FormControl>
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
                        <FormControl>
                          <Input placeholder="Service description" {...(field as any)} />
                        </FormControl>
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

            <Button type="submit" disabled={isPending || !customers.length || !revenueAccounts.length}>
              {isPending ? "Creating..." : "Create draft invoice"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}


"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { verifyInvoiceReceiptAction } from "@/lib/actions/receipts.actions";
import { formatCurrency } from "@/lib/format";
import { verifyReceiptSchema } from "@/lib/validators/receipt";
import { PublicDocumentActions } from "@/components/documents/public-document-actions";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const today = new Date().toISOString().slice(0, 10);

export function InvoicePaymentForm({
  orgId,
  invoiceId,
  customerId,
  currencyCode,
  outstandingAmount,
}: {
  orgId: string;
  invoiceId: string;
  customerId: string;
  currencyCode: string;
  outstandingAmount: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [latestToken, setLatestToken] = useState<string | null>(null);
  const form = useForm({
    resolver: zodResolver(verifyReceiptSchema),
    defaultValues: {
      invoice_id: invoiceId,
      customer_id: customerId,
      receipt_date: today,
      amount: Number(Math.max(outstandingAmount, 0).toFixed(2)),
      currency_code: currencyCode,
      payment_method: "",
      reference: "",
      notes: "",
    },
  });

  const onSubmit = (values: unknown) => {
    startTransition(async () => {
      const parsed = verifyReceiptSchema.parse(values);
      const result = await verifyInvoiceReceiptAction({ orgId, ...parsed });
      if (!result.success || !result.data) {
        toast.error(result.error || "Failed to verify payment.");
        return;
      }

      setLatestToken(result.data.publicViewToken ?? null);

      toast.success("Payment verified and receipt created.");
      router.refresh();
    });
  };

  if (outstandingAmount <= 0) {
    return (
      <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
        This invoice is fully paid. No further receipt verification is needed.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/30 p-4 text-sm">
        Outstanding balance: <span className="font-semibold">{formatCurrency(outstandingAmount, currencyCode)}</span>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="receipt_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Receipt date</FormLabel>
                  <FormControl>
                    <Input type="date" {...(field as any)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount received</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0" {...(field as any)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="payment_method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment method</FormLabel>
                  <FormControl>
                    <Input placeholder="Bank transfer, cash, card..." {...(field as any)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reference</FormLabel>
                  <FormControl>
                    <Input placeholder="Transaction ref or cheque no." {...(field as any)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea rows={3} placeholder="Optional verification note" {...(field as any)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={isPending}>
            {isPending ? "Verifying..." : "Verify payment"}
          </Button>
        </form>
      </Form>

      {latestToken ? (
        <div className="rounded-lg border p-4">
          <p className="mb-3 text-sm font-medium">Latest receipt</p>
          <PublicDocumentActions
            path={`/public/receipts/${latestToken}`}
            pdfPath={`/public/receipts/${latestToken}/pdf`}
            openLabel="Open receipt"
          />
        </div>
      ) : null}
    </div>
  );
}

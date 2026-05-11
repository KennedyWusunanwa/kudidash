import { notFound } from "next/navigation";
import { DEFAULT_CURRENCY_CODE } from "@/lib/currencies";
import { getPublicReceiptDocumentByToken } from "@/lib/data/receipts.data";
import { formatCurrency, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function PublicReceiptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const document = await getPublicReceiptDocumentByToken(token);
  if (!document) notFound();

  const receipt = document.receipt as Record<string, unknown>;
  const org = (document.org ?? {}) as Record<string, unknown>;
  const customer = (document.customer ?? {}) as Record<string, unknown>;
  const allocations = Array.isArray(document.allocations)
    ? (document.allocations as Array<Record<string, unknown>>)
    : [];
  const currency =
    typeof receipt.currency_code === "string" && receipt.currency_code.trim()
      ? receipt.currency_code.trim().toUpperCase()
      : typeof org.base_currency === "string" && org.base_currency.trim()
        ? org.base_currency.trim().toUpperCase()
        : DEFAULT_CURRENCY_CODE;

  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">KudiDash document</p>
          <h1 className="text-3xl font-semibold">
            {String(receipt.receipt_no ?? receipt.id ?? "Receipt")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Receipt from {String(org.invoice_company_name ?? org.name ?? "Organization")}
          </p>
        </div>
        <Button asChild variant="outline">
          <a href={`/public/receipts/${token}/pdf`} target="_blank" rel="noreferrer">
            Download PDF
          </a>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Customer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="font-medium">{String(customer.name ?? "Customer")}</p>
            {customer.email ? <p>{String(customer.email)}</p> : null}
            {customer.phone ? <p>{String(customer.phone)}</p> : null}
            {customer.billing_address ? (
              <p className="whitespace-pre-line">{String(customer.billing_address)}</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Receipt summary</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Date</p>
              <p className="font-medium">{formatDate(String(receipt.receipt_date ?? ""))}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Amount</p>
              <p className="font-medium">{formatCurrency(Number(receipt.amount ?? 0), currency)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Payment method</p>
              <p className="font-medium">{String(receipt.payment_method ?? "-")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Reference</p>
              <p className="font-medium">{String(receipt.reference ?? "-")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <p className="font-medium capitalize">{String(receipt.status ?? "verified")}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Applied invoices</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {allocations.length ? (
            allocations.map((allocation, index) => {
              const invoice = allocation.invoice as Record<string, unknown> | null;
              const allocationCurrency =
                typeof invoice?.currency_code === "string" && invoice.currency_code.trim()
                  ? invoice.currency_code.trim().toUpperCase()
                  : currency;
              return (
                <div key={`${String(invoice?.invoice_no ?? "invoice")}-${index}`} className="rounded-lg border p-4">
                  <p className="font-medium">{String(invoice?.invoice_no ?? "Invoice")}</p>
                  <p className="text-xs text-muted-foreground">
                    Invoice date: {formatDate(String(invoice?.invoice_date ?? ""))}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Invoice total: {formatCurrency(Number(invoice?.total ?? 0), allocationCurrency)}
                  </p>
                  <p className="mt-2 text-sm font-medium">
                    Applied: {formatCurrency(Number(allocation.amount_allocated ?? 0), allocationCurrency)}
                  </p>
                </div>
              );
            })
          ) : (
            <p className="text-muted-foreground">No linked invoice allocations found.</p>
          )}
        </CardContent>
      </Card>

      {receipt.notes ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-line text-sm text-muted-foreground">
              {String(receipt.notes)}
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

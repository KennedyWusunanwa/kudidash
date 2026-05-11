import { notFound } from "next/navigation";
import { getInvoiceDisplayNumber } from "@/lib/accounting/invoice-number";
import { getInvoiceDisplayStatus } from "@/lib/accounting/invoice-status";
import { formatTaxRate } from "@/lib/accounting/tax";
import { getInvoice } from "@/lib/data/invoices.data";
import { listInvoiceReceipts } from "@/lib/data/receipts.data";
import { requireOrgMembership } from "@/lib/data/org.data";
import { roleHasPermission } from "@/lib/permissions";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { PublicDocumentActions } from "@/components/documents/public-document-actions";
import { InvoicePaymentForm } from "@/components/forms/invoice-payment-form";
import { InvoicesTable } from "@/components/tables/invoices-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ orgId: string; invoiceId: string }>;
}) {
  const { orgId, invoiceId } = await params;
  const membership = await requireOrgMembership(orgId);
  const canManageSales = roleHasPermission(membership.role, "sales.manage");
  const canManageInvoiceAdmin = roleHasPermission(membership.role, "org.manage");

  let invoice: Record<string, unknown>;
  try {
    invoice = (await getInvoice(orgId, invoiceId)) as Record<string, unknown>;
  } catch {
    notFound();
  }

  const receipts = await listInvoiceReceipts(orgId, invoiceId);
  const lines = Array.isArray(invoice.invoice_lines)
    ? ([...(invoice.invoice_lines as Array<Record<string, unknown>>)].sort(
        (a, b) => Number(a.line_no ?? 0) - Number(b.line_no ?? 0)
      ) as Array<Record<string, unknown>>)
    : [];
  const invoiceCurrency =
    typeof invoice.currency_code === "string" && invoice.currency_code.trim()
      ? invoice.currency_code.trim().toUpperCase()
      : "USD";
  const amountPaid = Number(invoice.amount_paid ?? 0);
  const total = Number(invoice.total ?? 0);
  const outstanding = Number((total - amountPaid).toFixed(2));
  const displayStatus = getInvoiceDisplayStatus(invoice.status, amountPaid, total);
  const displayInvoiceNo = getInvoiceDisplayNumber(
    typeof invoice.invoice_no === "string" ? invoice.invoice_no : null,
    typeof invoice.id === "string" ? invoice.id : invoiceId
  );
  const taxRateLabel = formatTaxRate(invoice.tax_rate);
  const customerId = typeof invoice.customer_id === "string" ? invoice.customer_id : "";
  const publicViewToken =
    typeof invoice.public_view_token === "string" ? invoice.public_view_token : null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invoice header</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <p className="text-xs text-muted-foreground">Invoice</p>
            <p className="font-medium">{displayInvoiceNo}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Date</p>
            <p className="font-medium">{formatDate(String(invoice.invoice_date ?? ""))}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Due</p>
            <p className="font-medium">{formatDate(String(invoice.due_date ?? ""))}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <p className="font-medium capitalize">{displayStatus}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Currency</p>
            <p className="font-medium">{invoiceCurrency}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Subtotal</p>
            <p className="font-medium">{formatCurrency(Number(invoice.subtotal ?? 0), invoiceCurrency)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{`Tax (${taxRateLabel})`}</p>
            <p className="font-medium">{formatCurrency(Number(invoice.tax_total ?? 0), invoiceCurrency)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="font-medium">{formatCurrency(total, invoiceCurrency)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Paid</p>
            <p className="font-medium">{formatCurrency(amountPaid, invoiceCurrency)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Outstanding</p>
            <p className="font-medium">{formatCurrency(outstanding, invoiceCurrency)}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Customer snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="font-medium">{String(invoice.customer_name ?? "Customer")}</p>
            {invoice.customer_email ? <p>{String(invoice.customer_email)}</p> : null}
            {invoice.customer_phone ? <p>{String(invoice.customer_phone)}</p> : null}
            {invoice.customer_billing_address ? (
              <p className="whitespace-pre-line">{String(invoice.customer_billing_address)}</p>
            ) : null}
            {invoice.customer_tax_id ? <p>Tax ID: {String(invoice.customer_tax_id)}</p> : null}
            {invoice.customer_description ? (
              <p className="text-muted-foreground">{String(invoice.customer_description)}</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Customer delivery</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {publicViewToken ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Share this invoice link or PDF with the customer.
                </p>
                <PublicDocumentActions
                  path={`/public/invoices/${publicViewToken}`}
                  pdfPath={`/public/invoices/${publicViewToken}/pdf`}
                  openLabel="Open invoice"
                />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Public sharing is not available for this invoice yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <InvoicesTable
            orgId={orgId}
            canManageSales={canManageSales}
            canManageAdmin={canManageInvoiceAdmin}
            invoices={[
              {
                id: String(invoice.id),
                invoice_no: (invoice.invoice_no as string | null | undefined) ?? null,
                invoice_date: String(invoice.invoice_date ?? ""),
                due_date: String(invoice.due_date ?? ""),
                status: String(invoice.status ?? "draft"),
                currency_code: invoiceCurrency,
                total,
                amount_paid: amountPaid,
              },
            ]}
          />
        </CardContent>
      </Card>

      {(String(invoice.status ?? "").toLowerCase() === "posted" ||
        String(invoice.status ?? "").toLowerCase() === "paid") &&
      canManageSales &&
      customerId ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Verify payment</CardTitle>
          </CardHeader>
          <CardContent>
            <InvoicePaymentForm
              orgId={orgId}
              invoiceId={invoiceId}
              customerId={customerId}
              currencyCode={invoiceCurrency}
              outstandingAmount={outstanding}
            />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invoice lines</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Tax</TableHead>
                  <TableHead>Line Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.length ? (
                  lines.map((line) => (
                    <TableRow key={String(line.id ?? `${line.line_no ?? ""}`)}>
                      <TableCell>{String(line.line_no ?? "")}</TableCell>
                      <TableCell>{String(line.description ?? "-")}</TableCell>
                      <TableCell>{formatNumber(Number(line.quantity ?? 0))}</TableCell>
                      <TableCell>{formatCurrency(Number(line.unit_price ?? 0), invoiceCurrency)}</TableCell>
                      <TableCell>{formatCurrency(Number(line.tax_amount ?? 0), invoiceCurrency)}</TableCell>
                      <TableCell>{formatCurrency(Number(line.line_total ?? 0), invoiceCurrency)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No lines found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Verified receipts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {receipts.length ? (
            receipts.map((entry, index) => {
              const receipt = (entry.receipt ?? null) as Record<string, unknown> | null;
              const receiptToken =
                receipt && typeof receipt.public_view_token === "string"
                  ? receipt.public_view_token
                  : null;

              return (
                <div
                  key={`${String(receipt?.id ?? "receipt")}-${index}`}
                  className="rounded-lg border p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1 text-sm">
                      <p className="font-medium">
                        {String(receipt?.receipt_no ?? receipt?.id ?? "Receipt")}
                      </p>
                      <p className="text-muted-foreground">
                        {formatDate(String(receipt?.receipt_date ?? entry.created_at ?? ""))}
                      </p>
                      <p>
                        Applied:{" "}
                        <span className="font-medium">
                          {formatCurrency(Number(entry.amount_allocated ?? 0), invoiceCurrency)}
                        </span>
                      </p>
                      <p className="text-muted-foreground">
                        {String(receipt?.payment_method ?? "Payment verified")}
                        {receipt?.reference ? ` - ${String(receipt.reference)}` : ""}
                      </p>
                    </div>
                    {receiptToken ? (
                      <PublicDocumentActions
                        path={`/public/receipts/${receiptToken}`}
                        pdfPath={`/public/receipts/${receiptToken}/pdf`}
                        openLabel="Open receipt"
                      />
                    ) : null}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground">No verified receipts yet.</p>
          )}
        </CardContent>
      </Card>

      {invoice.notes ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-line text-sm text-muted-foreground">
              {String(invoice.notes)}
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

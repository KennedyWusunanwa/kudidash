import { notFound } from "next/navigation";
import { getInvoiceDisplayNumber } from "@/lib/accounting/invoice-number";
import { getInvoiceDisplayStatus } from "@/lib/accounting/invoice-status";
import { formatTaxRate } from "@/lib/accounting/tax";
import { getPublicInvoiceDocumentByToken } from "@/lib/data/receipts.data";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function PublicInvoicePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const document = await getPublicInvoiceDocumentByToken(token);
  if (!document) notFound();

  const invoice = document.invoice as Record<string, unknown>;
  const org = (document.org ?? {}) as Record<string, unknown>;
  const customer = (document.customer ?? {}) as Record<string, unknown>;
  const lines = Array.isArray(invoice.invoice_lines)
    ? (invoice.invoice_lines as Array<Record<string, unknown>>)
    : [];
  const currency =
    typeof invoice.currency_code === "string" && invoice.currency_code.trim()
      ? invoice.currency_code.trim().toUpperCase()
      : typeof org.base_currency === "string" && org.base_currency.trim()
        ? org.base_currency.trim().toUpperCase()
        : "GHS";
  const amountPaid = Number(invoice.amount_paid ?? 0);
  const outstanding = Number((Number(invoice.total ?? 0) - amountPaid).toFixed(2));
  const displayStatus = getInvoiceDisplayStatus(
    invoice.status,
    amountPaid,
    Number(invoice.total ?? 0)
  );
  const displayInvoiceNo = getInvoiceDisplayNumber(
    typeof invoice.invoice_no === "string" ? invoice.invoice_no : null,
    typeof invoice.id === "string" ? invoice.id : null
  );
  const taxRateLabel = formatTaxRate(invoice.tax_rate);

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">KudiDash document</p>
          <h1 className="text-3xl font-semibold">{displayInvoiceNo}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Issued by {String(org.invoice_company_name ?? org.name ?? "Organization")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <a href={`/public/invoices/${token}/pdf`} target="_blank" rel="noreferrer">
              Download PDF
            </a>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bill to</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="font-medium">{String(customer.name ?? "Customer")}</p>
            {customer.email ? <p>{String(customer.email)}</p> : null}
            {customer.phone ? <p>{String(customer.phone)}</p> : null}
            {customer.billing_address ? (
              <p className="whitespace-pre-line">{String(customer.billing_address)}</p>
            ) : null}
            {customer.tax_id ? <p>Tax ID: {String(customer.tax_id)}</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invoice summary</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <p className="font-medium capitalize">{displayStatus}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Invoice date</p>
              <p className="font-medium">{formatDate(String(invoice.invoice_date ?? ""))}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Due date</p>
              <p className="font-medium">{formatDate(String(invoice.due_date ?? ""))}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Subtotal</p>
              <p className="font-medium">{formatCurrency(Number(invoice.subtotal ?? 0), currency)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{`Tax (${taxRateLabel})`}</p>
              <p className="font-medium">{formatCurrency(Number(invoice.tax_total ?? 0), currency)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="font-medium">{formatCurrency(Number(invoice.total ?? 0), currency)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Paid</p>
              <p className="font-medium">{formatCurrency(amountPaid, currency)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Outstanding</p>
              <p className="font-medium">{formatCurrency(outstanding, currency)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

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
                  <TableHead>Unit price</TableHead>
                  <TableHead>Tax</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.length ? (
                  lines.map((line, index) => (
                    <TableRow
                      key={`${String(line.id ?? line.line_no ?? line.description ?? "line")}-${index}`}
                    >
                      <TableCell>{String(line.line_no ?? "-")}</TableCell>
                      <TableCell>{String(line.description ?? "-")}</TableCell>
                      <TableCell>{formatNumber(Number(line.quantity ?? 0))}</TableCell>
                      <TableCell>{formatCurrency(Number(line.unit_price ?? 0), currency)}</TableCell>
                      <TableCell>{formatCurrency(Number(line.tax_amount ?? 0), currency)}</TableCell>
                      <TableCell>{formatCurrency(Number(line.line_total ?? 0), currency)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      No invoice lines found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
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

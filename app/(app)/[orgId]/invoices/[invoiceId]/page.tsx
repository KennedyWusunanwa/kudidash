import { notFound } from "next/navigation";
import { getInvoice } from "@/lib/data/invoices.data";
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
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ orgId: string; invoiceId: string }>;
}) {
  const { orgId, invoiceId } = await params;
  let invoice: Record<string, unknown>;
  try {
    invoice = (await getInvoice(orgId, invoiceId)) as Record<string, unknown>;
  } catch {
    notFound();
  }

  const lines = Array.isArray(invoice.invoice_lines)
    ? (invoice.invoice_lines as Array<Record<string, unknown>>)
    : [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invoice header</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Invoice</p>
            <p className="font-medium">{String(invoice.invoice_no ?? invoice.id)}</p>
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
            <p className="font-medium capitalize">{String(invoice.status ?? "-")}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Subtotal</p>
            <p className="font-medium">{formatCurrency(Number(invoice.subtotal ?? 0))}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Tax</p>
            <p className="font-medium">{formatCurrency(Number(invoice.tax_total ?? 0))}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="font-medium">{formatCurrency(Number(invoice.total ?? 0))}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <InvoicesTable
            orgId={orgId}
            invoices={[
              {
                id: String(invoice.id),
                invoice_no: (invoice.invoice_no as string | null | undefined) ?? null,
                invoice_date: String(invoice.invoice_date ?? ""),
                due_date: String(invoice.due_date ?? ""),
                status: String(invoice.status ?? "draft"),
                total: Number(invoice.total ?? 0),
              },
            ]}
          />
        </CardContent>
      </Card>

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
                    <TableRow key={String(line.id)}>
                      <TableCell>{String(line.line_no ?? "")}</TableCell>
                      <TableCell>{String(line.description ?? "-")}</TableCell>
                      <TableCell>{formatNumber(Number(line.quantity ?? 0))}</TableCell>
                      <TableCell>{formatCurrency(Number(line.unit_price ?? 0))}</TableCell>
                      <TableCell>{formatCurrency(Number(line.tax_amount ?? 0))}</TableCell>
                      <TableCell>{formatCurrency(Number(line.line_total ?? 0))}</TableCell>
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
    </div>
  );
}

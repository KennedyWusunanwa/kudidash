import { notFound } from "next/navigation";
import { getBill } from "@/lib/data/bills.data";
import { BillsTable } from "@/components/tables/bills-table";
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

export default async function BillDetailPage({
  params,
}: {
  params: Promise<{ orgId: string; billId: string }>;
}) {
  const { orgId, billId } = await params;
  let bill: Record<string, unknown>;
  try {
    bill = (await getBill(orgId, billId)) as Record<string, unknown>;
  } catch {
    notFound();
  }

  const lines = Array.isArray(bill.bill_lines)
    ? (bill.bill_lines as Array<Record<string, unknown>>)
    : [];
  const billCurrency =
    typeof bill.currency_code === "string" && bill.currency_code.trim()
      ? bill.currency_code.trim().toUpperCase()
      : undefined;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bill header</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Bill</p>
            <p className="font-medium">{String(bill.bill_no ?? bill.id)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Date</p>
            <p className="font-medium">{formatDate(String(bill.bill_date ?? ""))}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Due</p>
            <p className="font-medium">{formatDate(String(bill.due_date ?? ""))}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <p className="font-medium capitalize">{String(bill.status ?? "-")}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Currency</p>
            <p className="font-medium">{billCurrency ?? "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Subtotal</p>
            <p className="font-medium">{formatCurrency(Number(bill.subtotal ?? 0), billCurrency)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Tax</p>
            <p className="font-medium">{formatCurrency(Number(bill.tax_total ?? 0), billCurrency)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="font-medium">{formatCurrency(Number(bill.total ?? 0), billCurrency)}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <BillsTable
            orgId={orgId}
            bills={[
              {
                id: String(bill.id),
                bill_no: (bill.bill_no as string | null | undefined) ?? null,
                bill_date: String(bill.bill_date ?? ""),
                due_date: String(bill.due_date ?? ""),
                status: String(bill.status ?? "draft"),
                currency_code: billCurrency ?? null,
                total: Number(bill.total ?? 0),
              },
            ]}
            currencyCode={billCurrency}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bill lines</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Unit Cost</TableHead>
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
                      <TableCell>{formatCurrency(Number(line.unit_cost ?? 0), billCurrency)}</TableCell>
                      <TableCell>{formatCurrency(Number(line.tax_amount ?? 0), billCurrency)}</TableCell>
                      <TableCell>{formatCurrency(Number(line.line_total ?? 0), billCurrency)}</TableCell>
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

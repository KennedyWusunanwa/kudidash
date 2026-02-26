import Link from "next/link";
import { ArrowRight, PlusCircle } from "lucide-react";
import { listCustomersWithSummary } from "@/lib/data/customers.data";
import { getOrganizationById } from "@/lib/data/org.data";
import { formatCurrency, formatDate } from "@/lib/format";
import { CustomerForm } from "@/components/forms/customer-form";
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

export default async function CustomersPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const [customers, org] = await Promise.all([listCustomersWithSummary(orgId), getOrganizationById(orgId)]);
  const baseCurrency =
    typeof org?.base_currency === "string" && org.base_currency.trim()
      ? org.base_currency.trim().toUpperCase()
      : undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Customers</h2>
          <p className="text-sm text-muted-foreground">
            Customer directory with profile details, invoice totals, and activity history.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/${orgId}/invoices/new`}>
            <PlusCircle className="size-4" />
            New invoice
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add customer</CardTitle>
        </CardHeader>
        <CardContent>
          <CustomerForm orgId={orgId} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Customer directory</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-xs text-muted-foreground">
            Monetary summary columns are shown in base currency: {baseCurrency ?? "GHS"}.
          </p>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Invoices</TableHead>
                  <TableHead>Invoiced</TableHead>
                  <TableHead>Receipts</TableHead>
                  <TableHead>Outstanding</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead className="text-right">Profile</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.length ? (
                  customers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="align-top">
                        <div className="min-w-[12rem]">
                          <Link
                            href={`/${orgId}/customers/${customer.id}`}
                            className="font-medium hover:underline"
                          >
                            {customer.name}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {customer.is_active ? "Active" : "Inactive"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-normal align-top">
                        <div className="max-w-[16rem] space-y-1 text-xs">
                          <p>{customer.email || "-"}</p>
                          <p>{customer.phone || "-"}</p>
                          <p className="text-muted-foreground">
                            {customer.billing_address || "-"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[14rem] whitespace-normal align-top text-xs text-muted-foreground">
                        {customer.description || "-"}
                      </TableCell>
                      <TableCell className="align-top">{customer.invoice_count}</TableCell>
                      <TableCell className="align-top">
                        {formatCurrency(customer.invoice_total, baseCurrency)}
                      </TableCell>
                      <TableCell className="align-top">
                        {customer.receipt_count} ({formatCurrency(customer.receipt_total, baseCurrency)})
                      </TableCell>
                      <TableCell className="align-top">
                        {formatCurrency(customer.outstanding_balance, baseCurrency)}
                      </TableCell>
                      <TableCell className="align-top text-xs">
                        {formatDate(customer.last_activity_at)}
                      </TableCell>
                      <TableCell className="text-right align-top">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/${orgId}/customers/${customer.id}`}>
                            Open
                            <ArrowRight className="size-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                      No customers yet.
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

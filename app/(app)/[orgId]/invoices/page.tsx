import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { listCustomers, listInvoices } from "@/lib/data/invoices.data";
import { InvoicesTable } from "@/components/tables/invoices-table";
import { CustomerForm } from "@/components/forms/customer-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function InvoicesPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const [invoices, customers] = await Promise.all([listInvoices(orgId), listCustomers(orgId)]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Invoices (AR)</h2>
          <p className="text-sm text-muted-foreground">
            Posting an invoice creates AR + revenue journal entries via database RPC.
          </p>
        </div>
        <Button asChild>
          <Link href={`/${orgId}/invoices/new`}>
            <PlusCircle className="size-4" />
            New invoice
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Customers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <CustomerForm orgId={orgId} />
          <div className="flex flex-wrap gap-2">
            {customers.length ? (
              customers.map((customer) => (
                <Link
                  key={customer.id}
                  href={`/${orgId}/customers/${String(customer.id)}`}
                  className="rounded-full border px-3 py-1 text-sm hover:bg-accent"
                >
                  {String(customer.name)}
                </Link>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No customers yet.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invoice register</CardTitle>
        </CardHeader>
        <CardContent>
          <InvoicesTable orgId={orgId} invoices={invoices as never[]} />
        </CardContent>
      </Card>
    </div>
  );
}

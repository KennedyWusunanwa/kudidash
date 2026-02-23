import { listAccountsForSelect } from "@/lib/data/coa.data";
import { listCustomers } from "@/lib/data/invoices.data";
import { InvoiceForm } from "@/components/forms/invoice-form";
import { CustomerForm } from "@/components/forms/customer-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NewInvoicePage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const [customers, accounts] = await Promise.all([
    listCustomers(orgId),
    listAccountsForSelect(orgId),
  ]);

  const revenueAccounts = accounts.filter(
    (account) => account.type === "income" || account.sub_type === "sales"
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Create Invoice</h2>
        <p className="text-sm text-muted-foreground">
          Auto-post uses `kd_post_invoice` RPC to create journal entries atomically.
        </p>
      </div>

      {!customers.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create a customer first</CardTitle>
          </CardHeader>
          <CardContent>
            <CustomerForm orgId={orgId} />
          </CardContent>
        </Card>
      ) : null}

      <InvoiceForm
        orgId={orgId}
        customers={(customers as Array<Record<string, unknown>>).map((c) => ({
          id: String(c.id),
          label: String(c.name),
        }))}
        revenueAccounts={revenueAccounts}
      />
    </div>
  );
}

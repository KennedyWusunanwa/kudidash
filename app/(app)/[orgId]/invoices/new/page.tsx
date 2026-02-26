import Link from "next/link";
import { listAccountsForSelect } from "@/lib/data/coa.data";
import { listCustomers } from "@/lib/data/invoices.data";
import { listInventoryItems } from "@/lib/data/inventory.data";
import { getOrganizationById } from "@/lib/data/org.data";
import { InvoiceForm } from "@/components/forms/invoice-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NewInvoicePage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const [customers, accounts, inventoryItems, org] = await Promise.all([
    listCustomers(orgId),
    listAccountsForSelect(orgId),
    listInventoryItems(orgId),
    getOrganizationById(orgId),
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

      {customers.length ? (
        <InvoiceForm
          orgId={orgId}
          defaultCurrencyCode={
            typeof org?.base_currency === "string" && org.base_currency.trim()
              ? org.base_currency
              : undefined
          }
          customers={(customers as Array<Record<string, unknown>>).map((c) => ({
            id: String(c.id),
            label: String(c.name),
            name: typeof c.name === "string" ? c.name : "",
            email: typeof c.email === "string" ? c.email : "",
            phone: typeof c.phone === "string" ? c.phone : "",
            billing_address: typeof c.billing_address === "string" ? c.billing_address : "",
            description: typeof c.description === "string" ? c.description : "",
          }))}
          revenueAccounts={revenueAccounts}
          inventoryItems={(inventoryItems as Array<Record<string, unknown>>)
            .filter((item) => item.is_active !== false)
            .map((item) => ({
              value: String(item.name ?? ""),
              label: item.sku
                ? `${String(item.sku)} - ${String(item.name ?? "")}`
                : String(item.name ?? ""),
              revenueAccountId:
                typeof item.revenue_account_id === "string" ? item.revenue_account_id : null,
              salePrice:
                typeof item.sale_price === "number"
                  ? item.sale_price
                  : Number(item.sale_price ?? 0),
            }))
            .filter((item) => item.value)}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">No customers found</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Create a customer first from the Customers page before creating an invoice.
            </p>
            <Button asChild>
              <Link href={`/${orgId}/customers`}>Go to customers</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

import { listAccountsForSelect } from "@/lib/data/coa.data";
import { listVendors } from "@/lib/data/bills.data";
import { listInventoryItems } from "@/lib/data/inventory.data";
import { BillForm } from "@/components/forms/bill-form";
import { VendorForm } from "@/components/forms/vendor-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NewBillPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const [vendors, accounts, inventoryItems] = await Promise.all([
    listVendors(orgId),
    listAccountsForSelect(orgId),
    listInventoryItems(orgId),
  ]);

  const expenseAccounts = accounts.filter(
    (account) => account.type === "expense" || account.sub_type === "operating_expense"
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Create Bill</h2>
        <p className="text-sm text-muted-foreground">
          Auto-post uses `kd_post_bill` RPC to create journal entries atomically.
        </p>
      </div>

      {!vendors.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create a vendor first</CardTitle>
          </CardHeader>
          <CardContent>
            <VendorForm orgId={orgId} />
          </CardContent>
        </Card>
      ) : null}

      <BillForm
        orgId={orgId}
        vendors={(vendors as Array<Record<string, unknown>>).map((v) => ({
          id: String(v.id),
          label: String(v.name),
        }))}
        expenseAccounts={expenseAccounts}
        inventoryItems={(inventoryItems as Array<Record<string, unknown>>)
          .filter((item) => item.is_active !== false)
          .map((item) => ({
            value: String(item.name ?? ""),
            label: item.sku
              ? `${String(item.sku)} - ${String(item.name ?? "")}`
              : String(item.name ?? ""),
            expenseAccountId:
              typeof item.cogs_account_id === "string" ? item.cogs_account_id : null,
            purchasePrice:
              typeof item.purchase_price === "number"
                ? item.purchase_price
                : Number(item.purchase_price ?? 0),
          }))
          .filter((item) => item.value)}
      />
    </div>
  );
}

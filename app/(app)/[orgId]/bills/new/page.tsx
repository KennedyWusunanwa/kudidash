import { listAccountsForSelect } from "@/lib/data/coa.data";
import { listVendors } from "@/lib/data/bills.data";
import { listInventoryItems } from "@/lib/data/inventory.data";
import { getOrganizationById, requireOrgMembership } from "@/lib/data/org.data";
import { roleHasPermission } from "@/lib/permissions";
import { BillForm } from "@/components/forms/bill-form";
import { VendorForm } from "@/components/forms/vendor-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NewBillPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const [vendors, accounts, inventoryItems, org, membership] = await Promise.all([
    listVendors(orgId),
    listAccountsForSelect(orgId),
    listInventoryItems(orgId),
    getOrganizationById(orgId),
    requireOrgMembership(orgId),
  ]);
  const canManagePurchases = roleHasPermission(membership.role, "purchases.manage");

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

      {!canManagePurchases ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Purchasing access required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Only users with `purchases.manage` can create bills or add vendors.
            </p>
          </CardContent>
        </Card>
      ) : !vendors.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create a vendor first</CardTitle>
          </CardHeader>
          <CardContent>
            <VendorForm orgId={orgId} />
          </CardContent>
        </Card>
      ) : null}

      {canManagePurchases ? (
        <BillForm
          orgId={orgId}
          defaultCurrencyCode={
            typeof org?.base_currency === "string" && org.base_currency.trim()
              ? org.base_currency
              : undefined
          }
          vendors={(vendors as Array<Record<string, unknown>>).map((v) => ({
            id: String(v.id),
            label: String(v.name),
          }))}
          expenseAccounts={expenseAccounts}
          inventoryItems={(inventoryItems as Array<Record<string, unknown>>)
            .filter((item) => item.is_active !== false)
            .map((item) => ({
              id: String(item.id ?? ""),
              label: item.sku
                ? `${String(item.sku)} - ${String(item.name ?? "")}`
                : String(item.name ?? ""),
              name: String(item.name ?? ""),
              expenseAccountId:
                typeof item.inventory_account_id === "string" ? item.inventory_account_id : null,
              purchasePrice:
                typeof item.purchase_price === "number"
                  ? item.purchase_price
                  : Number(item.purchase_price ?? 0),
              availableQuantity:
                typeof item.quantity_on_hand === "number"
                  ? item.quantity_on_hand
                  : Number(item.quantity_on_hand ?? 0),
            }))
            .filter((item) => item.id)}
        />
      ) : null}
    </div>
  );
}

import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { listBills, listVendors } from "@/lib/data/bills.data";
import { getOrganizationById, requireOrgMembership } from "@/lib/data/org.data";
import { roleHasPermission } from "@/lib/permissions";
import { VendorForm } from "@/components/forms/vendor-form";
import { BillsTable } from "@/components/tables/bills-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function BillsPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const [bills, vendors, org, membership] = await Promise.all([
    listBills(orgId),
    listVendors(orgId),
    getOrganizationById(orgId),
    requireOrgMembership(orgId),
  ]);
  const baseCurrency =
    typeof org?.base_currency === "string" && org.base_currency.trim()
      ? org.base_currency.trim().toUpperCase()
      : undefined;
  const canManagePurchases = roleHasPermission(membership.role, "purchases.manage");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Bills (AP)</h2>
          <p className="text-sm text-muted-foreground">
            Posting a bill creates expense + AP journal entries via database RPC.
          </p>
        </div>
        {canManagePurchases ? (
          <Button asChild>
            <Link href={`/${orgId}/bills/new`}>
              <PlusCircle className="size-4" />
              New bill
            </Link>
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vendors</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {canManagePurchases ? <VendorForm orgId={orgId} /> : null}
          <div className="flex flex-wrap gap-2">
            {vendors.length ? (
              vendors.map((vendor) => (
                <span key={vendor.id} className="rounded-full border px-3 py-1 text-sm">
                  {String(vendor.name)}
                </span>
              ))
            ) : canManagePurchases ? (
              <p className="text-sm text-muted-foreground">No vendors yet.</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Your role can view bills, but only users with `purchases.manage` can add vendors or post bills.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bill register</CardTitle>
        </CardHeader>
        <CardContent>
          <BillsTable
            orgId={orgId}
            bills={bills as never[]}
            currencyCode={baseCurrency}
            canManagePurchases={canManagePurchases}
          />
        </CardContent>
      </Card>
    </div>
  );
}

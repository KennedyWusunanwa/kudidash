import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { listInvoices } from "@/lib/data/invoices.data";
import { requireOrgMembership } from "@/lib/data/org.data";
import { roleHasPermission } from "@/lib/permissions";
import { InvoicesTable } from "@/components/tables/invoices-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function InvoicesPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const [invoices, membership] = await Promise.all([listInvoices(orgId), requireOrgMembership(orgId)]);
  const canManageSales = roleHasPermission(membership.role, "sales.manage");
  const canManageInvoiceAdmin = roleHasPermission(membership.role, "org.manage");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Invoices (AR)</h2>
          <p className="text-sm text-muted-foreground">
            Posting an invoice creates AR + revenue journal entries via database RPC.
          </p>
        </div>
        {canManageSales ? (
          <Button asChild>
            <Link href={`/${orgId}/invoices/new`}>
              <PlusCircle className="size-4" />
              New invoice
            </Link>
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Customers</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Customer creation and profiles are managed from the Customers page.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href={`/${orgId}/customers`}>Open customers</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invoice register</CardTitle>
        </CardHeader>
        <CardContent>
          <InvoicesTable
            orgId={orgId}
            invoices={invoices as never[]}
            canManageSales={canManageSales}
            canManageAdmin={canManageInvoiceAdmin}
          />
        </CardContent>
      </Card>
    </div>
  );
}

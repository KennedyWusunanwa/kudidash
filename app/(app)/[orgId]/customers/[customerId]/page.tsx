import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, PlusCircle } from "lucide-react";
import { getInvoiceDisplayNumber } from "@/lib/accounting/invoice-number";
import { getCustomerProfile } from "@/lib/data/customers.data";
import { getOrganizationById, requireOrgMembership } from "@/lib/data/org.data";
import { roleHasPermission } from "@/lib/permissions";
import { formatCurrency, formatDate } from "@/lib/format";
import { CustomerDeleteButton } from "@/components/forms/customer-delete-button";
import { CustomerProfileForm } from "@/components/forms/customer-profile-form";
import { Badge } from "@/components/ui/badge";
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

function statusBadgeVariant(status: string | null | undefined) {
  const value = String(status ?? "").toLowerCase();
  if (value === "posted" || value === "paid" || value === "active") return "default" as const;
  if (value === "draft" || value === "approved") return "secondary" as const;
  if (value === "voided" || value === "inactive") return "outline" as const;
  return "outline" as const;
}

export default async function CustomerProfilePage({
  params,
}: {
  params: Promise<{ orgId: string; customerId: string }>;
}) {
  const { orgId, customerId } = await params;
  const [profile, membership, org] = await Promise.all([
    getCustomerProfile(orgId, customerId),
    requireOrgMembership(orgId),
    getOrganizationById(orgId),
  ]);
  if (!profile) notFound();

  const { customer, invoices, receipts, activities } = profile;
  const canManageCustomer = roleHasPermission(membership.role, "org.manage");
  const canDeleteCustomer = customer.invoice_count === 0 && customer.receipt_count === 0;
  const baseCurrency =
    typeof org?.base_currency === "string" && org.base_currency.trim()
      ? org.base_currency.trim().toUpperCase()
      : undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <Button asChild variant="ghost" size="sm" className="px-0">
            <Link href={`/${orgId}/customers`}>
              <ArrowLeft className="size-4" />
              Back to customers
            </Link>
          </Button>
          <h2 className="text-xl font-semibold tracking-tight">{customer.name}</h2>
          <p className="text-sm text-muted-foreground">
            Customer profile with invoices and activity history.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={`/${orgId}/invoices`}>
              View invoices
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/${orgId}/invoices/new`}>
              <PlusCircle className="size-4" />
              New invoice
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1.9fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant={statusBadgeVariant(customer.is_active ? "active" : "inactive")}>
                  {customer.is_active ? "Active" : "Inactive"}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Customer ID: {customer.id.slice(0, 8)}
                </span>
              </div>

              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-medium">{customer.email || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="font-medium">{customer.phone || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Billing address</p>
                  <p className="whitespace-pre-line font-medium">{customer.billing_address || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tax ID</p>
                  <p className="font-medium">{customer.tax_id || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Description</p>
                  <p className="whitespace-pre-line font-medium">{customer.description || "-"}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Created</p>
                    <p className="font-medium">{formatDate(customer.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Updated</p>
                    <p className="font-medium">{formatDate(customer.updated_at)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Edit profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {canManageCustomer ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Admin/owner can update customer details directly from this profile.
                  </p>
                  <CustomerProfileForm
                    orgId={orgId}
                    customerId={customer.id}
                    initialValues={{
                      name: customer.name,
                      email: customer.email,
                      phone: customer.phone,
                      billing_address: customer.billing_address,
                      tax_id: customer.tax_id,
                      description: customer.description,
                      is_active: customer.is_active,
                    }}
                  />
                  <div className="rounded-lg border border-dashed p-3">
                    <p className="text-sm font-medium">Delete customer</p>
                    <p className="mb-3 text-xs text-muted-foreground">
                      Customers with invoices or receipts cannot be deleted. Set them inactive
                      instead.
                    </p>
                    <CustomerDeleteButton
                      orgId={orgId}
                      customerId={customer.id}
                      customerName={customer.name}
                      disabled={!canDeleteCustomer}
                    />
                    {!canDeleteCustomer ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Deletion is blocked because this customer has {customer.invoice_count} invoice(s)
                        and {customer.receipt_count} receipt(s).
                      </p>
                    ) : null}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Only organization `owner` and `admin` roles can edit customer information.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{customer.invoice_count}</p>
              <p className="text-xs text-muted-foreground">Documents issued</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Invoiced Total</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">
                {formatCurrency(customer.invoice_total, baseCurrency)}
              </p>
              <p className="text-xs text-muted-foreground">Sum of invoice totals</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Receipts Total</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">
                {formatCurrency(customer.receipt_total, baseCurrency)}
              </p>
              <p className="text-xs text-muted-foreground">{customer.receipt_count} receipts</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Outstanding</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">
                {formatCurrency(customer.outstanding_balance, baseCurrency)}
              </p>
              <p className="text-xs text-muted-foreground">
                Invoice total minus receipts
              </p>
            </CardContent>
          </Card>

          <Card className="sm:col-span-2 xl:col-span-4">
            <CardHeader>
              <CardTitle className="text-base">Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead className="text-right">Open</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.length ? (
                      invoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-medium">
                            {getInvoiceDisplayNumber(invoice.invoice_no, invoice.id)}
                          </TableCell>
                          <TableCell>{formatDate(invoice.invoice_date)}</TableCell>
                          <TableCell>{formatDate(invoice.due_date)}</TableCell>
                          <TableCell>
                            <Badge variant={statusBadgeVariant(invoice.status)}>
                              {invoice.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatCurrency(invoice.total, invoice.currency_code)}</TableCell>
                          <TableCell className="text-right">
                            <Button asChild size="sm" variant="outline">
                              <Link href={`/${orgId}/invoices/${invoice.id}`}>
                                View
                                <ExternalLink className="size-4" />
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                          No invoices for this customer yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_1.9fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Receipts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receipts.length ? (
                    receipts.map((receipt) => (
                      <TableRow key={receipt.id}>
                        <TableCell className="font-medium">
                          {receipt.receipt_no ?? receipt.id.slice(0, 8)}
                        </TableCell>
                        <TableCell>{formatDate(receipt.receipt_date)}</TableCell>
                        <TableCell>
                          <Badge variant={statusBadgeVariant(receipt.status)}>
                            {receipt.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {formatCurrency(receipt.amount, receipt.currency_code)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                        No receipts recorded for this customer.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activity Feed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activities.length ? (
              activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{activity.kind}</Badge>
                      {activity.status ? (
                        <Badge variant={statusBadgeVariant(activity.status)}>
                          {activity.status}
                        </Badge>
                      ) : null}
                      <span className="text-xs text-muted-foreground">
                        {formatDate(activity.activity_date)}
                      </span>
                    </div>
                    <p className="font-medium">{activity.title}</p>
                    {activity.description ? (
                      <p className="text-sm text-muted-foreground">{activity.description}</p>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {activity.amount != null ? (
                      <span className="text-sm font-medium">
                        {formatCurrency(activity.amount, activity.currency_code || baseCurrency || "GHS")}
                      </span>
                    ) : null}
                    {activity.href ? (
                      <Button asChild size="sm" variant="outline">
                        <Link href={activity.href}>
                          Open
                          <ExternalLink className="size-4" />
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No activity found.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { listAccountsForSelect } from "@/lib/data/coa.data";
import { getInvoice, listCustomers } from "@/lib/data/invoices.data";
import { listInventoryItems } from "@/lib/data/inventory.data";
import { getOrganizationById, requireOrgMembership } from "@/lib/data/org.data";
import { roleHasPermission } from "@/lib/permissions";
import { InvoiceForm } from "@/components/forms/invoice-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ orgId: string; invoiceId: string }>;
}) {
  const { orgId, invoiceId } = await params;

  const [membership, customers, accounts, inventoryItems, org] = await Promise.all([
    requireOrgMembership(orgId),
    listCustomers(orgId),
    listAccountsForSelect(orgId),
    listInventoryItems(orgId),
    getOrganizationById(orgId),
  ]);
  const canManageInvoiceAdmin = roleHasPermission(membership.role, "org.manage");

  let invoice: Record<string, unknown>;
  try {
    invoice = (await getInvoice(orgId, invoiceId)) as Record<string, unknown>;
  } catch {
    notFound();
  }

  const revenueAccounts = accounts.filter(
    (account) => account.type === "income" || account.sub_type === "sales"
  );
  const invoiceStatus = String(invoice.status ?? "draft").toLowerCase();
  const canEditStatus = invoiceStatus === "draft" || invoiceStatus === "approved";
  const selectedCustomer = (customers as Array<Record<string, unknown>>).find(
    (customer) => String(customer.id ?? "") === String(invoice.customer_id ?? "")
  );

  const invoiceLineRows = Array.isArray(invoice.invoice_lines)
    ? [...(invoice.invoice_lines as Array<Record<string, unknown>>)].sort(
        (a, b) => Number(a.line_no ?? 0) - Number(b.line_no ?? 0)
      )
    : [];

  const baseInventoryOptions = (inventoryItems as Array<Record<string, unknown>>)
    .filter((item) => item.is_active !== false)
    .map((item) => ({
      value: String(item.name ?? ""),
      label: item.sku ? `${String(item.sku)} - ${String(item.name ?? "")}` : String(item.name ?? ""),
      revenueAccountId: typeof item.revenue_account_id === "string" ? item.revenue_account_id : null,
      salePrice:
        typeof item.sale_price === "number" ? item.sale_price : Number(item.sale_price ?? 0),
    }))
    .filter((item) => item.value);

  const existingLineDescriptions = invoiceLineRows
    .map((line) => String(line.description ?? "").trim())
    .filter(Boolean);
  const existingValues = new Set(baseInventoryOptions.map((item) => item.value));
  const editLineOnlyOptions = existingLineDescriptions
    .filter((value) => !existingValues.has(value))
    .map((value) => ({
      value,
      label: `${value} (existing line)`,
      revenueAccountId: null,
      salePrice: null,
    }));

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Button asChild variant="ghost" size="sm" className="px-0">
          <Link href={`/${orgId}/invoices/${invoiceId}`}>
            <ArrowLeft className="size-4" />
            Back to invoice
          </Link>
        </Button>
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Edit Invoice</h2>
          <p className="text-sm text-muted-foreground">
            Only owner/admin can edit or delete invoices. Posted invoices remain read-only.
          </p>
        </div>
      </div>

      {!canManageInvoiceAdmin ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Admin only</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Only organization `owner` and `admin` roles can edit or delete invoices.
            </p>
          </CardContent>
        </Card>
      ) : !canEditStatus ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invoice is read-only</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This invoice is `{invoiceStatus}` and cannot be edited. Only draft/approved invoices can be changed.
            </p>
          </CardContent>
        </Card>
      ) : !customers.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">No customers found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Add a customer before editing this invoice.
            </p>
          </CardContent>
        </Card>
      ) : (
        <InvoiceForm
          orgId={orgId}
          mode="edit"
          invoiceId={invoiceId}
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
          inventoryItems={[...baseInventoryOptions, ...editLineOnlyOptions]}
          initialValues={{
            customer_id: String(invoice.customer_id ?? selectedCustomer?.id ?? customers[0]?.id ?? ""),
            customer_name:
              typeof selectedCustomer?.name === "string"
                ? selectedCustomer.name
                : String(invoice.customer_name ?? selectedCustomer?.label ?? ""),
            customer_email:
              typeof selectedCustomer?.email === "string" ? selectedCustomer.email : "",
            customer_phone:
              typeof selectedCustomer?.phone === "string" ? selectedCustomer.phone : "",
            customer_billing_address:
              typeof selectedCustomer?.billing_address === "string"
                ? selectedCustomer.billing_address
                : "",
            customer_description:
              typeof selectedCustomer?.description === "string" ? selectedCustomer.description : "",
            invoice_date:
              typeof invoice.invoice_date === "string" ? invoice.invoice_date.slice(0, 10) : null,
            due_date: typeof invoice.due_date === "string" ? invoice.due_date.slice(0, 10) : null,
            notes: typeof invoice.notes === "string" ? invoice.notes : "",
            lines: invoiceLineRows.map((line) => ({
              description: String(line.description ?? ""),
              quantity: Number(line.quantity ?? 1),
              unit_price: Number(line.unit_price ?? 0),
              revenue_account_id: String(line.revenue_account_id ?? revenueAccounts[0]?.id ?? ""),
              tax_amount: Number(line.tax_amount ?? 0),
            })),
          }}
        />
      )}
    </div>
  );
}

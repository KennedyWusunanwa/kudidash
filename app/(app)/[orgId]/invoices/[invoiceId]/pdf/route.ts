import { NextResponse } from "next/server";
import { getInvoiceDisplayNumber } from "@/lib/accounting/invoice-number";
import { getInvoice } from "@/lib/data/invoices.data";
import { getOrganizationById } from "@/lib/data/org.data";
import { buildInvoicePdf } from "@/lib/pdf/invoice-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeFileNamePart(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^_+|_+$/g, "") || "invoice";
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ orgId: string; invoiceId: string }> }
) {
  const { orgId, invoiceId } = await context.params;

  try {
    const [invoiceRaw, orgRaw] = await Promise.all([getInvoice(orgId, invoiceId), getOrganizationById(orgId)]);

    const invoice = invoiceRaw as Record<string, unknown>;
    const org = (orgRaw ?? {}) as Record<string, unknown>;
    const lines = Array.isArray(invoice.invoice_lines)
      ? (invoice.invoice_lines as Array<Record<string, unknown>>).map((line) => ({
          id: typeof line.id === "string" ? line.id : undefined,
          line_no: Number(line.line_no ?? 0),
          description:
            typeof line.description === "string" ? line.description : String(line.description ?? ""),
          quantity: Number(line.quantity ?? 0),
          unit_price: Number(line.unit_price ?? 0),
          tax_amount: Number(line.tax_amount ?? 0),
          line_total: Number(line.line_total ?? 0),
        }))
      : [];

    const pdfBytes = await buildInvoicePdf({
      org: {
        id: String(org.id ?? orgId),
        name: typeof org.name === "string" ? org.name : "Organization",
        slug: typeof org.slug === "string" ? org.slug : undefined,
        base_currency: typeof org.base_currency === "string" ? org.base_currency : undefined,
        dashboard_logo_url:
          typeof org.dashboard_logo_url === "string" ? org.dashboard_logo_url : undefined,
        invoice_company_name:
          typeof org.invoice_company_name === "string" ? org.invoice_company_name : undefined,
        invoice_company_address:
          typeof org.invoice_company_address === "string" ? org.invoice_company_address : undefined,
        invoice_company_phone:
          typeof org.invoice_company_phone === "string" ? org.invoice_company_phone : undefined,
        invoice_company_email:
          typeof org.invoice_company_email === "string" ? org.invoice_company_email : undefined,
        invoice_company_tax_id:
          typeof org.invoice_company_tax_id === "string" ? org.invoice_company_tax_id : undefined,
        invoice_logo_url:
          typeof org.invoice_logo_url === "string" ? org.invoice_logo_url : undefined,
      },
      customer: {
        id: typeof invoice.customer_id === "string" ? invoice.customer_id : "",
        name: typeof invoice.customer_name === "string" ? invoice.customer_name : null,
        email: typeof invoice.customer_email === "string" ? invoice.customer_email : null,
        phone: typeof invoice.customer_phone === "string" ? invoice.customer_phone : null,
        billing_address:
          typeof invoice.customer_billing_address === "string"
            ? invoice.customer_billing_address
            : null,
        tax_id: typeof invoice.customer_tax_id === "string" ? invoice.customer_tax_id : null,
      },
      invoice: {
        id: String(invoice.id ?? invoiceId),
        invoice_no: (invoice.invoice_no as string | null | undefined) ?? null,
        invoice_date: (invoice.invoice_date as string | null | undefined) ?? null,
        due_date: (invoice.due_date as string | null | undefined) ?? null,
        status: (invoice.status as string | null | undefined) ?? "draft",
        currency_code: (invoice.currency_code as string | null | undefined) ?? "USD",
        tax_rate: Number(invoice.tax_rate ?? 0),
        subtotal: Number(invoice.subtotal ?? 0),
        tax_total: Number(invoice.tax_total ?? 0),
        total: Number(invoice.total ?? 0),
        notes: (invoice.notes as string | null | undefined) ?? null,
      },
      lines,
      generatedAt: new Date(),
    });

    const invoiceNo = getInvoiceDisplayNumber(
      (invoice.invoice_no as string | null | undefined) ?? null,
      String(invoice.id ?? invoiceId)
    );
    const filename = `${safeFileNamePart(invoiceNo)}.pdf`;

    return new NextResponse(pdfBytes as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invoice PDF generation failed.";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}

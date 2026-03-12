import { NextResponse } from "next/server";
import { getInvoiceDisplayNumber } from "@/lib/accounting/invoice-number";
import { getPublicInvoiceDocumentByToken } from "@/lib/data/receipts.data";
import { buildInvoicePdf } from "@/lib/pdf/invoice-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeFileNamePart(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^_+|_+$/g, "") || "invoice";
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;
  const document = await getPublicInvoiceDocumentByToken(token);
  if (!document) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }

  const invoice = document.invoice as Record<string, unknown>;
  const org = (document.org ?? {}) as Record<string, unknown>;
  const customer = (document.customer ?? {}) as Record<string, unknown>;
  const lines = Array.isArray(invoice.invoice_lines)
    ? (invoice.invoice_lines as Array<Record<string, unknown>>).map((line) => ({
        id: typeof line.id === "string" ? line.id : undefined,
        line_no: Number(line.line_no ?? 0),
        description: typeof line.description === "string" ? line.description : "",
        quantity: Number(line.quantity ?? 0),
        unit_price: Number(line.unit_price ?? 0),
        tax_amount: Number(line.tax_amount ?? 0),
        line_total: Number(line.line_total ?? 0),
      }))
    : [];

  const pdfBytes = await buildInvoicePdf({
    org: {
      id: String(org.id ?? invoice.org_id ?? ""),
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
      id: typeof customer.id === "string" ? customer.id : "",
      name: typeof customer.name === "string" ? customer.name : null,
      email: typeof customer.email === "string" ? customer.email : null,
      phone: typeof customer.phone === "string" ? customer.phone : null,
      billing_address:
        typeof customer.billing_address === "string" ? customer.billing_address : null,
      tax_id: typeof customer.tax_id === "string" ? customer.tax_id : null,
    },
    invoice: {
      id: String(invoice.id ?? ""),
      invoice_no: typeof invoice.invoice_no === "string" ? invoice.invoice_no : null,
      invoice_date: typeof invoice.invoice_date === "string" ? invoice.invoice_date : null,
      due_date: typeof invoice.due_date === "string" ? invoice.due_date : null,
      status: typeof invoice.status === "string" ? invoice.status : "draft",
      currency_code: typeof invoice.currency_code === "string" ? invoice.currency_code : "GHS",
      tax_rate: Number(invoice.tax_rate ?? 0),
      subtotal: Number(invoice.subtotal ?? 0),
      tax_total: Number(invoice.tax_total ?? 0),
      total: Number(invoice.total ?? 0),
      notes: typeof invoice.notes === "string" ? invoice.notes : null,
    },
    lines,
    generatedAt: new Date(),
  });

  const filename = `${safeFileNamePart(
    getInvoiceDisplayNumber(
      typeof invoice.invoice_no === "string" ? invoice.invoice_no : null,
      typeof invoice.id === "string" ? invoice.id : null
    )
  )}.pdf`;
  return new NextResponse(pdfBytes as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}

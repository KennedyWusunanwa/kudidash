import { NextResponse } from "next/server";
import { getPublicReceiptDocumentByToken } from "@/lib/data/receipts.data";
import { buildReceiptPdf } from "@/lib/pdf/receipt-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeFileNamePart(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^_+|_+$/g, "") || "receipt";
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;
  const document = await getPublicReceiptDocumentByToken(token);
  if (!document) {
    return NextResponse.json({ error: "Receipt not found." }, { status: 404 });
  }

  const receipt = document.receipt as Record<string, unknown>;
  const org = (document.org ?? {}) as Record<string, unknown>;
  const customer = (document.customer ?? {}) as Record<string, unknown>;
  const allocations = Array.isArray(document.allocations)
    ? (document.allocations as Array<Record<string, unknown>>).map((allocation) => {
        const invoice = (allocation.invoice ?? null) as Record<string, unknown> | null;
        return {
          amount_allocated: Number(allocation.amount_allocated ?? 0),
          invoice: invoice
            ? {
                invoice_no: typeof invoice.invoice_no === "string" ? invoice.invoice_no : null,
                invoice_date:
                  typeof invoice.invoice_date === "string" ? invoice.invoice_date : null,
                due_date: typeof invoice.due_date === "string" ? invoice.due_date : null,
                total: Number(invoice.total ?? 0),
                currency_code:
                  typeof invoice.currency_code === "string" ? invoice.currency_code : null,
              }
            : null,
        };
      })
    : [];

  const pdfBytes = await buildReceiptPdf({
    org: {
      name: typeof org.name === "string" ? org.name : "Organization",
      slug: typeof org.slug === "string" ? org.slug : undefined,
      base_currency: typeof org.base_currency === "string" ? org.base_currency : undefined,
      invoice_company_name:
        typeof org.invoice_company_name === "string" ? org.invoice_company_name : undefined,
      invoice_company_address:
        typeof org.invoice_company_address === "string" ? org.invoice_company_address : undefined,
      invoice_company_phone:
        typeof org.invoice_company_phone === "string" ? org.invoice_company_phone : undefined,
      invoice_company_email:
        typeof org.invoice_company_email === "string" ? org.invoice_company_email : undefined,
    },
    customer: {
      name: typeof customer.name === "string" ? customer.name : null,
      email: typeof customer.email === "string" ? customer.email : null,
      phone: typeof customer.phone === "string" ? customer.phone : null,
      billing_address:
        typeof customer.billing_address === "string" ? customer.billing_address : null,
      tax_id: typeof customer.tax_id === "string" ? customer.tax_id : null,
    },
    receipt: {
      id: String(receipt.id ?? ""),
      receipt_no: typeof receipt.receipt_no === "string" ? receipt.receipt_no : null,
      receipt_date: typeof receipt.receipt_date === "string" ? receipt.receipt_date : null,
      amount: Number(receipt.amount ?? 0),
      currency_code: typeof receipt.currency_code === "string" ? receipt.currency_code : null,
      payment_method:
        typeof receipt.payment_method === "string" ? receipt.payment_method : null,
      reference: typeof receipt.reference === "string" ? receipt.reference : null,
      notes: typeof receipt.notes === "string" ? receipt.notes : null,
      status: typeof receipt.status === "string" ? receipt.status : "verified",
    },
    allocations,
  });

  const filename = `${safeFileNamePart(String(receipt.receipt_no ?? receipt.id ?? "receipt"))}.pdf`;
  return new NextResponse(pdfBytes as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { DEFAULT_CURRENCY_CODE } from "@/lib/currencies";

type ReceiptLike = {
  id: string;
  receipt_no?: string | null;
  receipt_date?: string | null;
  amount?: number | null;
  currency_code?: string | null;
  payment_method?: string | null;
  reference?: string | null;
  notes?: string | null;
  status?: string | null;
};

type CustomerLike = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  billing_address?: string | null;
  tax_id?: string | null;
};

type OrganizationLike = {
  name?: string | null;
  slug?: string | null;
  base_currency?: string | null;
  invoice_company_name?: string | null;
  invoice_company_address?: string | null;
  invoice_company_phone?: string | null;
  invoice_company_email?: string | null;
};

type AllocationLike = {
  amount_allocated?: number | null;
  invoice?: {
    invoice_no?: string | null;
    invoice_date?: string | null;
    due_date?: string | null;
    total?: number | null;
    currency_code?: string | null;
  } | null;
};

export async function buildReceiptPdf({
  org,
  customer,
  receipt,
  allocations,
}: {
  org: OrganizationLike;
  customer?: CustomerLike | null;
  receipt: ReceiptLike;
  allocations: AllocationLike[];
}) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const text = rgb(0.14, 0.16, 0.19);
  const muted = rgb(0.42, 0.45, 0.49);
  const rule = rgb(0.82, 0.83, 0.86);

  const currency = receipt.currency_code || org.base_currency || DEFAULT_CURRENCY_CODE;
  const formatCurrency = (value: number | null | undefined, code = currency) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code || DEFAULT_CURRENCY_CODE,
      maximumFractionDigits: 2,
    }).format(value ?? 0);
  const formatDate = (value: string | null | undefined) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(date);
  };

  const drawLine = (y: number) => {
    page.drawLine({
      start: { x: 44, y },
      end: { x: 551, y },
      thickness: 1,
      color: rule,
    });
  };
  const drawLabelValue = (label: string, value: string, x: number, y: number) => {
    page.drawText(label, { x, y, font: regular, size: 10, color: muted });
    page.drawText(value || "-", { x, y: y - 14, font: bold, size: 11, color: text });
  };

  const companyName = org.invoice_company_name?.trim() || org.name || "Organization";
  page.drawText(companyName, { x: 44, y: 780, font: bold, size: 20, color: text });
  page.drawText("RECEIPT", { x: 44, y: 744, font: bold, size: 28, color: text });
  drawLine(732);

  drawLabelValue("Receipt number", receipt.receipt_no || receipt.id, 44, 704);
  drawLabelValue("Receipt date", formatDate(receipt.receipt_date), 220, 704);
  drawLabelValue("Status", String(receipt.status ?? "verified"), 396, 704);

  drawLabelValue("Customer", customer?.name || "Customer", 44, 648);
  drawLabelValue("Amount received", formatCurrency(receipt.amount, currency), 396, 648);

  let customerY = 606;
  for (const line of [
    customer?.email,
    customer?.phone,
    ...(customer?.billing_address ? String(customer.billing_address).split(/\r?\n/) : []),
    customer?.tax_id ? `Tax ID: ${customer.tax_id}` : null,
  ].filter(Boolean) as string[]) {
    page.drawText(line, { x: 44, y: customerY, font: regular, size: 10.5, color: text });
    customerY -= 14;
  }

  const metaLines = [
    org.invoice_company_address,
    org.invoice_company_phone ? `Phone: ${org.invoice_company_phone}` : null,
    org.invoice_company_email ? `Email: ${org.invoice_company_email}` : null,
  ].filter(Boolean) as string[];
  let orgY = 606;
  for (const line of metaLines) {
    page.drawText(line, { x: 320, y: orgY, font: regular, size: 10.5, color: text });
    orgY -= 14;
  }

  drawLine(560);
  page.drawText("Applied invoices", { x: 44, y: 534, font: bold, size: 12, color: text });

  let tableY = 508;
  page.drawRectangle({ x: 44, y: tableY, width: 507, height: 24, color: rgb(0.95, 0.95, 0.96) });
  page.drawText("Invoice", { x: 52, y: tableY + 8, font: bold, size: 10, color: text });
  page.drawText("Invoice date", { x: 220, y: tableY + 8, font: bold, size: 10, color: text });
  page.drawText("Invoice total", { x: 340, y: tableY + 8, font: bold, size: 10, color: text });
  page.drawText("Allocated", { x: 460, y: tableY + 8, font: bold, size: 10, color: text });

  tableY -= 26;
  for (const allocation of allocations.length ? allocations : [{ amount_allocated: receipt.amount, invoice: null }]) {
    const invoice = allocation.invoice;
    page.drawText(invoice?.invoice_no || "-", { x: 52, y: tableY, font: regular, size: 10, color: text });
    page.drawText(formatDate(invoice?.invoice_date), { x: 220, y: tableY, font: regular, size: 10, color: text });
    page.drawText(
      formatCurrency(invoice?.total, invoice?.currency_code || currency),
      { x: 340, y: tableY, font: regular, size: 10, color: text }
    );
    page.drawText(formatCurrency(allocation.amount_allocated, invoice?.currency_code || currency), {
      x: 460,
      y: tableY,
      font: bold,
      size: 10,
      color: text,
    });
    tableY -= 18;
  }

  drawLine(tableY - 10);
  tableY -= 40;

  for (const [label, value] of [
    ["Payment method", receipt.payment_method || "-"],
    ["Reference", receipt.reference || "-"],
    ["Notes", receipt.notes || "-"],
  ] as const) {
    page.drawText(`${label}:`, { x: 44, y: tableY, font: bold, size: 10.5, color: text });
    page.drawText(value, { x: 140, y: tableY, font: regular, size: 10.5, color: text });
    tableY -= 18;
  }

  page.drawText("Generated by KudiDash", { x: 44, y: 32, font: regular, size: 9, color: muted });

  return pdf.save();
}

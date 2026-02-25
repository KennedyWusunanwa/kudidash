import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from "pdf-lib";

type InvoiceLineLike = {
  id?: string;
  line_no?: number;
  description?: string | null;
  quantity?: number;
  unit_price?: number;
  tax_amount?: number;
  line_total?: number;
};

type InvoiceLike = {
  id: string;
  invoice_no?: string | null;
  invoice_date?: string | null;
  due_date?: string | null;
  status?: string | null;
  currency_code?: string | null;
  subtotal?: number | null;
  tax_total?: number | null;
  total?: number | null;
  notes?: string | null;
};

type CustomerLike = {
  id?: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  billing_address?: string | null;
  tax_id?: string | null;
};

type OrganizationLike = {
  id: string;
  name?: string | null;
  slug?: string | null;
  base_currency?: string | null;
  dashboard_logo_url?: string | null;
  invoice_company_name?: string | null;
  invoice_company_address?: string | null;
  invoice_company_phone?: string | null;
  invoice_company_email?: string | null;
  invoice_company_tax_id?: string | null;
  invoice_logo_url?: string | null;
};

export interface InvoicePdfPayload {
  org: OrganizationLike;
  customer?: CustomerLike | null;
  invoice: InvoiceLike;
  lines: InvoiceLineLike[];
  generatedAt?: Date;
}

const PAGE = { width: 595.28, height: 841.89 }; // A4 portrait (pt)
const MARGIN = 44;

function currencyFmt(value: number | null | undefined, currency = "GHS") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value ?? 0);
}

function dateFmt(value: string | null | undefined) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(d);
}

function numberFmt(value: number | null | undefined) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value ?? 0);
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = (text || "").split(/\s+/).filter(Boolean);
  if (!words.length) return [""];

  const lines: string[] = [];
  let current = words[0];
  for (let i = 1; i < words.length; i += 1) {
    const next = `${current} ${words[i]}`;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      current = next;
    } else {
      lines.push(current);
      current = words[i];
    }
  }
  lines.push(current);
  return lines;
}

function detectImageType(bytes: Uint8Array) {
  const isPng =
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a;

  if (isPng) return "png" as const;

  const isJpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (isJpeg) return "jpg" as const;

  return null;
}

async function embedOptionalLogo(pdf: PDFDocument, logoRef?: string | null): Promise<PDFImage | null> {
  const source = logoRef?.trim();
  if (!source) return null;

  try {
    let bytes: Uint8Array;
    let imageType: "png" | "jpg" | null = null;

    if (/^data:/i.test(source)) {
      const match = source.match(/^data:(image\/(?:png|jpe?g));base64,([\s\S]+)$/i);
      if (!match) return null;
      bytes = Buffer.from(match[2], "base64");
      imageType = match[1].toLowerCase().includes("png") ? "png" : "jpg";
    } else {
      const response = await fetch(source);
      if (!response.ok) return null;
      bytes = new Uint8Array(await response.arrayBuffer());

      const contentType = (response.headers.get("content-type") || "").toLowerCase();
      if (contentType.includes("png")) imageType = "png";
      if (contentType.includes("jpeg") || contentType.includes("jpg")) imageType = "jpg";
      imageType ||= detectImageType(bytes);
    }

    if (!imageType) return null;
    return imageType === "png" ? pdf.embedPng(bytes) : pdf.embedJpg(bytes);
  } catch {
    return null;
  }
}

function pushMultiline(target: string[], value?: string | null) {
  if (!value) return;
  for (const part of String(value).split(/\r?\n/)) {
    const trimmed = part.trim();
    if (trimmed) target.push(trimmed);
  }
}

export async function buildInvoicePdf(payload: InvoicePdfPayload) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const companyName = payload.org.invoice_company_name?.trim() || payload.org.name || "Organization";
  const logoImage = await embedOptionalLogo(
    pdf,
    payload.org.invoice_logo_url || payload.org.dashboard_logo_url || null
  );

  const brand = rgb(0.12, 0.27, 0.5);
  const text = rgb(0.12, 0.12, 0.12);
  const muted = rgb(0.45, 0.45, 0.45);
  const border = rgb(0.86, 0.88, 0.91);
  const headerBg = rgb(0.95, 0.97, 0.99);

  let page = pdf.addPage([PAGE.width, PAGE.height]);
  let y = PAGE.height - MARGIN;

  const newPage = () => {
    page = pdf.addPage([PAGE.width, PAGE.height]);
    y = PAGE.height - MARGIN;
    drawPageHeader(false);
  };

  const ensureSpace = (needed: number) => {
    if (y - needed < MARGIN) newPage();
  };

  const drawLabelValue = (
    label: string,
    value: string,
    x: number,
    yy: number,
    width: number
  ) => {
    page.drawText(label, {
      x,
      y: yy,
      font,
      size: 9,
      color: muted,
    });
    const valueLines = wrapText(value || "-", font, 10, width);
    let localY = yy - 13;
    for (const line of valueLines) {
      page.drawText(line, { x, y: localY, font, size: 10, color: text });
      localY -= 12;
    }
    return localY;
  };

  const drawPageHeader = (isFirstPage: boolean) => {
    if (isFirstPage) {
      let titleX = MARGIN;
      if (logoImage) {
        const scaled = logoImage.scale(1);
        const maxWidth = 96;
        const maxHeight = 42;
        const scale = Math.min(maxWidth / scaled.width, maxHeight / scaled.height, 1);
        const width = scaled.width * scale;
        const height = scaled.height * scale;

        page.drawImage(logoImage, {
          x: MARGIN,
          y: y - height + 8,
          width,
          height,
        });
        titleX += width + 12;
      }

      page.drawText("INVOICE", {
        x: titleX,
        y,
        font: bold,
        size: 22,
        color: brand,
      });
      page.drawText(companyName, {
        x: PAGE.width - MARGIN - 220,
        y: y + 2,
        font: bold,
        size: 12,
        color: text,
      });
      page.drawText(`Org ID: ${payload.org.id}`, {
        x: PAGE.width - MARGIN - 220,
        y: y - 13,
        font,
        size: 9,
        color: muted,
      });
      y -= 34;
    } else {
      page.drawText(companyName, {
        x: MARGIN,
        y,
        font: bold,
        size: 11,
        color: text,
      });
      page.drawText(
        `Invoice ${payload.invoice.invoice_no || payload.invoice.id.slice(0, 8)} (continued)`,
        {
          x: PAGE.width - MARGIN - 220,
          y,
          font,
          size: 9,
          color: muted,
        }
      );
      y -= 20;
    }
  };

  const drawFooter = (p: PDFPage) => {
    p.drawLine({
      start: { x: MARGIN, y: MARGIN - 6 },
      end: { x: PAGE.width - MARGIN, y: MARGIN - 6 },
      thickness: 1,
      color: border,
    });
    const generated = payload.generatedAt ?? new Date();
    p.drawText(
      `Generated ${new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(generated)}`,
      { x: MARGIN, y: MARGIN - 22, font, size: 8, color: muted }
    );
    p.drawText("Configure payment instructions in organization invoice settings", {
      x: PAGE.width - MARGIN - 215,
      y: MARGIN - 22,
      font,
      size: 8,
      color: muted,
    });
  };

  drawPageHeader(true);

  // Metadata panel
  ensureSpace(110);
  page.drawRectangle({
    x: MARGIN,
    y: y - 92,
    width: PAGE.width - MARGIN * 2,
    height: 92,
    borderColor: border,
    borderWidth: 1,
    color: rgb(1, 1, 1),
  });

  const metaTop = y - 16;
  const leftX = MARGIN + 14;
  const midX = MARGIN + (PAGE.width - MARGIN * 2) / 2 + 6;
  drawLabelValue(
    "Invoice Number",
    payload.invoice.invoice_no || payload.invoice.id,
    leftX,
    metaTop,
    220
  );
  drawLabelValue("Status", (payload.invoice.status || "draft").toUpperCase(), leftX, metaTop - 35, 220);
  drawLabelValue("Invoice Date", dateFmt(payload.invoice.invoice_date || null), midX, metaTop, 180);
  drawLabelValue("Due Date", dateFmt(payload.invoice.due_date || null), midX, metaTop - 35, 180);
  y -= 108;

  // Bill-to and issuer blocks
  const partyBoxHeight = 154;
  ensureSpace(partyBoxHeight + 22);
  const boxWidth = (PAGE.width - MARGIN * 2 - 12) / 2;
  page.drawRectangle({
    x: MARGIN,
    y: y - partyBoxHeight,
    width: boxWidth,
    height: partyBoxHeight,
    borderColor: border,
    borderWidth: 1,
    color: rgb(1, 1, 1),
  });
  page.drawRectangle({
    x: MARGIN + boxWidth + 12,
    y: y - partyBoxHeight,
    width: boxWidth,
    height: partyBoxHeight,
    borderColor: border,
    borderWidth: 1,
    color: rgb(1, 1, 1),
  });
  page.drawText("Bill To", {
    x: MARGIN + 12,
    y: y - 16,
    font: bold,
    size: 11,
    color: brand,
  });
  page.drawText("From", {
    x: MARGIN + boxWidth + 24,
    y: y - 16,
    font: bold,
    size: 11,
    color: brand,
  });

  let leftY = y - 34;
  const customer = payload.customer ?? null;
  const customerLines: string[] = [customer?.name || "Customer"];
  pushMultiline(customerLines, customer?.email || null);
  pushMultiline(customerLines, customer?.phone || null);
  pushMultiline(customerLines, customer?.billing_address || null);
  pushMultiline(customerLines, customer?.tax_id ? `Tax ID: ${customer.tax_id}` : null);
  for (const line of customerLines) {
    for (const wrapped of wrapText(line, font, 10, boxWidth - 24)) {
      page.drawText(wrapped, { x: MARGIN + 12, y: leftY, font, size: 10, color: text });
      leftY -= 12;
    }
  }

  let rightY = y - 34;
  const issuerLines: string[] = [companyName];
  pushMultiline(issuerLines, payload.org.invoice_company_address || null);
  pushMultiline(
    issuerLines,
    payload.org.invoice_company_phone ? `Phone: ${payload.org.invoice_company_phone}` : null
  );
  pushMultiline(
    issuerLines,
    payload.org.invoice_company_email ? `Email: ${payload.org.invoice_company_email}` : null
  );
  pushMultiline(
    issuerLines,
    payload.org.invoice_company_tax_id ? `Tax ID: ${payload.org.invoice_company_tax_id}` : null
  );
  issuerLines.push(
    `Base Currency: ${payload.org.base_currency || payload.invoice.currency_code || "GHS"}`
  );
  if (!payload.org.invoice_company_address && payload.org.slug) {
    issuerLines.push(`Org: ${payload.org.slug}`);
  }

  for (const line of issuerLines) {
    for (const wrapped of wrapText(line, font, 10, boxWidth - 24)) {
      page.drawText(wrapped, {
        x: MARGIN + boxWidth + 24,
        y: rightY,
        font,
        size: 10,
        color: text,
      });
      rightY -= 12;
    }
  }
  y -= partyBoxHeight + 14;

  // Lines table
  const currency = payload.invoice.currency_code || payload.org.base_currency || "GHS";
  ensureSpace(44);
  const tableX = MARGIN;
  const tableWidth = PAGE.width - MARGIN * 2;
  const cols = {
    line: 28,
    desc: 220,
    qty: 62,
    unit: 88,
    tax: 72,
    total: tableWidth - (28 + 220 + 62 + 88 + 72),
  };

  const drawTableHeader = () => {
    ensureSpace(28);
    page.drawRectangle({
      x: tableX,
      y: y - 22,
      width: tableWidth,
      height: 22,
      borderColor: border,
      borderWidth: 1,
      color: headerBg,
    });
    let x = tableX + 6;
    const headers = [
      ["#", cols.line - 12],
      ["Description", cols.desc],
      ["Qty", cols.qty],
      ["Unit", cols.unit],
      ["Tax", cols.tax],
      ["Total", cols.total - 8],
    ] as const;
    for (const [label, width] of headers) {
      page.drawText(label, { x, y: y - 14, font: bold, size: 9, color: text });
      x += width;
    }
    y -= 22;
  };

  drawTableHeader();

  const lines = payload.lines.length
    ? payload.lines
    : [{ line_no: 1, description: "No invoice lines available", quantity: 0, unit_price: 0, tax_amount: 0, line_total: 0 }];

  for (const line of lines) {
    const descLines = wrapText(line.description || "-", font, 9, cols.desc - 8);
    const rowHeight = Math.max(18, descLines.length * 11 + 6);
    ensureSpace(rowHeight + 4);
    if (y - 4 < MARGIN + 110) {
      newPage();
      drawTableHeader();
    }

    page.drawRectangle({
      x: tableX,
      y: y - rowHeight,
      width: tableWidth,
      height: rowHeight,
      borderColor: border,
      borderWidth: 1,
      color: rgb(1, 1, 1),
    });

    let x = tableX + 6;
    page.drawText(String(line.line_no ?? ""), {
      x,
      y: y - 12,
      font,
      size: 9,
      color: text,
    });
    x += cols.line - 12;

    let descY = y - 12;
    for (const dLine of descLines) {
      page.drawText(dLine, { x, y: descY, font, size: 9, color: text });
      descY -= 11;
    }
    x += cols.desc;

    page.drawText(numberFmt(line.quantity), { x, y: y - 12, font, size: 9, color: text });
    x += cols.qty;

    page.drawText(currencyFmt(line.unit_price, currency), { x, y: y - 12, font, size: 9, color: text });
    x += cols.unit;

    page.drawText(currencyFmt(line.tax_amount, currency), { x, y: y - 12, font, size: 9, color: text });
    x += cols.tax;

    page.drawText(currencyFmt(line.line_total, currency), { x, y: y - 12, font, size: 9, color: text });
    y -= rowHeight;
  }

  y -= 12;

  // Totals + notes
  ensureSpace(150);
  const totalsWidth = 210;
  const totalsX = PAGE.width - MARGIN - totalsWidth;
  page.drawRectangle({
    x: totalsX,
    y: y - 72,
    width: totalsWidth,
    height: 72,
    borderColor: border,
    borderWidth: 1,
    color: rgb(1, 1, 1),
  });
  const totals = [
    ["Subtotal", currencyFmt(payload.invoice.subtotal, currency)],
    ["Tax", currencyFmt(payload.invoice.tax_total, currency)],
    ["Total", currencyFmt(payload.invoice.total, currency)],
  ] as const;
  let totalY = y - 16;
  for (const [label, value] of totals) {
    page.drawText(label, { x: totalsX + 10, y: totalY, font: label === "Total" ? bold : font, size: 10, color: text });
    page.drawText(value, { x: totalsX + 95, y: totalY, font: label === "Total" ? bold : font, size: 10, color: text });
    totalY -= 18;
  }

  const notesText = (payload.invoice.notes || "").trim();
  if (notesText) {
    const notesWidth = tableWidth - totalsWidth - 14;
    page.drawRectangle({
      x: tableX,
      y: y - 72,
      width: notesWidth,
      height: 72,
      borderColor: border,
      borderWidth: 1,
      color: rgb(1, 1, 1),
    });
    page.drawText("Notes", { x: tableX + 10, y: y - 16, font: bold, size: 10, color: brand });
    let noteY = y - 30;
    for (const line of wrapText(notesText, font, 9, notesWidth - 20).slice(0, 4)) {
      page.drawText(line, { x: tableX + 10, y: noteY, font, size: 9, color: text });
      noteY -= 11;
    }
  }
  y -= 84;

  // Summary / footer note
  ensureSpace(50);
  page.drawText(
    "Thank you for your business. This invoice was generated by KudiDash.",
    { x: MARGIN, y, font, size: 9, color: muted }
  );

  for (const p of pdf.getPages()) {
    drawFooter(p);
  }

  return pdf.save();
}

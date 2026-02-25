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

function parseDate(value: string | null | undefined) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function dueDateWithTerms(invoiceDate: string | null | undefined, dueDate: string | null | undefined) {
  const due = parseDate(dueDate);
  if (!due) return "-";
  const dueLabel = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(due);

  const inv = parseDate(invoiceDate);
  if (!inv) return dueLabel;

  const diffMs = due.getTime() - inv.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (Number.isFinite(diffDays) && diffDays > 0 && diffDays <= 3650) {
    return `${dueLabel} (Net ${diffDays})`;
  }

  return dueLabel;
}

function drawTextRight(
  page: PDFPage,
  value: string,
  rightX: number,
  y: number,
  font: PDFFont,
  size: number,
  color: ReturnType<typeof rgb>
) {
  const safe = value || "";
  const width = font.widthOfTextAtSize(safe, size);
  page.drawText(safe, { x: rightX - width, y, font, size, color });
}

function drawTextCenter(
  page: PDFPage,
  value: string,
  centerX: number,
  y: number,
  font: PDFFont,
  size: number,
  color: ReturnType<typeof rgb>
) {
  const safe = value || "";
  const width = font.widthOfTextAtSize(safe, size);
  page.drawText(safe, { x: centerX - width / 2, y, font, size, color });
}

function drawRule(
  page: PDFPage,
  x1: number,
  x2: number,
  y: number,
  color: ReturnType<typeof rgb>,
  thickness = 1
) {
  page.drawLine({
    start: { x: x1, y },
    end: { x: x2, y },
    thickness,
    color,
  });
}

function drawVRule(
  page: PDFPage,
  x: number,
  y1: number,
  y2: number,
  color: ReturnType<typeof rgb>,
  thickness = 1
) {
  page.drawLine({
    start: { x, y: y1 },
    end: { x, y: y2 },
    thickness,
    color,
  });
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

  const text = rgb(0.16, 0.17, 0.2);
  const muted = rgb(0.33, 0.35, 0.39);
  const rule = rgb(0.78, 0.79, 0.82);
  const tableHeaderFill = rgb(0.92, 0.92, 0.93);
  const headerTitle = rgb(0.14, 0.15, 0.18);

  const contentX = MARGIN;
  const contentWidth = PAGE.width - MARGIN * 2;
  const rightEdge = PAGE.width - MARGIN;
  const currency = payload.invoice.currency_code || payload.org.base_currency || "GHS";
  const invoiceDisplayNo = payload.invoice.invoice_no || payload.invoice.id;
  const statusLabel = (payload.invoice.status || "draft").replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

  const companyLines: string[] = [companyName];
  pushMultiline(companyLines, payload.org.invoice_company_address || null);
  if (payload.org.invoice_company_phone?.trim()) companyLines.push(`Phone: ${payload.org.invoice_company_phone.trim()}`);
  if (payload.org.invoice_company_email?.trim()) companyLines.push(`Email: ${payload.org.invoice_company_email.trim()}`);
  if (payload.org.invoice_company_tax_id?.trim()) companyLines.push(`Tax ID: ${payload.org.invoice_company_tax_id.trim()}`);
  if (companyLines.length === 1 && payload.org.slug) companyLines.push(`Org: ${payload.org.slug}`);

  const customer = payload.customer ?? null;
  const billToLines: string[] = [customer?.name?.trim() || "Customer"];
  if (customer?.email?.trim()) billToLines.push(customer.email.trim());
  if (customer?.phone?.trim()) billToLines.push(customer.phone.trim());
  pushMultiline(billToLines, customer?.billing_address || null);
  if (customer?.tax_id?.trim()) billToLines.push(`Tax ID: ${customer.tax_id.trim()}`);

  let page = pdf.addPage([PAGE.width, PAGE.height]);
  let y = PAGE.height - 42;

  const newPage = (forTableContinuation = false) => {
    page = pdf.addPage([PAGE.width, PAGE.height]);
    y = PAGE.height - 42;
    page.drawText(companyName, {
      x: contentX,
      y,
      font: bold,
      size: 12,
      color: text,
    });
    drawTextRight(
      page,
      `Invoice ${invoiceDisplayNo}${forTableContinuation ? " (continued)" : ""}`,
      rightEdge,
      y + 1,
      font,
      9,
      muted
    );
    y -= 14;
    drawRule(page, contentX, rightEdge, y, rule);
    y -= 18;
  };

  const ensureSpace = (needed: number, forTableContinuation = false) => {
    if (y - needed < 56) {
      newPage(forTableContinuation);
      return true;
    }
    return false;
  };

  const firstHeaderBottom = (() => {
    const topY = y;

    if (logoImage) {
      const dims = logoImage.scale(1);
      const maxWidth = 210;
      const maxHeight = 62;
      const scale = Math.min(maxWidth / dims.width, maxHeight / dims.height, 1);
      const width = dims.width * scale;
      const height = dims.height * scale;
      page.drawImage(logoImage, {
        x: contentX,
        y: topY - height + 8,
        width,
        height,
      });
    } else {
      page.drawText(companyName, {
        x: contentX,
        y: topY - 2,
        font: bold,
        size: 20,
        color: text,
      });
    }

    const headerLineY = topY - 52;
    drawRule(page, contentX, rightEdge, headerLineY, rule);
    drawTextCenter(page, "INVOICE", PAGE.width / 2, headerLineY - 44, bold, 28, headerTitle);
    const titleBottomLineY = headerLineY - 64;
    drawRule(page, contentX, rightEdge, titleBottomLineY, rule);
    return titleBottomLineY;
  })();

  y = firstHeaderBottom - 28;

  const columnGap = 22;
  const leftColX = contentX;
  const leftColWidth = 245;
  const rightColX = leftColX + leftColWidth + columnGap;
  const rightColWidth = rightEdge - rightColX;

  const drawCompanyBlock = () => {
    let localY = y;
    page.drawText(companyLines[0] || companyName, {
      x: leftColX,
      y: localY,
      font: bold,
      size: 14,
      color: text,
    });
    localY -= 22;

    const detailItems = companyLines.slice(1);
    if (!detailItems.length) {
      page.drawText(`Base Currency: ${payload.org.base_currency || currency}`, {
        x: leftColX,
        y: localY,
        font,
        size: 11,
        color: muted,
      });
      return y - localY + 14;
    }

    for (let i = 0; i < detailItems.length; i += 1) {
      const wrapped = wrapText(detailItems[i] || "-", font, 10.5, leftColWidth - 8);
      for (const line of wrapped) {
        page.drawText(line, { x: leftColX, y: localY, font, size: 10.5, color: text });
        localY -= 13;
      }
      if (i < detailItems.length - 1) {
        drawRule(page, leftColX, leftColX + leftColWidth - 4, localY + 2, rule);
        localY -= 10;
      }
    }
    return y - localY + 4;
  };

  const drawMetaBlock = () => {
    const labelWidth = 86;
    let localY = y + 2;
    const rows = [
      { label: "Invoice Number:", value: invoiceDisplayNo, valueBold: false },
      { label: "Invoice Date:", value: dateFmt(payload.invoice.invoice_date || null), valueBold: false },
      { label: "Due Date:", value: dueDateWithTerms(payload.invoice.invoice_date || null, payload.invoice.due_date || null), valueBold: false },
      { label: "Status:", value: statusLabel, valueBold: true },
    ] as const;

    for (const row of rows) {
      const valueFont = row.valueBold ? bold : font;
      const valueLines = wrapText(row.value || "-", valueFont, 10.5, rightColWidth - labelWidth - 10);
      const rowHeight = Math.max(28, valueLines.length * 13 + 8);
      page.drawText(row.label, {
        x: rightColX,
        y: localY - 18,
        font,
        size: 10.5,
        color: muted,
      });
      let valueY = localY - 18;
      for (const valueLine of valueLines) {
        page.drawText(valueLine, {
          x: rightColX + labelWidth,
          y: valueY,
          font: valueFont,
          size: 10.5,
          color: text,
        });
        valueY -= 13;
      }
      drawRule(page, rightColX, rightEdge, localY - rowHeight, rule);
      localY -= rowHeight;
    }

    return y - localY + 2;
  };

  const companyBlockHeight = drawCompanyBlock();
  const metaBlockHeight = drawMetaBlock();
  y -= Math.max(companyBlockHeight, metaBlockHeight) + 24;

  drawRule(page, contentX, rightEdge, y, rule);
  y -= 34;

  page.drawText("Bill To:", {
    x: contentX,
    y,
    font: bold,
    size: 12,
    color: text,
  });
  y -= 26;

  for (let i = 0; i < billToLines.length; i += 1) {
    const line = billToLines[i] || "-";
    const wrapped = wrapText(line, i === 0 ? bold : font, i === 0 ? 12 : 10.5, 260);
    for (const part of wrapped) {
      page.drawText(part, {
        x: contentX,
        y,
        font: i === 0 ? bold : font,
        size: i === 0 ? 12 : 10.5,
        color: text,
      });
      y -= i === 0 ? 14 : 13;
    }
  }

  y -= 18;

  const tableX = contentX;
  const tableWidth = contentWidth;
  const tableCols = {
    line: 34,
    desc: 214,
    qty: 54,
    unit: 88,
    tax: 64,
    total: tableWidth - (34 + 214 + 54 + 88 + 64),
  };
  type TableColKey = keyof typeof tableCols;

  const headerHeight = 24;
  const tableHeaders = [
    { key: "line", label: "#", align: "left" as const },
    { key: "desc", label: "Description", align: "left" as const },
    { key: "qty", label: "Qty", align: "right" as const },
    { key: "unit", label: "Unit Price", align: "right" as const },
    { key: "tax", label: "Tax", align: "right" as const },
    { key: "total", label: "Total", align: "right" as const },
  ] satisfies Array<{ key: TableColKey; label: string; align: "left" | "right" }>;

  const drawTableFrameVerticals = (topY: number, height: number) => {
    let offset = 0;
    for (const width of Object.values(tableCols)) {
      drawVRule(page, tableX + offset, topY, topY - height, rule);
      offset += width;
    }
    drawVRule(page, tableX + tableWidth, topY, topY - height, rule);
  };

  const drawTableHeader = () => {
    page.drawRectangle({
      x: tableX,
      y: y - headerHeight,
      width: tableWidth,
      height: headerHeight,
      color: tableHeaderFill,
      borderColor: rule,
      borderWidth: 1,
    });

    let colX = tableX;
    for (const header of tableHeaders) {
      const width = tableCols[header.key];
      if (header.align === "right") {
        drawTextRight(page, header.label, colX + width - 8, y - 16, bold, 10, text);
      } else {
        page.drawText(header.label, { x: colX + 8, y: y - 16, font: bold, size: 10, color: text });
      }
      colX += width;
    }

    drawTableFrameVerticals(y, headerHeight);
    y -= headerHeight;
  };

  ensureSpace(headerHeight + 30, true);
  drawTableHeader();

  const invoiceLines = payload.lines.length
    ? payload.lines
    : [
        {
          line_no: 1,
          description: "No invoice lines available",
          quantity: 0,
          unit_price: 0,
          tax_amount: 0,
          line_total: 0,
        },
      ];

  for (let index = 0; index < invoiceLines.length; index += 1) {
    const line = invoiceLines[index]!;
    const descLines = wrapText(line.description || "-", font, 10, tableCols.desc - 14);
    const rowHeight = Math.max(28, descLines.length * 12 + 10);

    if (y - rowHeight < 130) {
      newPage(true);
      drawTableHeader();
    }

    page.drawRectangle({
      x: tableX,
      y: y - rowHeight,
      width: tableWidth,
      height: rowHeight,
      borderColor: rule,
      borderWidth: 1,
      color: rgb(1, 1, 1),
    });

    drawTableFrameVerticals(y, rowHeight);

    let colX = tableX;
    page.drawText(String(line.line_no ?? index + 1), {
      x: colX + 8,
      y: y - 18,
      font,
      size: 10,
      color: text,
    });
    colX += tableCols.line;

    let descY = y - 18;
    for (const dLine of descLines) {
      page.drawText(dLine, { x: colX + 8, y: descY, font, size: 10, color: text });
      descY -= 12;
    }
    colX += tableCols.desc;

    drawTextRight(page, numberFmt(line.quantity), colX + tableCols.qty - 8, y - 18, font, 10, text);
    colX += tableCols.qty;
    drawTextRight(page, currencyFmt(line.unit_price, currency), colX + tableCols.unit - 8, y - 18, font, 10, text);
    colX += tableCols.unit;
    drawTextRight(page, currencyFmt(line.tax_amount, currency), colX + tableCols.tax - 8, y - 18, font, 10, text);
    colX += tableCols.tax;
    drawTextRight(page, currencyFmt(line.line_total, currency), colX + tableCols.total - 8, y - 18, bold, 10, text);

    y -= rowHeight;
  }

  y -= 16;

  const totalsWidth = 170;
  const totalsX = rightEdge - totalsWidth;
  const totalsRows = [
    { label: "Subtotal:", value: currencyFmt(payload.invoice.subtotal, currency), isTotal: false },
    { label: "Tax:", value: currencyFmt(payload.invoice.tax_total, currency), isTotal: false },
    { label: "Total:", value: currencyFmt(payload.invoice.total, currency), isTotal: true },
  ] as const;
  const totalsHeight = 108;
  const notesAreaWidth = totalsX - contentX - 18;

  if (y - Math.max(totalsHeight, 90) < 90) {
    newPage(false);
  }

  let totalsTop = y;
  drawRule(page, totalsX, rightEdge, totalsTop, rule);

  let totalsY = totalsTop - 20;
  for (const row of totalsRows) {
    const rowHeight = row.isTotal ? 34 : 24;
    page.drawText(row.label, {
      x: totalsX + 6,
      y: totalsY,
      font: row.isTotal ? bold : font,
      size: row.isTotal ? 11.5 : 10.5,
      color: text,
    });
    drawTextRight(
      page,
      row.value,
      rightEdge - 8,
      totalsY,
      row.isTotal ? bold : font,
      row.isTotal ? 11.5 : 10.5,
      text
    );
    drawRule(page, totalsX, rightEdge, totalsY - (row.isTotal ? 10 : 8), rule);
    totalsY -= rowHeight;
  }

  const paymentTerms = (payload.invoice.notes || "").trim() || "Due upon receipt.";
  const paymentTermLines = wrapText(paymentTerms, font, 10.5, Math.max(120, notesAreaWidth - 94));
  let leftInfoY = y - 6;

  if (notesAreaWidth > 150) {
    page.drawText("Payment Terms:", {
      x: contentX,
      y: leftInfoY - 14,
      font: bold,
      size: 10.5,
      color: text,
    });
    let textY = leftInfoY - 14;
    const labelWidth = bold.widthOfTextAtSize("Payment Terms:", 10.5) + 6;
    for (let i = 0; i < paymentTermLines.length; i += 1) {
      page.drawText(paymentTermLines[i] || "", {
        x: i === 0 ? contentX + labelWidth : contentX,
        y: textY,
        font,
        size: 10.5,
        color: text,
      });
      textY -= 13;
    }
    leftInfoY = Math.min(textY, totalsY + 24);
  }

  y = Math.min(leftInfoY, totalsY + 12) - 28;
  if (y < 95) {
    newPage(false);
    y -= 6;
  }

  drawRule(page, contentX, rightEdge, y, rule);
  y -= 36;

  page.drawText("Thank you for your business.", {
    x: contentX,
    y,
    font,
    size: 11,
    color: text,
  });

  y -= 16;
  page.drawText("Generated by KudiDash", {
    x: contentX,
    y,
    font,
    size: 9,
    color: muted,
  });

  const pages = pdf.getPages();
  if (pages.length > 1) {
    for (let i = 0; i < pages.length; i += 1) {
      const p = pages[i]!;
      drawTextRight(p, `Page ${i + 1} of ${pages.length}`, rightEdge, 24, font, 8, muted);
    }
  }

  return pdf.save();
}

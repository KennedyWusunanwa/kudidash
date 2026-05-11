import ExcelJS from "exceljs";
import { format } from "date-fns";
import { getCatalogItemBySku, getProductImagePublicUrl } from "@/lib/inventory/catalog";

export interface InventoryExportRow {
  id: string;
  sku: string;
  name: string;
  org_id: string;
  sale_price?: number | null;
  purchase_price?: number | null;
  quantity_on_hand?: number | null;
  is_active?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
}

const columns = [
  { header: "Image", key: "image", width: 20 },
  { header: "SKU", key: "sku", width: 18 },
  { header: "Product Name", key: "name", width: 36 },
  { header: "Brand", key: "brand", width: 20 },
  { header: "Category", key: "category", width: 22 },
  { header: "Sub-Category", key: "subCategory", width: 22 },
  { header: "Description", key: "description", width: 55 },
  { header: "Size / Weight", key: "sizeWeight", width: 18 },
  { header: "Unit Type", key: "unitType", width: 16 },
  { header: "Units / Case", key: "unitsPerCase", width: 13 },
  { header: "Qty In Stock", key: "quantityOnHand", width: 14 },
  { header: "Reorder Level", key: "reorderLevel", width: 14 },
  { header: "Unit Cost ($)", key: "unitCost", width: 14 },
  { header: "Retail Price ($)", key: "retailPrice", width: 15 },
  { header: "Wholesale Price ($)", key: "wholesalePrice", width: 17 },
  { header: "Margin %", key: "marginPercent", width: 12 },
  { header: "Barcode / UPC", key: "barcode", width: 20 },
  { header: "Supplier", key: "supplier", width: 30 },
  { header: "Country of Origin", key: "countryOfOrigin", width: 20 },
  { header: "Storage Location", key: "storageLocation", width: 20 },
  { header: "Storage Conditions", key: "storageConditions", width: 25 },
  { header: "MFG Date", key: "mfgDate", width: 14 },
  { header: "Expiry / BB Date", key: "expiryDate", width: 16 },
  { header: "Date Added", key: "dateAdded", width: 14 },
  { header: "Last Updated", key: "lastUpdated", width: 14 },
  { header: "Status", key: "status", width: 14 },
  { header: "Notes", key: "notes", width: 50 },
] as const;

function getExcelColumnName(columnNumber: number) {
  let name = "";
  let current = columnNumber;
  while (current > 0) {
    const remainder = (current - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    current = Math.floor((current - 1) / 26);
  }
  return name;
}

function formatDateCell(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return format(date, "yyyy-MM-dd");
}

function parseUnitsPerCase(value: string) {
  if (!value.trim()) return "";
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : value;
}

async function fetchImageBuffer(url: string) {
  const response = await fetch(url);
  if (!response.ok) return null;
  const bytes = await response.arrayBuffer();
  return Buffer.from(bytes) as any;
}

export async function buildInventoryWorkbook(rows: InventoryExportRow[]) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Inventory", {
    views: [{ state: "frozen", xSplit: 1, ySplit: 3, showGridLines: false }],
  });
  const today = format(new Date(), "yyyy-MM-dd");
  const lastColumn = getExcelColumnName(columns.length);

  worksheet.mergeCells(`A1:${lastColumn}1`);
  worksheet.getCell("A1").value = "PRODUCT INVENTORY";
  worksheet.getCell("A1").font = { bold: true, size: 18, color: { argb: "FFFFFFFF" } };
  worksheet.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
  worksheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F3864" } };
  worksheet.getRow(1).height = 42;

  worksheet.mergeCells(`A2:${lastColumn}2`);
  worksheet.getCell("A2").value =
    `Date: ${today}     |     Total SKUs: ${rows.length}     |     Prices in USD     |     Fill yellow columns manually`;
  worksheet.getCell("A2").font = { size: 10, color: { argb: "FFFFFFFF" } };
  worksheet.getCell("A2").alignment = { horizontal: "center", vertical: "middle" };
  worksheet.getCell("A2").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2E75B6" } };
  worksheet.getRow(2).height = 22;

  columns.forEach((column, index) => {
    worksheet.getColumn(index + 1).width = column.width;
    const cell = worksheet.getCell(3, index + 1);
    cell.value = column.header;
    cell.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2E75B6" } };
    cell.border = {
      top: { style: "medium", color: { argb: "FF1A5276" } },
      left: { style: "medium", color: { argb: "FF1A5276" } },
      right: { style: "medium", color: { argb: "FF1A5276" } },
      bottom: { style: "medium", color: { argb: "FF1A5276" } },
    };
  });
  worksheet.getRow(3).height = 38;

  const manualEntryColumns = new Set([11, 12, 13, 14, 15, 16, 20, 22, 23, 26]);
  const imageTasks: Array<Promise<void>> = [];

  rows.forEach((row, index) => {
    const catalogItem = getCatalogItemBySku(row.sku);
    const rowNumber = index + 4;
    worksheet.getRow(rowNumber).height = 105;
    const alternateFill = index % 2 === 0 ? "FFFFFFFF" : "FFEBF3FB";
    const quantityOnHand = Number(row.quantity_on_hand ?? 0);
    const unitCost = Number(row.purchase_price ?? 0);
    const retailPrice = Number(row.sale_price ?? 0);
    const marginPercent =
      retailPrice > 0 ? Number((((retailPrice - unitCost) / retailPrice) * 100).toFixed(1)) : "";

    const values = [
      "",
      row.sku,
      row.name,
      catalogItem?.brand ?? "",
      catalogItem?.category ?? "",
      catalogItem?.subCategory ?? "",
      catalogItem?.description ?? "",
      catalogItem?.sizeWeight ?? "",
      catalogItem?.unitType ?? "",
      parseUnitsPerCase(catalogItem?.unitsPerCase ?? ""),
      quantityOnHand,
      "",
      unitCost,
      retailPrice,
      "",
      marginPercent,
      catalogItem?.barcode ?? "",
      catalogItem?.supplier ?? "",
      catalogItem?.countryOfOrigin ?? "",
      "",
      catalogItem?.storageConditions ?? "",
      "",
      "",
      formatDateCell(row.created_at),
      formatDateCell(row.updated_at),
      row.is_active === false ? "Inactive" : "Active",
      catalogItem?.notes ?? "",
    ];

    values.forEach((value, columnIndex) => {
      const cell = worksheet.getCell(rowNumber, columnIndex + 1);
      cell.value = value as ExcelJS.CellValue;
      cell.font = { size: columnIndex === 6 ? 9 : 10 };
      cell.alignment = {
        horizontal:
          columnIndex === 1 ||
          columnIndex === 7 ||
          columnIndex === 8 ||
          columnIndex === 9 ||
          columnIndex === 10 ||
          columnIndex === 15 ||
          columnIndex === 16 ||
          columnIndex === 18 ||
          columnIndex === 19 ||
          columnIndex === 21 ||
          columnIndex === 22 ||
          columnIndex === 23 ||
          columnIndex === 24 ||
          columnIndex === 25
            ? "center"
            : columnIndex === 12 || columnIndex === 13 || columnIndex === 14
              ? "right"
              : "left",
        vertical: "middle",
        wrapText: true,
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: manualEntryColumns.has(columnIndex + 1) ? "FFFFF2CC" : alternateFill },
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FFBDD7EE" } },
        left: { style: "thin", color: { argb: "FFBDD7EE" } },
        right: { style: "thin", color: { argb: "FFBDD7EE" } },
        bottom: { style: "thin", color: { argb: "FFBDD7EE" } },
      };
    });

    worksheet.getCell(rowNumber, 10).numFmt = "0";
    worksheet.getCell(rowNumber, 11).numFmt = "0";
    worksheet.getCell(rowNumber, 12).numFmt = "0";
    worksheet.getCell(rowNumber, 13).numFmt = '"$"#,##0.00';
    worksheet.getCell(rowNumber, 14).numFmt = '"$"#,##0.00';
    worksheet.getCell(rowNumber, 15).numFmt = '"$"#,##0.00';
    worksheet.getCell(rowNumber, 16).numFmt = '0.0"%"';

    const imageUrl = getProductImagePublicUrl(row.org_id, row.sku);
    if (imageUrl) {
      imageTasks.push(
        (async () => {
          const imageBuffer = await fetchImageBuffer(imageUrl);
          if (!imageBuffer) return;
          const extension = imageUrl.toLowerCase().endsWith(".png") ? "png" : "jpeg";
          const imageId = workbook.addImage({ buffer: imageBuffer, extension });
          worksheet.addImage(imageId, {
            tl: { col: 0.15, row: rowNumber - 0.85 },
            ext: { width: 130, height: 130 },
            editAs: "oneCell",
          });
        })()
      );
    }
  });

  await Promise.all(imageTasks);

  const legendRow = rows.length + 5;
  worksheet.mergeCells(`A${legendRow}:${lastColumn}${legendRow}`);
  worksheet.getCell(`A${legendRow}`).value =
    "LEGEND: Yellow cells = manual entry required | Status options: Active / Inactive / Discontinued / Low Stock / Out of Stock";
  worksheet.getCell(`A${legendRow}`).font = { size: 9, color: { argb: "FF7F7F7F" } };
  worksheet.getCell(`A${legendRow}`).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF2F2F2" },
  };
  worksheet.getCell(`A${legendRow}`).alignment = { vertical: "middle", wrapText: true };
  worksheet.autoFilter = {
    from: { row: 3, column: 1 },
    to: { row: rows.length + 3, column: columns.length },
  };

  return workbook.xlsx.writeBuffer();
}

export function getInvoiceDisplayNumber(
  invoiceNo: string | null | undefined,
  invoiceId: string | null | undefined
) {
  const normalizedInvoiceNo = typeof invoiceNo === "string" ? invoiceNo.trim() : "";
  if (normalizedInvoiceNo) return normalizedInvoiceNo;

  const normalizedInvoiceId =
    typeof invoiceId === "string" ? invoiceId.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() : "";
  const shortId = normalizedInvoiceId.slice(0, 8);

  return shortId ? `INV-${shortId}` : "INV-DRAFT";
}

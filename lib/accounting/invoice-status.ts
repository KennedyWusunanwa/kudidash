export function getInvoiceDisplayStatus(status: unknown, amountPaid: unknown, total: unknown) {
  const normalizedStatus =
    typeof status === "string" && status.trim() ? status.trim().toLowerCase() : "draft";
  const paidAmount = Number(amountPaid ?? 0);
  const totalAmount = Number(total ?? 0);

  if (normalizedStatus === "posted" && paidAmount + 0.009 < totalAmount) {
    return "pending";
  }

  return normalizedStatus;
}

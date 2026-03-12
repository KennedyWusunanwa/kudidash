export interface TaxableLineInput {
  quantity?: number | null;
  unit_price?: number | null;
}

function normalizeMoney(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Number(value.toFixed(2));
}

export function normalizeTaxRate(value: unknown) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return Number(Math.min(numeric, 100).toFixed(4));
}

export function resolveInvoiceTaxRate(invoiceTaxRate: unknown, fallbackTaxRate: unknown) {
  const normalizedInvoiceTaxRate = normalizeTaxRate(invoiceTaxRate);
  if (normalizedInvoiceTaxRate > 0) {
    return normalizedInvoiceTaxRate;
  }
  return normalizeTaxRate(fallbackTaxRate);
}

export function formatTaxRate(value: unknown) {
  const normalizedTaxRate = normalizeTaxRate(value);
  if (normalizedTaxRate <= 0) return "0%";
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(normalizedTaxRate)}%`;
}

export function calculateInvoiceLineAmounts(line: TaxableLineInput, taxRate: unknown) {
  const quantity = Number(line.quantity ?? 0);
  const unitPrice = Number(line.unit_price ?? 0);
  const baseAmount = normalizeMoney(quantity * unitPrice);
  const normalizedTaxRate = normalizeTaxRate(taxRate);
  const taxAmount = normalizeMoney(baseAmount * (normalizedTaxRate / 100));

  return {
    baseAmount,
    taxAmount,
    lineTotal: normalizeMoney(baseAmount + taxAmount),
  };
}

export function calculateInvoiceTotals(lines: TaxableLineInput[], taxRate: unknown) {
  return lines.reduce(
    (totals, line) => {
      const amounts = calculateInvoiceLineAmounts(line, taxRate);
      totals.subtotal = normalizeMoney(totals.subtotal + amounts.baseAmount);
      totals.tax = normalizeMoney(totals.tax + amounts.taxAmount);
      totals.total = normalizeMoney(totals.total + amounts.lineTotal);
      return totals;
    },
    { subtotal: 0, tax: 0, total: 0 }
  );
}

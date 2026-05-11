import { DEFAULT_CURRENCY_CODE } from "@/lib/currencies";

export function formatCurrency(
  value: number | null | undefined,
  currency = DEFAULT_CURRENCY_CODE
) {
  const normalized =
    String(currency || DEFAULT_CURRENCY_CODE).trim().toUpperCase() || DEFAULT_CURRENCY_CODE;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: normalized,
      maximumFractionDigits: 2,
    }).format(value ?? 0);
  } catch {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: DEFAULT_CURRENCY_CODE,
      maximumFractionDigits: 2,
    }).format(value ?? 0);
  }
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(date);
}

export function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(
    value ?? 0
  );
}

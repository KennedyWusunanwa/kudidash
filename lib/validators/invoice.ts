import { z } from "zod";

const money = z
  .coerce.number()
  .finite()
  .min(0)
  .transform((n) => Number(n.toFixed(2)));

export const invoiceLineSchema = z.object({
  description: z.string().trim().min(1).max(255),
  quantity: z.coerce.number().positive(),
  unit_price: money,
  revenue_account_id: z.string().uuid(),
  tax_amount: money.default(0),
});

export const invoiceSchema = z.object({
  customer_id: z.union([z.string().uuid(), z.literal("__new__")]),
  customer_name: z.string().trim().min(2).max(120),
  customer_email: z.string().email().optional().or(z.literal("")),
  customer_phone: z.string().trim().max(40).optional().or(z.literal("")),
  customer_billing_address: z.string().trim().max(500).optional().or(z.literal("")),
  customer_description: z.string().trim().max(240).optional().or(z.literal("")),
  invoice_date: z.string().date(),
  due_date: z.string().date(),
  currency_code: z.string().length(3).default("GHS"),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  lines: z.array(invoiceLineSchema).min(1),
});

export const postInvoiceSchema = z.object({
  invoiceId: z.string().uuid(),
  idempotencyKey: z.string().uuid(),
});

export type InvoiceInput = z.infer<typeof invoiceSchema>;

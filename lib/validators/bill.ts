import { z } from "zod";

const money = z
  .coerce.number()
  .finite()
  .min(0)
  .transform((n) => Number(n.toFixed(2)));

const optionalUuidString = z.union([z.string().uuid(), z.literal("")]).default("");

export const billLineSchema = z.object({
  inventory_item_id: optionalUuidString.optional(),
  description: z.string().trim().min(1).max(255),
  quantity: z.coerce.number().positive(),
  unit_cost: money,
  expense_account_id: z.string().uuid(),
  tax_amount: money.default(0),
});

export const billSchema = z.object({
  vendor_id: z.string().uuid(),
  bill_date: z.string().date(),
  due_date: z.string().date(),
  currency_code: z.string().length(3).default("GHS"),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  lines: z.array(billLineSchema).min(1),
});

export const postBillSchema = z.object({
  billId: z.string().uuid(),
  idempotencyKey: z.string().uuid(),
});

export type BillInput = z.infer<typeof billSchema>;

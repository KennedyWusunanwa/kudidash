import { DEFAULT_CURRENCY_CODE } from "@/lib/currencies";
import { z } from "zod";

const money = z
  .coerce.number()
  .finite()
  .positive()
  .transform((n) => Number(n.toFixed(2)));

export const verifyReceiptSchema = z.object({
  invoice_id: z.string().uuid(),
  customer_id: z.string().uuid(),
  receipt_date: z.string().date(),
  amount: money,
  currency_code: z.string().length(3).default(DEFAULT_CURRENCY_CODE),
  payment_method: z.string().trim().max(60).optional().or(z.literal("")),
  reference: z.string().trim().max(120).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export type VerifyReceiptInput = z.infer<typeof verifyReceiptSchema>;

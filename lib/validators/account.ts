import { z } from "zod";

export const accountTypeEnum = z.enum([
  "asset",
  "liability",
  "equity",
  "income",
  "expense",
]);

export const accountSubTypeEnum = z.enum([
  "bank",
  "cash",
  "accounts_receivable",
  "inventory",
  "fixed_asset",
  "accounts_payable",
  "tax",
  "equity",
  "sales",
  "cost_of_sales",
  "operating_expense",
  "other",
]);

export const accountSchema = z.object({
  code: z.string().trim().min(1).max(20),
  name: z.string().trim().min(2).max(120),
  type: accountTypeEnum,
  sub_type: accountSubTypeEnum,
  currency_code: z.string().trim().length(3).default("GHS"),
  is_active: z.boolean().default(true),
});

export const updateAccountSchema = accountSchema.extend({
  id: z.string().uuid(),
});

export type AccountInput = z.infer<typeof accountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;

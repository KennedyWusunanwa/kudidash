import { z } from "zod";

const amountSchema = z
  .coerce.number()
  .finite()
  .min(0)
  .transform((n) => Number(n.toFixed(2)));

export const journalLineSchema = z
  .object({
    account_id: z.string().uuid(),
    description: z.string().trim().max(255).optional().or(z.literal("")),
    debit: amountSchema,
    credit: amountSchema,
  })
  .superRefine((line, ctx) => {
    const hasDebit = line.debit > 0;
    const hasCredit = line.credit > 0;
    if (hasDebit === hasCredit) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Each line must have either debit or credit, not both/neither.",
      });
    }
  });

export const journalEntryHeaderSchema = z.object({
  entry_date: z.string().date(),
  memo: z.string().trim().max(500).optional().or(z.literal("")),
  reference: z.string().trim().max(120).optional().or(z.literal("")),
});

export const journalEntrySchema = journalEntryHeaderSchema
  .extend({
    lines: z.array(journalLineSchema).min(2),
  })
  .superRefine((entry, ctx) => {
    const debitTotal = entry.lines.reduce((sum, line) => sum + line.debit, 0);
    const creditTotal = entry.lines.reduce((sum, line) => sum + line.credit, 0);
    const balanced =
      Number(debitTotal.toFixed(2)) === Number(creditTotal.toFixed(2));

    if (!balanced) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lines"],
        message: "Journal entry must balance (total debits = total credits).",
      });
    }
  });

export const approveJournalSchema = z.object({
  journalId: z.string().uuid(),
});

export const postJournalSchema = z.object({
  journalId: z.string().uuid(),
  idempotencyKey: z.string().uuid(),
});

export const reverseJournalSchema = z.object({
  journalId: z.string().uuid(),
  reversalDate: z.string().date(),
  reason: z.string().trim().min(3).max(255),
  idempotencyKey: z.string().uuid(),
});

export type JournalEntryInput = z.infer<typeof journalEntrySchema>;

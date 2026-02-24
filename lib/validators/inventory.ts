import { z } from "zod";

const optionalUuidString = z.union([z.string().uuid(), z.literal("")]).default("");

export const inventoryValuationMethodEnum = z.enum([
  "weighted_average",
  "fifo",
  "lifo",
  "specific_identification",
]);

export const inventoryItemSchema = z.object({
  sku: z.string().trim().min(1).max(64),
  name: z.string().trim().min(2).max(160),
  inventory_account_id: optionalUuidString.optional(),
  cogs_account_id: optionalUuidString.optional(),
  revenue_account_id: optionalUuidString.optional(),
  valuation_method: inventoryValuationMethodEnum.default("weighted_average"),
  is_active: z.boolean().default(true),
});

export const deactivateInventoryItemSchema = z.object({
  orgId: z.string().uuid(),
  id: z.string().uuid(),
});

export type InventoryItemInput = z.infer<typeof inventoryItemSchema>;


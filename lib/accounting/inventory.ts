// UNSPECIFIED: Inventory valuation method (FIFO/LIFO/Weighted Average), warehouse model, and costing events.
export type InventoryValuationMethod = "fifo" | "lifo" | "weighted_average";

export interface InventoryModuleConfig {
  enabled: boolean;
  valuation_method: InventoryValuationMethod;
}

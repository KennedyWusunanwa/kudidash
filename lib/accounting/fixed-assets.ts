// UNSPECIFIED: Fixed asset classes, depreciation methods, and tax books.
export interface FixedAssetScaffold {
  enabled: boolean;
  depreciation_method?: "straight_line" | "reducing_balance";
}

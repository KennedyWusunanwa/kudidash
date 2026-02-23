// UNSPECIFIED: Country-specific payroll tax, social security, pension, and statutory remittance rules.
export interface PayrollCountryHooks {
  countryCode: string;
  calculateTaxableGross?: (gross: number) => number;
  calculateEmployerContributions?: (gross: number) => number;
}

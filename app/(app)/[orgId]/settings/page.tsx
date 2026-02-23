import { getOrganizationById, getOrgAccountSettings } from "@/lib/data/org.data";
import { listAccountsForSelect } from "@/lib/data/coa.data";
import { OrgSettingsForm } from "@/components/forms/org-settings-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const [org, accountSettings, accountOptions] = await Promise.all([
    getOrganizationById(orgId),
    getOrgAccountSettings(orgId),
    listAccountsForSelect(orgId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Settings</h2>
        <p className="text-sm text-muted-foreground">
          Organization configuration, control accounts, and module scaffolds.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Organization & accounting settings</CardTitle>
        </CardHeader>
        <CardContent>
          <OrgSettingsForm
            orgId={orgId}
            org={{
              name: String(org?.name ?? ""),
              base_currency: String(org?.base_currency ?? "GHS"),
              fiscal_year_start_month: Number(org?.fiscal_year_start_month ?? 1),
            }}
            accountSettings={
              (accountSettings as Record<string, string | null | undefined> | null) ?? undefined
            }
            accountOptions={accountOptions}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inventory (Scaffold)</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {/* UNSPECIFIED: inventory costing policy, stock locations, item master, and movement posting rules */}
            Inventory module scaffolding is included in `lib/accounting/inventory.ts`. Configure valuation and posting rules before enabling.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fixed Assets (Scaffold)</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {/* UNSPECIFIED: asset classes, useful lives, depreciation books, and disposal workflows */}
            Fixed asset scaffolding is included in `lib/accounting/fixed-assets.ts`. Depreciation postings are intentionally not enabled by default.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payroll (Scaffold)</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {/* UNSPECIFIED: country-specific payroll taxes/statutory remittances. Country hooks declared in lib/accounting/payroll.ts */}
            Payroll country hooks are marked `UNSPECIFIED` and must be implemented per jurisdiction before production use.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

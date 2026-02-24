import { roleHasPermission } from "@/lib/permissions";
import {
  getOrganizationById,
  getOrgAccountSettings,
  requireOrgMembership,
} from "@/lib/data/org.data";
import { listAccountsForSelect } from "@/lib/data/coa.data";
import { OrgSettingsForm } from "@/components/forms/org-settings-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const [membership, org, accountSettings, accountOptions] = await Promise.all([
    requireOrgMembership(orgId),
    getOrganizationById(orgId),
    getOrgAccountSettings(orgId),
    listAccountsForSelect(orgId),
  ]);
  const canManageOrgSettings = roleHasPermission(membership.role, "org.manage");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Settings</h2>
        <p className="text-sm text-muted-foreground">
          Organization branding, accounting controls, and operational configuration.
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
              dashboard_name:
                typeof org?.dashboard_name === "string" ? String(org.dashboard_name) : "",
              dashboard_logo_url:
                typeof org?.dashboard_logo_url === "string"
                  ? String(org.dashboard_logo_url)
                  : "",
              dashboard_color_scheme:
                typeof org?.dashboard_color_scheme === "string"
                  ? String(org.dashboard_color_scheme)
                  : "default",
            }}
            accountSettings={
              (accountSettings as Record<string, string | null | undefined> | null) ?? undefined
            }
            accountOptions={accountOptions}
            canManageOrgSettings={canManageOrgSettings}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inventory (Scaffold)</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Inventory item management is available. Configure costing policy, stock locations, and
            movement posting rules before using automated inventory valuation postings.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fixed Assets (Scaffold)</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Fixed asset lifecycle logic is scaffolded in `lib/accounting/fixed-assets.ts`. Define
            asset classes, useful lives, and depreciation posting rules before go-live.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payroll (Scaffold)</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Payroll country hooks exist in `lib/accounting/payroll.ts`. Implement jurisdiction tax
            and statutory remittance rules before production payroll processing.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

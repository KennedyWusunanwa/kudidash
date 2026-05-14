import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { Sidebar } from "@/components/app-shell/sidebar";
import { Topbar } from "@/components/app-shell/topbar";
import { RouteTransition } from "@/components/motion/route-transition";
import { getDashboardBrandCssVars } from "@/lib/branding";
import {
  getCurrentUser,
  getOrganizationById,
  listUserOrganizations,
  requireOrgMembership,
} from "@/lib/data/org.data";

export default async function OrgLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  try {
    await requireOrgMembership(orgId);
  } catch {
    notFound();
  }

  const [orgs, user, org] = await Promise.all([
    listUserOrganizations(),
    getCurrentUser(),
    getOrganizationById(orgId),
  ]);
  const dashboardName =
    (typeof org?.dashboard_name === "string" && org.dashboard_name.trim()) ||
    (typeof org?.name === "string" ? org.name : "KudiDash");
  const dashboardLogoUrl =
    typeof org?.dashboard_logo_url === "string" ? org.dashboard_logo_url : null;
  const brandCssVars = getDashboardBrandCssVars(org?.dashboard_color_scheme);

  return (
    <div className="dashboard-shell min-h-screen bg-background" style={brandCssVars}>
      <div className="flex min-h-screen">
        <Sidebar
          orgId={orgId}
          branding={{ dashboardName, logoUrl: dashboardLogoUrl, orgName: String(org?.name ?? "") }}
        />
        <div className="min-w-0 flex-1">
          <Topbar
            orgId={orgId}
            orgs={orgs}
            userEmail={user?.email}
            branding={{ dashboardName, logoUrl: dashboardLogoUrl }}
          />
          <main className="mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8">
            <RouteTransition>
              <div className="shell-panel shell-grid mb-6 rounded-[1.6rem] px-5 py-5 sm:px-6">
                <div className="relative flex flex-wrap items-end justify-between gap-5">
                  <div>
                    <p className="surface-label">Accounting workspace</p>
                    <h1 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-foreground">
                      {org?.name ?? "Organization"}
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                      Run day-to-day finance operations from a cleaner dashboard shell while keeping your
                      existing organization records and workflows intact.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-background/82 px-4 py-3 text-right shadow-sm">
                    <div className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                      Org ID
                    </div>
                    <div className="mt-1 font-mono text-sm font-semibold text-foreground">{orgId}</div>
                  </div>
                </div>
              </div>
              {children}
            </RouteTransition>
          </main>
        </div>
      </div>
    </div>
  );
}

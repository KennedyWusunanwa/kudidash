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
    <div className="min-h-screen bg-background" style={brandCssVars}>
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
          <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6">
            <RouteTransition>
              <div className="mb-4">
                <h1 className="text-lg font-semibold tracking-tight">{org?.name ?? "Organization"}</h1>
                <p className="text-sm text-muted-foreground">
                  Multi-tenant accounting workspace - Org ID: {orgId}
                </p>
              </div>
              {children}
            </RouteTransition>
          </main>
        </div>
      </div>
    </div>
  );
}

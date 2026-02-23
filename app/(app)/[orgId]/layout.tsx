import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { Sidebar } from "@/components/app-shell/sidebar";
import { Topbar } from "@/components/app-shell/topbar";
import { getCurrentUser, getOrganizationById, listUserOrganizations, requireOrgMembership } from "@/lib/data/org.data";

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

  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen">
        <Sidebar orgId={orgId} />
        <div className="min-w-0 flex-1">
          <Topbar orgId={orgId} orgs={orgs} userEmail={user?.email} />
          <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6">
            <div className="mb-4">
              <h1 className="text-lg font-semibold tracking-tight">{org?.name ?? "Organization"}</h1>
              <p className="text-sm text-muted-foreground">
                Multi-tenant accounting workspace · Org ID: {orgId}
              </p>
            </div>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

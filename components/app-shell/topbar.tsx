import { ThemeToggle } from "@/components/theme-toggle";
import { MobileNav } from "@/components/app-shell/mobile-nav";
import { OrgSwitcher } from "@/components/app-shell/org-switcher";
import { UserMenu } from "@/components/app-shell/user-menu";

interface TopbarProps {
  orgId: string;
  orgs: Array<{
    org_id: string;
    role: string;
    organization?: { name?: string; slug?: string };
  }>;
  userEmail?: string | null;
  branding?: { dashboardName?: string | null; logoUrl?: string | null };
}

export function Topbar({ orgId, orgs, userEmail, branding }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <MobileNav orgId={orgId} dashboardName={branding?.dashboardName} />
          <div className="hidden items-center gap-2 sm:flex lg:hidden">
            {branding?.logoUrl ? (
              <img
                src={branding.logoUrl}
                alt={`${branding.dashboardName ?? "KudiDash"} logo`}
                className="size-8 rounded-md border bg-background object-cover"
              />
            ) : null}
            <span className="max-w-36 truncate text-sm font-medium">
              {branding?.dashboardName?.trim() || "KudiDash"}
            </span>
          </div>
          <OrgSwitcher currentOrgId={orgId} orgs={orgs} />
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <UserMenu email={userEmail} />
        </div>
      </div>
    </header>
  );
}

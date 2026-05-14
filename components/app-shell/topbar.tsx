import { ThemeToggle } from "@/components/theme-toggle";
import { MobileNav } from "@/components/app-shell/mobile-nav";
import { OrgSwitcher } from "@/components/app-shell/org-switcher";
import { UserMenu } from "@/components/app-shell/user-menu";
import { Badge } from "@/components/ui/badge";

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
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/72 backdrop-blur-xl">
      <div className="flex min-h-18 flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <MobileNav orgId={orgId} dashboardName={branding?.dashboardName} />
          <div className="hidden items-center gap-2 sm:flex lg:hidden">
            {branding?.logoUrl ? (
              <img
                src={branding.logoUrl}
                alt={`${branding.dashboardName ?? "KudiDash"} logo`}
                className="size-8 rounded-xl border border-border/70 bg-background object-cover"
              />
            ) : null}
            <span className="max-w-36 truncate text-sm font-semibold">
              {branding?.dashboardName?.trim() || "KudiDash"}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <div className="hidden lg:block">
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                Control panel
              </p>
              <p className="text-sm font-semibold tracking-[-0.02em] text-foreground">
                {branding?.dashboardName?.trim() || "KudiDash"}
              </p>
            </div>
            <OrgSwitcher currentOrgId={orgId} orgs={orgs} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="hidden sm:inline-flex">
            Org {orgId.slice(0, 8)}
          </Badge>
          <ThemeToggle />
          <UserMenu email={userEmail} />
        </div>
      </div>
    </header>
  );
}

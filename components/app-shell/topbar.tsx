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
}

export function Topbar({ orgId, orgs, userEmail }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <MobileNav orgId={orgId} />
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

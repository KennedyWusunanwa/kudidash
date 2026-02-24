"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Boxes,
  Building2,
  CreditCard,
  FileText,
  Landmark,
  Receipt,
  Settings,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navIconClass = "size-4";

function buildNav(orgId: string) {
  return [
    { href: `/${orgId}/dashboard`, label: "Dashboard", icon: BarChart3 },
    { href: `/${orgId}/coa`, label: "Chart of Accounts", icon: Building2 },
    { href: `/${orgId}/journals`, label: "Journals", icon: FileText },
    { href: `/${orgId}/invoices`, label: "Invoices", icon: Receipt },
    { href: `/${orgId}/bills`, label: "Bills", icon: FileText },
    { href: `/${orgId}/inventory`, label: "Inventory", icon: Boxes },
    { href: `/${orgId}/banking/reconciliation`, label: "Banking", icon: Landmark },
    { href: `/${orgId}/reports`, label: "Reports", icon: CreditCard },
    { href: `/${orgId}/settings`, label: "Settings", icon: Settings },
    { href: `/${orgId}/settings/users-roles`, label: "Users & Roles", icon: Users },
  ];
}

export function Sidebar({
  orgId,
  branding,
}: {
  orgId: string;
  branding?: { dashboardName?: string | null; logoUrl?: string | null; orgName?: string | null };
}) {
  const pathname = usePathname();
  const items = buildNav(orgId);
  const dashboardName = branding?.dashboardName?.trim() || "KudiDash";
  const logoUrl = branding?.logoUrl?.trim() || null;

  return (
    <aside className="hidden w-72 shrink-0 border-r bg-sidebar text-sidebar-foreground lg:flex">
      <div className="flex min-h-screen w-full flex-col">
        <div className="border-b px-5 py-4">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={`${dashboardName} logo`}
                className="size-9 rounded-md border bg-background object-cover"
              />
            ) : (
              <div className="flex size-9 items-center justify-center rounded-md border bg-background text-xs font-semibold">
                {dashboardName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="truncate text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {dashboardName}
              </div>
              <div className="truncate text-sm font-medium">
                {branding?.orgName?.trim() || "Accounting Workspace"}
              </div>
            </div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3" aria-label="Primary navigation">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className={navIconClass} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="border-t px-5 py-4 text-xs text-muted-foreground">
          Multi-tenant mode enabled
        </div>
      </div>
    </aside>
  );
}

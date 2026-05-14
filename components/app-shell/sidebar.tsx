"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Boxes,
  Building2,
  ChevronRight,
  CreditCard,
  FileText,
  Landmark,
  PanelLeftClose,
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
    { href: `/${orgId}/customers`, label: "Customers", icon: Users },
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
    <aside className="hidden w-[18.5rem] shrink-0 border-r border-sidebar-border/70 bg-sidebar text-sidebar-foreground lg:flex">
      <div className="flex min-h-screen w-full flex-col">
        <div className="border-b border-sidebar-border/80 px-5 py-5">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={`${dashboardName} logo`}
                className="size-11 rounded-2xl border border-white/10 bg-white/95 object-cover p-1"
              />
            ) : (
              <div className="flex size-11 items-center justify-center rounded-2xl bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground shadow-lg shadow-black/20">
                {dashboardName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="truncate text-[0.68rem] font-bold uppercase tracking-[0.24em] text-sidebar-foreground/55">
                {dashboardName}
              </div>
              <div className="truncate text-base font-semibold tracking-[-0.02em]">
                {branding?.orgName?.trim() || "Accounting Workspace"}
              </div>
            </div>
          </div>
        </div>
        <div className="px-5 pt-5">
          <div className="rounded-[1.35rem] border border-white/8 bg-white/4 p-4 shadow-[inset_0_1px_0_rgb(255_255_255_/_0.05)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-sidebar-foreground/50">
                  Workspace
                </p>
                <p className="mt-2 text-sm font-medium text-sidebar-foreground/92">
                  Financial operations center
                </p>
              </div>
              <div className="rounded-xl bg-sidebar-primary/18 p-2 text-sidebar-primary">
                <PanelLeftClose className="size-4" />
              </div>
            </div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-4 pt-5" aria-label="Primary navigation">
          <p className="px-3 pb-2 text-[0.68rem] font-bold uppercase tracking-[0.22em] text-sidebar-foreground/45">
            Main navigation
          </p>
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm transition-[transform,background-color,color,box-shadow] duration-200 ease-out active:scale-[0.985]",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-[0_16px_26px_-18px_color-mix(in_oklab,var(--sidebar-primary)_85%,black)]"
                    : "text-sidebar-foreground/82 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <span
                  className={cn(
                    "flex size-9 items-center justify-center rounded-xl border transition-colors",
                    active
                      ? "border-white/12 bg-white/10 text-sidebar-primary-foreground"
                      : "border-white/6 bg-white/4 text-sidebar-foreground/70 group-hover:border-white/10 group-hover:bg-white/8"
                  )}
                >
                  <Icon className={navIconClass} />
                </span>
                <span className="flex-1">{item.label}</span>
                <ChevronRight
                  className={cn(
                    "size-4 transition-transform",
                    active ? "opacity-100" : "opacity-0 group-hover:translate-x-0.5 group-hover:opacity-60"
                  )}
                />
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border/80 px-5 py-4">
          <div className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3">
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-sidebar-foreground/45">
              Status
            </p>
            <p className="mt-2 text-sm text-sidebar-foreground/90">Multi-tenant mode enabled</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

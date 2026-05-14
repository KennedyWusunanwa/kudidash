"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

function navItems(orgId: string) {
  return [
    { href: `/${orgId}/dashboard`, label: "Dashboard" },
    { href: `/${orgId}/coa`, label: "Chart of Accounts" },
    { href: `/${orgId}/journals`, label: "Journals" },
    { href: `/${orgId}/invoices`, label: "Invoices" },
    { href: `/${orgId}/customers`, label: "Customers" },
    { href: `/${orgId}/bills`, label: "Bills" },
    { href: `/${orgId}/inventory`, label: "Inventory" },
    { href: `/${orgId}/banking/reconciliation`, label: "Banking" },
    { href: `/${orgId}/reports`, label: "Reports" },
    { href: `/${orgId}/settings`, label: "Settings" },
  ];
}

export function MobileNav({
  orgId,
  dashboardName,
}: {
  orgId: string;
  dashboardName?: string | null;
}) {
  const pathname = usePathname();
  const items = navItems(orgId);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="lg:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="size-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[20rem] border-r border-border/70 bg-sidebar px-0 text-sidebar-foreground">
        <SheetHeader>
          <div className="border-b border-sidebar-border/80 px-6 pb-4">
            <div className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-sidebar-foreground/50">
              Workspace
            </div>
            <SheetTitle className="mt-2 text-left text-xl font-semibold text-sidebar-foreground">
              {dashboardName?.trim() || "KudiDash"}
            </SheetTitle>
          </div>
        </SheetHeader>
        <nav className="mt-6 space-y-1 px-4" aria-label="Mobile navigation">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center justify-between rounded-2xl px-4 py-3 text-sm transition-[transform,background-color,color] duration-200 ease-out active:scale-[0.985]",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/82 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <span>{item.label}</span>
                <ChevronRight className={cn("size-4", active ? "opacity-100" : "opacity-45")} />
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
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
      <SheetContent side="left" className="w-[20rem]">
        <SheetHeader>
          <SheetTitle>{dashboardName?.trim() || "KudiDash"}</SheetTitle>
        </SheetHeader>
        <nav className="mt-6 space-y-1" aria-label="Mobile navigation">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "block rounded-md px-3 py-2 text-sm",
                  active ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}

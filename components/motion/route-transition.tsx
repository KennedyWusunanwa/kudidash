"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

export function RouteTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const routeKey = pathname;

  return (
    <div key={routeKey} className="page-enter route-stage">
      {children}
    </div>
  );
}

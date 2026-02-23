import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top_left,var(--color-chart-2),transparent_40%),radial-gradient(circle_at_bottom_right,var(--color-chart-1),transparent_45%)] p-4">
      <div className="absolute inset-0 bg-background/85 backdrop-blur-sm" aria-hidden="true" />
      <div className="relative z-10 w-full max-w-md">{children}</div>
    </main>
  );
}

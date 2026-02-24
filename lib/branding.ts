import type { CSSProperties } from "react";

export const DASHBOARD_COLOR_SCHEMES = [
  "default",
  "emerald",
  "indigo",
  "rose",
  "amber",
  "teal",
  "slate",
] as const;

export type DashboardColorScheme = (typeof DASHBOARD_COLOR_SCHEMES)[number];

type BrandPalette = {
  primary?: string;
  primaryForeground?: string;
  ring?: string;
  sidebarPrimary?: string;
  sidebarPrimaryForeground?: string;
  chart1?: string;
  chart2?: string;
};

const SCHEME_PALETTES: Record<DashboardColorScheme, BrandPalette> = {
  default: {},
  emerald: {
    primary: "oklch(0.62 0.17 154)",
    primaryForeground: "oklch(0.985 0 0)",
    ring: "oklch(0.62 0.17 154)",
    sidebarPrimary: "oklch(0.62 0.17 154)",
    sidebarPrimaryForeground: "oklch(0.985 0 0)",
    chart1: "oklch(0.64 0.18 154)",
    chart2: "oklch(0.72 0.14 190)",
  },
  indigo: {
    primary: "oklch(0.58 0.2 280)",
    primaryForeground: "oklch(0.985 0 0)",
    ring: "oklch(0.58 0.2 280)",
    sidebarPrimary: "oklch(0.58 0.2 280)",
    sidebarPrimaryForeground: "oklch(0.985 0 0)",
    chart1: "oklch(0.58 0.2 280)",
    chart2: "oklch(0.68 0.16 245)",
  },
  rose: {
    primary: "oklch(0.64 0.21 15)",
    primaryForeground: "oklch(0.985 0 0)",
    ring: "oklch(0.64 0.21 15)",
    sidebarPrimary: "oklch(0.64 0.21 15)",
    sidebarPrimaryForeground: "oklch(0.985 0 0)",
    chart1: "oklch(0.64 0.21 15)",
    chart2: "oklch(0.73 0.16 55)",
  },
  amber: {
    primary: "oklch(0.74 0.16 78)",
    primaryForeground: "oklch(0.18 0 0)",
    ring: "oklch(0.74 0.16 78)",
    sidebarPrimary: "oklch(0.74 0.16 78)",
    sidebarPrimaryForeground: "oklch(0.18 0 0)",
    chart1: "oklch(0.74 0.16 78)",
    chart2: "oklch(0.66 0.15 40)",
  },
  teal: {
    primary: "oklch(0.63 0.13 205)",
    primaryForeground: "oklch(0.985 0 0)",
    ring: "oklch(0.63 0.13 205)",
    sidebarPrimary: "oklch(0.63 0.13 205)",
    sidebarPrimaryForeground: "oklch(0.985 0 0)",
    chart1: "oklch(0.63 0.13 205)",
    chart2: "oklch(0.68 0.14 170)",
  },
  slate: {
    primary: "oklch(0.38 0.03 255)",
    primaryForeground: "oklch(0.985 0 0)",
    ring: "oklch(0.5 0.03 255)",
    sidebarPrimary: "oklch(0.38 0.03 255)",
    sidebarPrimaryForeground: "oklch(0.985 0 0)",
    chart1: "oklch(0.5 0.03 255)",
    chart2: "oklch(0.65 0.04 220)",
  },
};

export function normalizeDashboardColorScheme(value: unknown): DashboardColorScheme {
  const candidate = typeof value === "string" ? value : "default";
  return (DASHBOARD_COLOR_SCHEMES as readonly string[]).includes(candidate)
    ? (candidate as DashboardColorScheme)
    : "default";
}

export function getDashboardBrandCssVars(scheme: unknown): CSSProperties {
  const palette = SCHEME_PALETTES[normalizeDashboardColorScheme(scheme)];
  if (!palette || Object.keys(palette).length === 0) return {};

  return {
    ...(palette.primary ? ({ ["--primary" as any]: palette.primary } as CSSProperties) : {}),
    ...(palette.primaryForeground
      ? ({ ["--primary-foreground" as any]: palette.primaryForeground } as CSSProperties)
      : {}),
    ...(palette.ring ? ({ ["--ring" as any]: palette.ring } as CSSProperties) : {}),
    ...(palette.sidebarPrimary
      ? ({ ["--sidebar-primary" as any]: palette.sidebarPrimary } as CSSProperties)
      : {}),
    ...(palette.sidebarPrimaryForeground
      ? ({
          ["--sidebar-primary-foreground" as any]: palette.sidebarPrimaryForeground,
        } as CSSProperties)
      : {}),
    ...(palette.chart1 ? ({ ["--chart-1" as any]: palette.chart1 } as CSSProperties) : {}),
    ...(palette.chart2 ? ({ ["--chart-2" as any]: palette.chart2 } as CSSProperties) : {}),
  };
}


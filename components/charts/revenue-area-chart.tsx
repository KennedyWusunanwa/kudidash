"use client";

import { formatCurrency } from "@/lib/format";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function RevenueAreaChart({
  data,
  currencyCode,
}: {
  data: Array<{ period: string; revenue: number }>;
  currencyCode?: string | null;
}) {
  return (
    <div className="h-64 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-chart-2)" stopOpacity={0.45} />
              <stop offset="95%" stopColor="var(--color-chart-2)" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="period" tickLine={false} axisLine={false} />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => formatCurrency(Number(value ?? 0), currencyCode || undefined)}
          />
          <Tooltip
            formatter={(value) => formatCurrency(Number(value ?? 0), currencyCode || undefined)}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="var(--color-chart-2)"
            fill="url(#revenueFill)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

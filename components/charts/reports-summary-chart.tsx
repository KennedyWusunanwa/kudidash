"use client";

import { formatCurrency } from "@/lib/format";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function ReportsSummaryChart({
  data,
  currencyCode,
}: {
  data: Array<{ label: string; amount: number }>;
  currencyCode?: string | null;
}) {
  return (
    <div className="h-72 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => formatCurrency(Number(value ?? 0), currencyCode || undefined)}
          />
          <Tooltip
            formatter={(value) => formatCurrency(Number(value ?? 0), currencyCode || undefined)}
          />
          <Bar dataKey="amount" fill="var(--color-chart-3)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

"use client";

import { formatCurrency } from "@/lib/format";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function ExpensesLineChart({
  data,
  currencyCode,
}: {
  data: Array<{ period: string; expenses: number }>;
  currencyCode?: string | null;
}) {
  return (
    <div className="h-64 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
        <LineChart data={data}>
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
          <Line
            type="monotone"
            dataKey="expenses"
            stroke="var(--color-chart-1)"
            strokeWidth={2}
            dot={{ r: 2 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";

interface KpiCardProps {
  title: string;
  value: number;
  description?: string;
  currency?: string | null;
  icon?: LucideIcon;
  accentClassName?: string;
}

export function KpiCard({
  title,
  value,
  description,
  currency,
  icon: Icon,
  accentClassName = "from-emerald-500/15 via-sky-500/10 to-amber-500/15",
}: KpiCardProps) {
  return (
    <Card className="relative overflow-hidden border-border/70 bg-card/85 backdrop-blur">
      <div className={`absolute inset-x-0 top-0 h-20 bg-gradient-to-r ${accentClassName}`} />
      <CardHeader className="relative pb-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          {Icon ? (
            <div className="flex size-9 items-center justify-center rounded-full border border-border/60 bg-background/80">
              <Icon className="size-4 text-foreground/80" />
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="relative">
        <div className="text-2xl font-semibold tracking-tight">
          {formatCurrency(value, currency || undefined)}
        </div>
        {description ? (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

import type { LucideIcon } from "lucide-react";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { pctChange } from "@/lib/analytics-dateRange";

interface TrendProps {
  current: number;
  previous: number;
  /** true when a decrease is the good direction (error rate, bounce rate, churn...). */
  invert?: boolean;
}

export function TrendBadge({ current, previous, invert = false }: TrendProps) {
  const change = pctChange(current, previous);
  if (change === null) return null;
  const isFlat = change === 0;
  const isUp = change > 0;
  const isGood = isFlat ? null : invert ? !isUp : isUp;

  const Icon = isFlat ? Minus : isUp ? ArrowUp : ArrowDown;
  const colorClass = isFlat ? "text-muted-foreground" : isGood ? "text-success" : "text-destructive";

  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium", colorClass)}>
      <Icon className="h-3 w-3" />
      {Math.abs(change)}%
    </span>
  );
}

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  trend?: TrendProps;
  loading?: boolean;
}

export function StatCard({ icon: Icon, label, value, sub, trend, loading }: StatCardProps) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Icon className="h-4 w-4 shrink-0" />
          <span className="truncate">{label}</span>
        </div>
        {trend && !loading && <TrendBadge {...trend} />}
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-8 w-24" />
      ) : (
        <div className="mt-1 font-mono text-2xl font-semibold tabular-nums">{value}</div>
      )}
      {sub && !loading && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

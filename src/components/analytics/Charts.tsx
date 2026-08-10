import type { ReactNode } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, Pie, PieChart, Cell } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { cn } from "@/lib/utils";

const SERIES_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

export function ChartCard({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-soft">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

interface TrendAreaChartProps {
  data: Record<string, unknown>[];
  series: { key: string; label: string; colorIndex?: number }[];
  formatValue?: (v: number) => string;
  height?: number;
}

export function TrendAreaChart({ data, series, formatValue, height = 220 }: TrendAreaChartProps) {
  const config: ChartConfig = Object.fromEntries(
    series.map((s, i) => [s.key, { label: s.label, color: SERIES_COLORS[s.colorIndex ?? i % SERIES_COLORS.length] }]),
  );

  return (
    <ChartContainer config={config} className="w-full" style={{ height }}>
      <AreaChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          fontSize={11}
          tickFormatter={(v) => new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
        />
        <ChartTooltip content={<ChartTooltipContent formatter={formatValue ? (value) => formatValue(Number(value)) : undefined} />} />
        {series.map((s) => (
          <Area
            key={s.key}
            dataKey={s.key}
            type="monotone"
            stackId="a"
            fill={`var(--color-${s.key})`}
            fillOpacity={0.18}
            stroke={`var(--color-${s.key})`}
            strokeWidth={2}
          />
        ))}
      </AreaChart>
    </ChartContainer>
  );
}

interface BarListItem {
  label: string;
  value: number;
}

export function SimpleBarList({
  items,
  formatValue,
  colorClass = "bg-primary",
}: {
  items: BarListItem[];
  formatValue?: (v: number) => string;
  colorClass?: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (items.length === 0) {
    return <p className="text-xs text-muted-foreground">No data for this range yet.</p>;
  }
  return (
    <div className="space-y-2.5">
      {items.map((item, i) => (
        <div key={`${item.label}-${i}`}>
          <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
            <span className="truncate text-foreground">{item.label}</span>
            <span className="shrink-0 font-mono tabular-nums text-muted-foreground">
              {formatValue ? formatValue(item.value) : item.value.toLocaleString()}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div className={cn("h-full rounded-full", colorClass)} style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DonutBreakdown({
  data,
  formatValue,
}: {
  data: { name: string; value: number }[];
  formatValue?: (v: number) => string;
}) {
  const config: ChartConfig = Object.fromEntries(
    data.map((d, i) => [d.name, { label: d.name, color: SERIES_COLORS[i % SERIES_COLORS.length] }]),
  );
  const total = data.reduce((s, d) => s + d.value, 0);

  if (data.length === 0) {
    return <p className="text-xs text-muted-foreground">No data for this range yet.</p>;
  }

  return (
    <div className="flex flex-wrap items-center gap-6">
      <ChartContainer config={config} className="h-40 w-40 shrink-0">
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent formatter={formatValue ? (value) => formatValue(Number(value)) : undefined} />} />
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} strokeWidth={2}>
            {data.map((d, i) => (
              <Cell key={d.name} fill={SERIES_COLORS[i % SERIES_COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
      <div className="flex-1 space-y-1.5 min-w-[140px]">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center justify-between gap-2 text-xs">
            <span className="flex items-center gap-1.5 text-foreground">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: SERIES_COLORS[i % SERIES_COLORS.length] }} />
              <span className="truncate">{d.name}</span>
            </span>
            <span className="shrink-0 font-mono tabular-nums text-muted-foreground">
              {total > 0 ? Math.round((d.value / total) * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

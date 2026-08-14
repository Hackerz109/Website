import { z } from "zod";

export type DateRangePreset = "today" | "7d" | "30d" | "90d" | "custom";

// Plain strings for every field (including the compare toggle) rather than
// booleans — query-string round-tripping of non-string types is one more
// thing to get subtly wrong without a way to test it, and strings are
// unambiguous either way.
export const analyticsSearchSchema = z.object({
  preset: z.enum(["today", "7d", "30d", "90d", "custom"]).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  compare: z.enum(["on", "off"]).optional(),
});
export type AnalyticsSearch = z.infer<typeof analyticsSearchSchema>;

export function searchToResolvedRange(search: AnalyticsSearch): ResolvedDateRange {
  const preset = search.preset ?? "30d";
  const from = search.from ? new Date(search.from) : undefined;
  const to = search.to ? new Date(search.to) : undefined;
  return resolveDateRange(preset, from, to);
}

export type ResolvedDateRange = {
  start: Date;
  end: Date;
  prevStart: Date;
  prevEnd: Date;
  label: string;
};

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function endOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(23, 59, 59, 999);
  return r;
}

export const DATE_RANGE_PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "custom", label: "Custom" },
];

/** The previous period is always the same length, immediately before the current one. */
export function resolveDateRange(preset: DateRangePreset, customFrom?: Date, customTo?: Date): ResolvedDateRange {
  const now = new Date();

  if (preset === "today") {
    const start = startOfDay(now);
    const end = now;
    const span = end.getTime() - start.getTime();
    return {
      start,
      end,
      prevStart: new Date(start.getTime() - span - 1),
      prevEnd: new Date(start.getTime() - 1),
      label: "Today",
    };
  }

  if (preset === "custom" && customFrom && customTo) {
    const start = startOfDay(customFrom);
    const end = endOfDay(customTo);
    const span = end.getTime() - start.getTime();
    return {
      start,
      end,
      prevStart: new Date(start.getTime() - span - 1),
      prevEnd: new Date(start.getTime() - 1),
      label: "Custom range",
    };
  }

  const days = preset === "7d" ? 7 : preset === "90d" ? 90 : 30;
  const end = now;
  const start = startOfDay(new Date(now.getTime() - (days - 1) * 86_400_000));
  const span = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - span);
  return { start, end, prevStart, prevEnd, label: `Last ${days} days` };
}

export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

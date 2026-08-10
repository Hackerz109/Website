import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { DATE_RANGE_PRESETS, type AnalyticsSearch, type DateRangePreset } from "@/lib/analytics-dateRange";

interface DateRangePickerProps {
  search: AnalyticsSearch;
  onChange: (patch: Partial<AnalyticsSearch>) => void;
}

export function DateRangePicker({ search, onChange }: DateRangePickerProps) {
  const preset = search.preset ?? "30d";
  const compareOn = (search.compare ?? "on") === "on";
  const customFrom = search.from ? new Date(search.from) : undefined;
  const customTo = search.to ? new Date(search.to) : undefined;

  function setPreset(p: DateRangePreset) {
    if (p === "custom") {
      onChange({ preset: p });
      return;
    }
    onChange({ preset: p, from: undefined, to: undefined });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap gap-1 rounded-lg border bg-secondary/40 p-1">
        {DATE_RANGE_PRESETS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPreset(p.value)}
            className={cn(
              "rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
              preset === p.value ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {preset === "custom" && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <CalendarIcon className="h-3.5 w-3.5" />
              {customFrom && customTo
                ? `${customFrom.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${customTo.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
                : "Pick dates"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              numberOfMonths={1}
              selected={customFrom && customTo ? { from: customFrom, to: customTo } : undefined}
              onSelect={(range) => {
                onChange({
                  preset: "custom",
                  from: range?.from ? range.from.toISOString() : undefined,
                  to: range?.to ? range.to.toISOString() : range?.from ? range.from.toISOString() : undefined,
                });
              }}
              disabled={{ after: new Date() }}
            />
          </PopoverContent>
        </Popover>
      )}

      <label className="flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs text-muted-foreground">
        <Switch
          checked={compareOn}
          onCheckedChange={(checked) => onChange({ compare: checked ? "on" : "off" })}
          className="scale-90"
        />
        Compare to previous period
      </label>
    </div>
  );
}

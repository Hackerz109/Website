import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { Activity, Users, Globe, TrendingUp, IndianRupee, AlertTriangle, Radio, Bell, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { analyticsSearchSchema, type AnalyticsSearch } from "@/lib/analytics-dateRange";
import { DateRangePicker } from "@/components/analytics/DateRangePicker";

export const Route = createFileRoute("/admin/analytics")({
  component: AnalyticsLayout,
  validateSearch: (search: Record<string, unknown>) => analyticsSearchSchema.parse(search),
});

const tabs = [
  { to: "/admin/analytics", label: "Overview", icon: Activity, exact: true },
  { to: "/admin/analytics/users", label: "Users", icon: Users },
  { to: "/admin/analytics/geographic", label: "Geographic", icon: Globe },
  { to: "/admin/analytics/traffic", label: "Traffic", icon: TrendingUp },
  { to: "/admin/analytics/business", label: "Business", icon: IndianRupee },
  { to: "/admin/analytics/errors", label: "Errors", icon: AlertTriangle },
  { to: "/admin/analytics/realtime", label: "Real-Time", icon: Radio },
  { to: "/admin/analytics/alerts", label: "Alerts", icon: Bell },
  { to: "/admin/analytics/reports", label: "Reports", icon: Download },
];

function AnalyticsLayout() {
  const location = useLocation();
  const navigate = useNavigate({ from: Route.fullPath });
  const search = Route.useSearch();

  function onChange(patch: Partial<AnalyticsSearch>) {
    navigate({ search: (prev) => ({ ...prev, ...patch }) });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Analytics</h1>
          <p className="text-sm text-muted-foreground">Store performance, traffic, and system health at a glance.</p>
        </div>
        <DateRangePicker search={search} onChange={onChange} />
      </div>

      <nav className="flex gap-1 overflow-x-auto border-b pb-px">
        {tabs.map((t) => {
          const active = t.exact ? location.pathname === t.to : location.pathname.startsWith(t.to);
          return (
            <Link
              key={t.to}
              to={t.to}
              search={(prev) => prev}
              className={cn(
                "flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm transition-colors",
                active
                  ? "border-primary font-medium text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <t.icon className="h-3.5 w-3.5" /> {t.label}
            </Link>
          );
        })}
      </nav>

      <Outlet />
    </div>
  );
}

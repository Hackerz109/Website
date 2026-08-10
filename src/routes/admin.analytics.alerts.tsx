import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  fetchAlertRules,
  createAlertRule,
  updateAlertRule,
  deleteAlertRule,
  fetchAlertEvents,
  evaluateAlertsNow,
  type AlertRule,
  type AlertMetric,
  type AlertCondition,
  type AlertSeverity,
} from "@/lib/admin-analytics";

export const Route = createFileRoute("/admin/analytics/alerts")({ component: AnalyticsAlerts });

const METRIC_LABELS: Record<AlertMetric, string> = {
  traffic: "Traffic (sessions)",
  error_rate: "Error rate",
  revenue: "Revenue",
  failed_transactions: "Failed transactions",
  new_registrations: "New registrations",
  api_traffic: "Checkout / API activity",
  system_errors: "System errors",
  refunds: "Refunds",
};
const CONDITION_LABELS: Record<AlertCondition, string> = {
  above: "is above",
  below: "is below",
  spike_pct: "spikes by %",
  drop_pct: "drops by %",
};

function emptyRuleForm() {
  return {
    name: "",
    metric: "traffic" as AlertMetric,
    condition: "above" as AlertCondition,
    threshold: 100,
    time_window_minutes: 60,
    severity: "warning" as AlertSeverity,
    telegram: true,
    push: true,
  };
}

function AnalyticsAlerts() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyRuleForm());

  const { data: rules, isLoading: rulesLoading } = useQuery({ queryKey: ["analytics-alert-rules"], queryFn: fetchAlertRules });
  const { data: events } = useQuery({ queryKey: ["analytics-alert-events"], queryFn: () => fetchAlertEvents(30) });

  const createMutation = useMutation({
    mutationFn: () => {
      const channels = [...(form.telegram ? ["telegram"] : []), ...(form.push ? ["push"] : [])];
      return createAlertRule({
        name: form.name,
        metric: form.metric,
        condition: form.condition,
        threshold: form.threshold,
        time_window_minutes: form.time_window_minutes,
        severity: form.severity,
        notify_channels: channels,
      });
    },
    onSuccess: () => {
      toast.success("Alert rule created");
      queryClient.invalidateQueries({ queryKey: ["analytics-alert-rules"] });
      setDialogOpen(false);
      setForm(emptyRuleForm());
    },
    onError: () => toast.error("Couldn't create the rule"),
  });

  const toggleMutation = useMutation({
    mutationFn: (rule: AlertRule) => updateAlertRule(rule.id, { enabled: !rule.enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["analytics-alert-rules"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAlertRule(id),
    onSuccess: () => {
      toast.success("Rule deleted");
      queryClient.invalidateQueries({ queryKey: ["analytics-alert-rules"] });
    },
  });

  const checkNowMutation = useMutation({
    mutationFn: evaluateAlertsNow,
    onSuccess: (result) => {
      toast.success(
        result.triggered_count > 0 ? `${result.triggered_count} new alert${result.triggered_count === 1 ? "" : "s"} triggered` : "No new alerts",
      );
      queryClient.invalidateQueries({ queryKey: ["analytics-alert-events"] });
    },
    onError: () => toast.error("Couldn't check alerts right now"),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => checkNowMutation.mutate()}
          disabled={checkNowMutation.isPending}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${checkNowMutation.isPending ? "animate-spin" : ""}`} /> Check now
        </Button>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" /> New alert rule
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New alert rule</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Name</Label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Revenue drop" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Metric</Label>
                  <Select value={form.metric} onValueChange={(v) => setForm((f) => ({ ...f, metric: v as AlertMetric }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(METRIC_LABELS).map(([v, l]) => (
                        <SelectItem key={v} value={v}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Condition</Label>
                  <Select value={form.condition} onValueChange={(v) => setForm((f) => ({ ...f, condition: v as AlertCondition }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(CONDITION_LABELS).map(([v, l]) => (
                        <SelectItem key={v} value={v}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Threshold</Label>
                  <Input
                    type="number"
                    value={form.threshold}
                    onChange={(e) => setForm((f) => ({ ...f, threshold: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Time window (minutes)</Label>
                  <Input
                    type="number"
                    value={form.time_window_minutes}
                    onChange={(e) => setForm((f) => ({ ...f, time_window_minutes: Number(e.target.value) }))}
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Severity</Label>
                <Select value={form.severity} onValueChange={(v) => setForm((f) => ({ ...f, severity: v as AlertSeverity }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label className="text-xs">Notify via Telegram</Label>
                <Switch checked={form.telegram} onCheckedChange={(c) => setForm((f) => ({ ...f, telegram: c }))} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label className="text-xs">Notify via admin push</Label>
                <Switch checked={form.push} onCheckedChange={(c) => setForm((f) => ({ ...f, push: c }))} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => createMutation.mutate()} disabled={!form.name || createMutation.isPending}>
                Create rule
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border bg-card shadow-soft">
        <div className="border-b p-4"><h3 className="text-sm font-semibold">Rules</h3></div>
        <div className="divide-y">
          {(rules ?? []).map((rule) => (
            <div key={rule.id} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{rule.name}</span>
                  <Badge variant="outline" className="text-[10px]">{rule.severity}</Badge>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {METRIC_LABELS[rule.metric]} {CONDITION_LABELS[rule.condition]} {rule.threshold}
                  {rule.condition.includes("pct") ? "%" : ""} over {rule.time_window_minutes}m
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={rule.enabled} onCheckedChange={() => toggleMutation.mutate(rule)} />
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteMutation.mutate(rule.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          {!rulesLoading && (rules ?? []).length === 0 && (
            <p className="p-4 text-center text-xs text-muted-foreground">No alert rules yet — create one above.</p>
          )}
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-soft">
        <div className="border-b p-4"><h3 className="text-sm font-semibold">Alert history</h3></div>
        <div className="divide-y">
          {(events ?? []).map((event) => (
            <div key={event.id} className="flex items-center justify-between gap-3 p-4 text-xs">
              <div className="min-w-0">
                <p className="truncate">{event.message}</p>
                <p className="text-muted-foreground">{new Date(event.triggered_at).toLocaleString()}</p>
              </div>
              <Badge
                variant="outline"
                className={event.status === "resolved" ? "text-success" : event.status === "acknowledged" ? "" : "text-destructive"}
              >
                {event.status}
              </Badge>
            </div>
          ))}
          {(events ?? []).length === 0 && <p className="p-4 text-center text-xs text-muted-foreground">No alerts triggered yet.</p>}
        </div>
      </div>
    </div>
  );
}

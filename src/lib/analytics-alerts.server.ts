// Reuses the exact two admin-facing channels order-notify already uses —
// Telegram + admin web push — rather than introducing a third notification
// system just for analytics alerts.

export type TriggeredAlert = {
  rule_id: string;
  name: string;
  severity: "critical" | "warning" | "info";
  message: string;
  notify_channels: string[];
};

const SEVERITY_EMOJI: Record<string, string> = {
  critical: "🔴",
  warning: "🟠",
  info: "🔵",
};

export async function sendAlertNotifications(alerts: TriggeredAlert[]): Promise<void> {
  if (alerts.length === 0) return;

  const { sendTelegramMessage } = await import("@/lib/telegram.server");
  const { sendPushToAdmins } = await import("@/lib/push.server");

  await Promise.all(
    alerts.map(async (alert) => {
      const channels = alert.notify_channels ?? [];
      const emoji = SEVERITY_EMOJI[alert.severity] ?? "🔔";
      const tasks: Promise<void>[] = [];

      if (channels.includes("telegram")) {
        tasks.push(
          sendTelegramMessage(`${emoji} <b>Analytics alert</b>\n${escapeHtml(alert.message)}`),
        );
      }
      if (channels.includes("push")) {
        tasks.push(
          sendPushToAdmins({
            title: `${emoji} ${alert.name}`,
            body: alert.message,
            url: "/admin/analytics/alerts",
          }),
        );
      }

      await Promise.all(tasks);
    }),
  );
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

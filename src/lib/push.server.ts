// Sends a Web Push notification to every device that's subscribed from the
// admin app. Server-only, same convention as telegram.server.ts and
// client.server.ts — only ever imported from inside a `server.handlers`
// function.
import webpush from "web-push";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type PushPayload = {
  title: string;
  body: string;
  /** Path to open when the notification is tapped, e.g. "/admin/orders/<id>" */
  url?: string;
};

let vapidConfigured = false;

function ensureConfigured(): boolean {
  if (vapidConfigured) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    console.warn("[push] VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT not set — skipping push");
    return false;
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

export async function sendPushToAdmins(payload: PushPayload): Promise<void> {
  if (!ensureConfigured()) return;

  const { data: subs, error } = await supabaseAdmin.from("push_subscriptions").select("id, endpoint, p256dh, auth");
  if (error) {
    console.error("[push] failed to load subscriptions", error.message);
    return;
  }
  if (!subs || subs.length === 0) return;

  const body = JSON.stringify(payload);

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, body);
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number } | null)?.statusCode;
        // 404/410 = the browser/OS dropped this subscription (app
        // uninstalled, site data cleared, subscription expired) — clean it
        // up so future orders stop trying to reach it.
        if (statusCode === 404 || statusCode === 410) {
          await supabaseAdmin.from("push_subscriptions").delete().eq("id", sub.id);
        } else {
          console.error("[push] send failed", sub.id, statusCode, err);
        }
      }
    }),
  );
}

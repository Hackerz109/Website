const DEVICE_ID_KEY = "device_id";

/**
 * A random id persisted in localStorage. It's a weak signal on its own —
 * anyone can clear it — but combined with email + IP checks in
 * rateLimit.server.ts it adds a layer that a simple email-rotating or
 * IP-rotating script won't automatically defeat.
 */
export function getDeviceId(): string {
  if (typeof window === "undefined") return "server";
  let id = window.localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

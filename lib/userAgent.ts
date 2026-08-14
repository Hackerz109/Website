// Small, dependency-free User-Agent parser. Good enough for analytics
// bucketing (device type / browser / OS breakdowns) — not meant to be a
// precise device-detection library. Order matters: several UAs contain more
// than one recognizable token (Edge and Samsung Internet both contain
// "Chrome" and "Safari"), so the more specific checks run first.

export type ParsedUserAgent = {
  device_type: "mobile" | "tablet" | "desktop";
  browser: string;
  os: string;
};

export function parseUserAgent(ua: string | null | undefined): ParsedUserAgent {
  const s = ua || "";

  let device_type: ParsedUserAgent["device_type"] = "desktop";
  if (/ipad|tablet|kindle|playbook|nexus 7|nexus 9|nexus 10/i.test(s) || (/android/i.test(s) && !/mobile/i.test(s))) {
    device_type = "tablet";
  } else if (/mobile|iphone|ipod|android|blackberry|windows phone|opera mini/i.test(s)) {
    device_type = "mobile";
  }

  let browser = "Other";
  if (/edg\//i.test(s)) browser = "Edge";
  else if (/opr\/|opera/i.test(s)) browser = "Opera";
  else if (/samsungbrowser/i.test(s)) browser = "Samsung Internet";
  else if (/crios/i.test(s)) browser = "Chrome";
  else if (/fxios/i.test(s)) browser = "Firefox";
  else if (/chrome/i.test(s)) browser = "Chrome";
  else if (/firefox/i.test(s)) browser = "Firefox";
  else if (/safari/i.test(s)) browser = "Safari";
  else if (/msie|trident/i.test(s)) browser = "Internet Explorer";

  let os = "Other";
  if (/windows/i.test(s)) os = "Windows";
  else if (/iphone|ipad|ipod/i.test(s)) os = "iOS";
  else if (/android/i.test(s)) os = "Android";
  else if (/cros/i.test(s)) os = "ChromeOS";
  else if (/mac os x|macintosh/i.test(s)) os = "macOS";
  else if (/linux/i.test(s)) os = "Linux";

  return { device_type, browser, os };
}

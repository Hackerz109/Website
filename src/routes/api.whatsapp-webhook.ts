import { createFileRoute } from "@tanstack/react-router";
import crypto from "node:crypto";
import { formatMoney } from "@/stores/cart";

// Type-only reference — erased at compile time, so this does NOT pull the
// service-role client (or its secret key) into the client bundle. The real
// value is loaded via dynamic import() inside the POST handler only, per
// the convention documented in client.server.ts.
type SupabaseAdmin = typeof import("@/integrations/supabase/client.server").supabaseAdmin;

export const Route = createFileRoute("/api/whatsapp-webhook")({
  server: {
    handlers: {
      // Meta calls this once, when you register the webhook URL in the dashboard.
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge");

        if (mode === "subscribe" && token && token === process.env.WHATSAPP_VERIFY_TOKEN) {
          return new Response(challenge ?? "", { status: 200 });
        }
        return new Response("Forbidden", { status: 403 });
      },

      // Meta calls this every time your number receives a message.
      POST: async ({ request }) => {
        const rawBody = await request.text();

        const appSecret = process.env.WHATSAPP_APP_SECRET;
        if (!appSecret) {
          console.error("[whatsapp-webhook] WHATSAPP_APP_SECRET is not set — refusing all requests");
          return new Response("Server not configured", { status: 500 });
        }
        const signature = request.headers.get("x-hub-signature-256");
        if (!isValidSignature(rawBody, signature, appSecret)) {
          console.warn("[whatsapp-webhook] rejected request with invalid signature");
          return new Response("Invalid signature", { status: 401 });
        }

        let payload: WhatsAppWebhookPayload;
        try {
          payload = JSON.parse(rawBody);
        } catch {
          return new Response("Bad request", { status: 400 });
        }

        try {
          // Dynamic import so the service-role client never enters the
          // client bundle — only ever loaded here, inside a server handler.
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          await handleIncomingPayload(payload, supabaseAdmin);
        } catch (err) {
          // Never let a processing error cause Meta to retry-storm us; log and 200 anyway.
          console.error("[whatsapp-webhook] handler error", err);
        }

        return new Response("OK", { status: 200 });
      },
    },
  },
});

// ---------------------------------------------------------------------------
// Security
// ---------------------------------------------------------------------------

function isValidSignature(rawBody: string, header: string | null, appSecret: string): boolean {
  if (!header || !header.startsWith("sha256=")) return false;
  const expected = "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const expectedBuf = Buffer.from(expected);
  const headerBuf = Buffer.from(header);
  if (expectedBuf.length !== headerBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, headerBuf);
}

function normalizeNumber(n: string) {
  return n.replace(/[^0-9]/g, "");
}

// ---------------------------------------------------------------------------
// Incoming message handling
// ---------------------------------------------------------------------------

type WhatsAppWebhookPayload = {
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: Array<{
          from: string;
          type: string;
          text?: { body: string };
        }>;
      };
    }>;
  }>;
};

async function handleIncomingPayload(payload: WhatsAppWebhookPayload, supabaseAdmin: SupabaseAdmin) {
  const messages = payload.entry?.[0]?.changes?.[0]?.value?.messages;
  if (!messages || messages.length === 0) return; // status update webhook, not a message

  for (const message of messages) {
    const adminNumber = normalizeNumber(process.env.WHATSAPP_ADMIN_NUMBER ?? "");
    const fromNumber = normalizeNumber(message.from ?? "");

    if (!adminNumber || fromNumber !== adminNumber) {
      // Not the shop owner — silently ignore. Do not reveal this is a bot.
      console.warn("[whatsapp-webhook] ignored message from non-admin number");
      continue;
    }

    if (message.type !== "text" || !message.text?.body) {
      await sendWhatsAppMessage(fromNumber, "I can only read text commands right now. Reply *help* to see what I understand.");
      continue;
    }

    const reply = await handleCommand(message.text.body, supabaseAdmin);
    await sendWhatsAppMessage(fromNumber, reply);
  }
}

// ---------------------------------------------------------------------------
// Sending replies
// ---------------------------------------------------------------------------

async function sendWhatsAppMessage(to: string, body: string) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneNumberId || !accessToken) {
    console.error("[whatsapp-webhook] missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN");
    return;
  }

  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body },
    }),
  });

  if (!res.ok) {
    console.error("[whatsapp-webhook] send failed", res.status, await res.text());
  }
}

// ---------------------------------------------------------------------------
// Command parsing + execution
// ---------------------------------------------------------------------------

const HELP_TEXT = `📦 *Product manager*

*list* — show all products
*stock <product>* — check stock
*stock <product> <qty>* — set stock
*stock <product> | <variant> <qty>* — set a variant's stock
*price <product> <₹>* — set price
*price <product> | <variant> <₹>* — set a variant's price
*on <product>* / *off <product>* — show/hide in shop
*help* — this message

Example: "stock ceiling fan | 1200mm 12"`;

async function handleCommand(rawText: string, supabaseAdmin: SupabaseAdmin): Promise<string> {
  const text = rawText.trim();
  const lower = text.toLowerCase();

  if (["help", "hi", "hello", "menu", "start"].includes(lower)) return HELP_TEXT;
  if (lower === "list" || lower === "products") return listProducts(supabaseAdmin);

  let m = lower.match(/^stock\s+(.+)$/s);
  if (m) return runTargetedCommand("stock", text.slice(text.toLowerCase().indexOf("stock") + 5).trim(), supabaseAdmin);

  m = lower.match(/^price\s+(.+)$/s);
  if (m) return runTargetedCommand("price", text.slice(text.toLowerCase().indexOf("price") + 5).trim(), supabaseAdmin);

  m = lower.match(/^(on|activate|enable)\s+(.+)$/s);
  if (m) return setActive(text.slice(text.indexOf(" ") + 1).trim(), true, supabaseAdmin);

  m = lower.match(/^(off|deactivate|disable)\s+(.+)$/s);
  if (m) return setActive(text.slice(text.indexOf(" ") + 1).trim(), false, supabaseAdmin);

  return `I didn't understand that. Reply *help* to see available commands.`;
}

type ProductMatch = {
  id: string;
  name: string;
  price_cents: number;
  stock: number;
  active: boolean;
  currency: string;
  product_variants: { id: string; name: string; price_cents: number; stock: number }[];
};

async function findProducts(query: string, supabaseAdmin: SupabaseAdmin): Promise<ProductMatch[]> {
  const { data, error } = await supabaseAdmin
    .from("products")
    .select("id, name, price_cents, stock, active, currency, product_variants(id, name, price_cents, stock)")
    .ilike("name", `%${query}%`)
    .limit(10);
  if (error) {
    console.error("[whatsapp-webhook] product lookup failed", error);
    return [];
  }
  return data ?? [];
}

/** Resolves a free-text query to exactly one product, or returns a message
 *  explaining why it couldn't (no match / ambiguous match). */
async function resolveOneProduct(
  query: string,
  supabaseAdmin: SupabaseAdmin,
): Promise<{ product: ProductMatch } | { error: string }> {
  const clean = query.trim();
  if (!clean) return { error: "Which product? e.g. \"stock led bulb\"" };

  const matches = await findProducts(clean, supabaseAdmin);
  if (matches.length === 0) {
    return { error: `No product found matching "${clean}". Reply *list* to see product names.` };
  }
  const exact = matches.find((p) => p.name.toLowerCase() === clean.toLowerCase());
  if (exact) return { product: exact };
  if (matches.length === 1) return { product: matches[0] };

  const names = matches.slice(0, 8).map((p, i) => `${i + 1}. ${p.name}`).join("\n");
  return { error: `Found ${matches.length} products matching "${clean}":\n${names}\n\nBe more specific, e.g. use the full name.` };
}

async function listProducts(supabaseAdmin: SupabaseAdmin): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("products")
    .select("name, price_cents, currency, active, product_variants(price_cents, stock)")
    .order("name", { ascending: true })
    .limit(30);
  if (error || !data) return "Couldn't load products right now.";
  if (data.length === 0) return "No products yet.";

  const lines = data.map((p) => {
    const variants = p.product_variants ?? [];
    const priceLabel = variants.length > 0
      ? `from ${formatMoney(Math.min(...variants.map((v) => v.price_cents)), p.currency)} (${variants.length} variants)`
      : formatMoney(p.price_cents, p.currency);
    const status = p.active ? "" : " [hidden]";
    return `• ${p.name} — ${priceLabel}${status}`;
  });

  const header = `📦 *Products* (${data.length}${data.length === 30 ? "+" : ""})\n\n`;
  const footer = `\n\nReply "stock <name>" for details on one.`;
  return header + lines.join("\n") + footer;
}

async function runTargetedCommand(
  kind: "stock" | "price",
  rest: string,
  supabaseAdmin: SupabaseAdmin,
): Promise<string> {
  // Split "<product> | <variant> <number>" or "<product> <number>" or just "<product>"
  const [productPart, variantPart] = rest.split("|").map((s) => s.trim());

  const trailingNumber = variantPart !== undefined
    ? variantPart.match(/^(.*?)(\d+(?:\.\d+)?)\s*$/)
    : productPart.match(/^(.*?)(\d+(?:\.\d+)?)\s*$/);

  const hasNumber = !!trailingNumber;
  const numberValue = trailingNumber ? parseFloat(trailingNumber[2]) : null;

  const productQuery = variantPart !== undefined ? productPart : (hasNumber ? trailingNumber![1].trim() : productPart);
  const variantQuery = variantPart !== undefined
    ? (hasNumber ? trailingNumber![1].trim() : variantPart)
    : null;

  const resolved = await resolveOneProduct(productQuery, supabaseAdmin);
  if ("error" in resolved) return resolved.error;
  const product = resolved.product;

  // Product has variants — must target one specifically for updates.
  if (product.product_variants.length > 0) {
    if (variantQuery === null) {
      const lines = product.product_variants
        .map((v) => `• ${v.name} — ${formatMoney(v.price_cents, product.currency)} (${v.stock} in stock)`)
        .join("\n");
      return `*${product.name}* (${product.product_variants.length} variants)\n${lines}\n\nTo update: "${kind} ${product.name} | <variant> ${kind === "stock" ? "<qty>" : "<₹>"}"`;
    }

    const variant = product.product_variants.find((v) => v.name.toLowerCase().includes(variantQuery.toLowerCase()));
    if (!variant) {
      const names = product.product_variants.map((v) => v.name).join(", ");
      return `No variant matching "${variantQuery}" on *${product.name}*. Variants: ${names}`;
    }

    if (!hasNumber || numberValue === null) {
      return `*${product.name} — ${variant.name}*\nStock: ${variant.stock}\nPrice: ${formatMoney(variant.price_cents, product.currency)}`;
    }

    if (kind === "stock") {
      const { error } = await supabaseAdmin.from("product_variants").update({ stock: Math.round(numberValue) }).eq("id", variant.id);
      if (error) return `Failed to update: ${error.message}`;
      return `✅ *${product.name} — ${variant.name}* stock: ${variant.stock} → ${Math.round(numberValue)}`;
    } else {
      const cents = Math.round(numberValue * 100);
      const { error } = await supabaseAdmin.from("product_variants").update({ price_cents: cents }).eq("id", variant.id);
      if (error) return `Failed to update: ${error.message}`;
      return `✅ *${product.name} — ${variant.name}* price: ${formatMoney(variant.price_cents, product.currency)} → ${formatMoney(cents, product.currency)}`;
    }
  }

  // Simple product, no variants.
  if (!hasNumber || numberValue === null) {
    return `*${product.name}*\nStock: ${product.stock}\nPrice: ${formatMoney(product.price_cents, product.currency)}\nStatus: ${product.active ? "Active" : "Hidden"}`;
  }

  if (kind === "stock") {
    const { error } = await supabaseAdmin.from("products").update({ stock: Math.round(numberValue) }).eq("id", product.id);
    if (error) return `Failed to update: ${error.message}`;
    return `✅ *${product.name}* stock: ${product.stock} → ${Math.round(numberValue)}`;
  } else {
    const cents = Math.round(numberValue * 100);
    const { error } = await supabaseAdmin.from("products").update({ price_cents: cents }).eq("id", product.id);
    if (error) return `Failed to update: ${error.message}`;
    return `✅ *${product.name}* price: ${formatMoney(product.price_cents, product.currency)} → ${formatMoney(cents, product.currency)}`;
  }
}

async function setActive(query: string, active: boolean, supabaseAdmin: SupabaseAdmin): Promise<string> {
  const resolved = await resolveOneProduct(query, supabaseAdmin);
  if ("error" in resolved) return resolved.error;
  const product = resolved.product;

  const { error } = await supabaseAdmin.from("products").update({ active }).eq("id", product.id);
  if (error) return `Failed to update: ${error.message}`;
  return `✅ *${product.name}* is now ${active ? "visible in the shop" : "hidden from the shop"}`;
}

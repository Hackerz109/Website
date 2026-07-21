import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { t as formatMoney } from "./cart-e0HpVhNN.mjs";
import { c as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { t as createClient } from "../_libs/supabase__supabase-js.mjs";
import { c as HeadContent, d as createRouter, f as Outlet, g as Link, h as createRootRouteWithContext, m as createFileRoute, p as lazyRouteComponent, s as Scripts, v as useRouter } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as QueryClient } from "../_libs/tanstack__query-core.mjs";
import { n as QueryClientProvider } from "../_libs/tanstack__react-query.mjs";
import { t as Toaster } from "../_libs/sonner.mjs";
import { t as Route$29 } from "./admin.orders._id-VXMiQWr4.mjs";
import { t as Route$30 } from "./admin.users._id-RHRCBvpY.mjs";
import { t as Route$31 } from "./category._name-D61L28JQ.mjs";
import { t as Route$32 } from "./orders._id-CbwHWNEY.mjs";
import { t as Route$33 } from "./orders._id.track-cmi0-mJW.mjs";
import { t as Route$34 } from "./product._slug-BS34dFUS.mjs";
import { t as Route$35 } from "./search-ByEhiXep.mjs";
import { t as SpeedInsights } from "../_libs/vercel__speed-insights.mjs";
import { t as Analytics } from "../_libs/vercel__analytics.mjs";
import processModule from "node:process";
import { Buffer } from "node:buffer";
import crypto from "node:crypto";
//#region node_modules/.nitro/vite/services/ssr/assets/router-BJC1j1hr.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var styles_default = "/assets/styles-DMkQnkHM.css";
function reportLovableError(error, context = {}) {
	if (typeof window === "undefined") return;
	window.__lovableEvents?.captureException?.(error, {
		source: "react_error_boundary",
		route: window.location.pathname,
		...context
	}, {
		mechanism: "react_error_boundary",
		handled: false,
		severity: "error"
	});
}
var Toaster$1 = ({ ...props }) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toaster, {
		className: "toaster group",
		toastOptions: { classNames: {
			toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
			description: "group-[.toast]:text-muted-foreground",
			actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
			cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground"
		} },
		...props
	});
};
function NotFoundComponent() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-screen items-center justify-center bg-background px-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-md text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-7xl font-bold text-foreground",
					children: "404"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "mt-4 text-xl font-semibold text-foreground",
					children: "Page not found"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted-foreground",
					children: "The page you're looking for doesn't exist or has been moved."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-6",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/",
						className: "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
						children: "Go home"
					})
				})
			]
		})
	});
}
function ErrorComponent({ error, reset }) {
	console.error(error);
	const router = useRouter();
	(0, import_react.useEffect)(() => {
		reportLovableError(error, { boundary: "tanstack_root_error_component" });
	}, [error]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-screen items-center justify-center bg-background px-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-md text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-xl font-semibold tracking-tight text-foreground",
					children: "This page didn't load"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted-foreground",
					children: "Something went wrong on our end. You can try refreshing or head back home."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-6 flex flex-wrap justify-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => {
							router.invalidate();
							reset();
						},
						className: "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
						children: "Try again"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						href: "/",
						className: "inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent",
						children: "Go home"
					})]
				})
			]
		})
	});
}
var Route$28 = createRootRouteWithContext()({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1"
			},
			{ title: "My Shop — Quality electrical products, backed by real support" },
			{
				name: "description",
				content: "Shop switches, wiring, fans, and fittings with clear warranty details, secure checkout, and a support team that's genuinely happy to help."
			},
			{
				name: "author",
				content: "My Shop"
			},
			{
				property: "og:title",
				content: "My Shop — Quality electrical products, backed by real support"
			},
			{
				property: "og:description",
				content: "Clear warranty details, secure checkout, and support you can count on."
			},
			{
				property: "og:type",
				content: "website"
			},
			{
				name: "twitter:card",
				content: "summary_large_image"
			},
			{
				name: "theme-color",
				content: "#2454E5"
			},
			{
				name: "mobile-web-app-capable",
				content: "yes"
			},
			{
				name: "apple-mobile-web-app-capable",
				content: "yes"
			},
			{
				name: "apple-mobile-web-app-status-bar-style",
				content: "default"
			},
			{
				name: "apple-mobile-web-app-title",
				content: "Shop Admin"
			}
		],
		links: [
			{
				rel: "stylesheet",
				href: styles_default
			},
			{
				rel: "icon",
				href: "/favicon.ico",
				type: "image/x-icon"
			},
			{
				rel: "manifest",
				href: "/manifest.webmanifest"
			},
			{
				rel: "apple-touch-icon",
				href: "/icons/apple-touch-icon.png"
			},
			{
				rel: "preconnect",
				href: "https://fonts.googleapis.com"
			},
			{
				rel: "preconnect",
				href: "https://fonts.gstatic.com",
				crossOrigin: "anonymous"
			},
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
			}
		]
	}),
	shellComponent: RootShell,
	component: RootComponent,
	notFoundComponent: NotFoundComponent,
	errorComponent: ErrorComponent
});
function RootShell({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("html", {
		lang: "en",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("head", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeadContent, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("body", { children: [
			children,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scripts, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SpeedInsights, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Analytics, {})
		] })]
	});
}
function RootComponent() {
	const { queryClient } = Route$28.useRouteContext();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(QueryClientProvider, {
		client: queryClient,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, {})
	});
}
function AppShell() {
	(0, import_react.useEffect)(() => {
		if (typeof window !== "undefined" && "serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toaster$1, {
		position: "top-center",
		richColors: true
	})] });
}
var $$splitComponentImporter$22 = () => import("./warranty-policy-BbRINubf.mjs");
var Route$27 = createFileRoute("/warranty-policy")({ component: lazyRouteComponent($$splitComponentImporter$22, "component") });
var $$splitComponentImporter$21 = () => import("./wallet-Cvvlgd7P.mjs");
var Route$26 = createFileRoute("/wallet")({ component: lazyRouteComponent($$splitComponentImporter$21, "component") });
var $$splitComponentImporter$20 = () => import("./terms-CQcRfgxL.mjs");
var Route$25 = createFileRoute("/terms")({ component: lazyRouteComponent($$splitComponentImporter$20, "component") });
var $$splitComponentImporter$19 = () => import("./shipping-policy-DZ9iPcwE.mjs");
var Route$24 = createFileRoute("/shipping-policy")({ component: lazyRouteComponent($$splitComponentImporter$19, "component") });
var $$splitComponentImporter$18 = () => import("./returns-policy-qcYlasyg.mjs");
var Route$23 = createFileRoute("/returns-policy")({ component: lazyRouteComponent($$splitComponentImporter$18, "component") });
var $$splitComponentImporter$17 = () => import("./profile-CP-aT2jo.mjs");
var Route$22 = createFileRoute("/profile")({ component: lazyRouteComponent($$splitComponentImporter$17, "component") });
var $$splitComponentImporter$16 = () => import("./privacy-policy-BdCzes5O.mjs");
var Route$21 = createFileRoute("/privacy-policy")({ component: lazyRouteComponent($$splitComponentImporter$16, "component") });
var $$splitComponentImporter$15 = () => import("./orders-tvgsGGTr.mjs");
var Route$20 = createFileRoute("/orders")({ component: lazyRouteComponent($$splitComponentImporter$15, "component") });
var $$splitComponentImporter$14 = () => import("./contact-C07URM1H.mjs");
var Route$19 = createFileRoute("/contact")({ component: lazyRouteComponent($$splitComponentImporter$14, "component") });
var $$splitComponentImporter$13 = () => import("./cart-BOulq6qk.mjs");
var Route$18 = createFileRoute("/cart")({ component: lazyRouteComponent($$splitComponentImporter$13, "component") });
var $$splitComponentImporter$12 = () => import("./auth-0EVTMqb1.mjs");
var Route$17 = createFileRoute("/auth")({ component: lazyRouteComponent($$splitComponentImporter$12, "component") });
var $$splitComponentImporter$11 = () => import("./admin-CmI7AQ6Q.mjs");
var Route$16 = createFileRoute("/admin")({ component: lazyRouteComponent($$splitComponentImporter$11, "component") });
var $$splitComponentImporter$10 = () => import("./about-CS774gNT.mjs");
var Route$15 = createFileRoute("/about")({ component: lazyRouteComponent($$splitComponentImporter$10, "component") });
var $$splitComponentImporter$9 = () => import("./routes-BRtK62DF.mjs");
var Route$14 = createFileRoute("/")({ component: lazyRouteComponent($$splitComponentImporter$9, "component") });
/** Signature element: a floating panel showing the shop's categories,
*  linked by circuit-trace lines with an animated current pulse. */
var $$splitComponentImporter$8 = () => import("./admin.index--IHVaiCp.mjs");
var Route$13 = createFileRoute("/admin/")({ component: lazyRouteComponent($$splitComponentImporter$8, "component") });
var Route$12 = createFileRoute("/api/whatsapp-webhook")({ server: { handlers: {
	GET: async ({ request }) => {
		const url = new URL(request.url);
		const mode = url.searchParams.get("hub.mode");
		const token = url.searchParams.get("hub.verify_token");
		const challenge = url.searchParams.get("hub.challenge");
		if (mode === "subscribe" && token && token === processModule.env.WHATSAPP_VERIFY_TOKEN) return new Response(challenge ?? "", { status: 200 });
		return new Response("Forbidden", { status: 403 });
	},
	POST: async ({ request }) => {
		const rawBody = await request.text();
		const appSecret = processModule.env.WHATSAPP_APP_SECRET;
		if (!appSecret) {
			console.error("[whatsapp-webhook] WHATSAPP_APP_SECRET is not set — refusing all requests");
			return new Response("Server not configured", { status: 500 });
		}
		if (!isValidSignature$1(rawBody, request.headers.get("x-hub-signature-256"), appSecret)) {
			console.warn("[whatsapp-webhook] rejected request with invalid signature");
			return new Response("Invalid signature", { status: 401 });
		}
		let payload;
		try {
			payload = JSON.parse(rawBody);
		} catch {
			return new Response("Bad request", { status: 400 });
		}
		try {
			const { supabaseAdmin } = await import("./client.server-Bw6iWMJ-.mjs");
			await handleIncomingPayload(payload, supabaseAdmin);
		} catch (err) {
			console.error("[whatsapp-webhook] handler error", err);
		}
		return new Response("OK", { status: 200 });
	}
} } });
function isValidSignature$1(rawBody, header, appSecret) {
	if (!header || !header.startsWith("sha256=")) return false;
	const expected = "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
	const expectedBuf = Buffer.from(expected);
	const headerBuf = Buffer.from(header);
	if (expectedBuf.length !== headerBuf.length) return false;
	return crypto.timingSafeEqual(expectedBuf, headerBuf);
}
function normalizeNumber(n) {
	return n.replace(/[^0-9]/g, "");
}
async function handleIncomingPayload(payload, supabaseAdmin) {
	const messages = payload.entry?.[0]?.changes?.[0]?.value?.messages;
	if (!messages || messages.length === 0) return;
	for (const message of messages) {
		const adminNumber = normalizeNumber(processModule.env.WHATSAPP_ADMIN_NUMBER ?? "");
		const fromNumber = normalizeNumber(message.from ?? "");
		if (!adminNumber || fromNumber !== adminNumber) {
			console.warn("[whatsapp-webhook] ignored message from non-admin number");
			continue;
		}
		if (message.type !== "text" || !message.text?.body) {
			await sendWhatsAppMessage(fromNumber, "I can only read text commands right now. Reply *help* to see what I understand.");
			continue;
		}
		await sendWhatsAppMessage(fromNumber, await handleCommand(message.text.body, supabaseAdmin));
	}
}
async function sendWhatsAppMessage(to, body) {
	const phoneNumberId = processModule.env.WHATSAPP_PHONE_NUMBER_ID;
	const accessToken = processModule.env.WHATSAPP_ACCESS_TOKEN;
	if (!phoneNumberId || !accessToken) {
		console.error("[whatsapp-webhook] missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN");
		return;
	}
	const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${accessToken}`,
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			messaging_product: "whatsapp",
			to,
			type: "text",
			text: { body }
		})
	});
	if (!res.ok) console.error("[whatsapp-webhook] send failed", res.status, await res.text());
}
var HELP_TEXT = `📦 *Product manager*

*list* — show all products
*stock <product>* — check stock
*stock <product> <qty>* — set stock
*stock <product> | <variant> <qty>* — set a variant's stock
*price <product> <₹>* — set price
*price <product> | <variant> <₹>* — set a variant's price
*on <product>* / *off <product>* — show/hide in shop
*help* — this message

Example: "stock ceiling fan | 1200mm 12"`;
async function handleCommand(rawText, supabaseAdmin) {
	const text = rawText.trim();
	const lower = text.toLowerCase();
	if ([
		"help",
		"hi",
		"hello",
		"menu",
		"start"
	].includes(lower)) return HELP_TEXT;
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
async function findProducts(query, supabaseAdmin) {
	const { data, error } = await supabaseAdmin.from("products").select("id, name, price_cents, stock, active, currency, product_variants(id, name, price_cents, stock)").ilike("name", `%${query}%`).limit(10);
	if (error) {
		console.error("[whatsapp-webhook] product lookup failed", error);
		return [];
	}
	return data ?? [];
}
/** Resolves a free-text query to exactly one product, or returns a message
*  explaining why it couldn't (no match / ambiguous match). */
async function resolveOneProduct(query, supabaseAdmin) {
	const clean = query.trim();
	if (!clean) return { error: "Which product? e.g. \"stock led bulb\"" };
	const matches = await findProducts(clean, supabaseAdmin);
	if (matches.length === 0) return { error: `No product found matching "${clean}". Reply *list* to see product names.` };
	const exact = matches.find((p) => p.name.toLowerCase() === clean.toLowerCase());
	if (exact) return { product: exact };
	if (matches.length === 1) return { product: matches[0] };
	const names = matches.slice(0, 8).map((p, i) => `${i + 1}. ${p.name}`).join("\n");
	return { error: `Found ${matches.length} products matching "${clean}":\n${names}\n\nBe more specific, e.g. use the full name.` };
}
async function listProducts(supabaseAdmin) {
	const { data, error } = await supabaseAdmin.from("products").select("name, price_cents, currency, active, product_variants(price_cents, stock)").order("name", { ascending: true }).limit(30);
	if (error || !data) return "Couldn't load products right now.";
	if (data.length === 0) return "No products yet.";
	const lines = data.map((p) => {
		const variants = p.product_variants ?? [];
		const priceLabel = variants.length > 0 ? `from ${formatMoney(Math.min(...variants.map((v) => v.price_cents)), p.currency)} (${variants.length} variants)` : formatMoney(p.price_cents, p.currency);
		const status = p.active ? "" : " [hidden]";
		return `• ${p.name} — ${priceLabel}${status}`;
	});
	return `📦 *Products* (${data.length}${data.length === 30 ? "+" : ""})\n\n` + lines.join("\n") + `\n\nReply "stock <name>" for details on one.`;
}
async function runTargetedCommand(kind, rest, supabaseAdmin) {
	const [productPart, variantPart] = rest.split("|").map((s) => s.trim());
	const trailingNumber = variantPart !== void 0 ? variantPart.match(/^(.*?)(\d+(?:\.\d+)?)\s*$/) : productPart.match(/^(.*?)(\d+(?:\.\d+)?)\s*$/);
	const hasNumber = !!trailingNumber;
	const numberValue = trailingNumber ? parseFloat(trailingNumber[2]) : null;
	const productQuery = variantPart !== void 0 ? productPart : hasNumber ? trailingNumber[1].trim() : productPart;
	const variantQuery = variantPart !== void 0 ? hasNumber ? trailingNumber[1].trim() : variantPart : null;
	const resolved = await resolveOneProduct(productQuery, supabaseAdmin);
	if ("error" in resolved) return resolved.error;
	const product = resolved.product;
	if (product.product_variants.length > 0) {
		if (variantQuery === null) {
			const lines = product.product_variants.map((v) => `• ${v.name} — ${formatMoney(v.price_cents, product.currency)} (${v.stock} in stock)`).join("\n");
			return `*${product.name}* (${product.product_variants.length} variants)\n${lines}\n\nTo update: "${kind} ${product.name} | <variant> ${kind === "stock" ? "<qty>" : "<₹>"}"`;
		}
		const variant = product.product_variants.find((v) => v.name.toLowerCase().includes(variantQuery.toLowerCase()));
		if (!variant) {
			const names = product.product_variants.map((v) => v.name).join(", ");
			return `No variant matching "${variantQuery}" on *${product.name}*. Variants: ${names}`;
		}
		if (!hasNumber || numberValue === null) return `*${product.name} — ${variant.name}*\nStock: ${variant.stock}\nPrice: ${formatMoney(variant.price_cents, product.currency)}`;
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
	if (!hasNumber || numberValue === null) return `*${product.name}*\nStock: ${product.stock}\nPrice: ${formatMoney(product.price_cents, product.currency)}\nStatus: ${product.active ? "Active" : "Hidden"}`;
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
async function setActive(query, active, supabaseAdmin) {
	const resolved = await resolveOneProduct(query, supabaseAdmin);
	if ("error" in resolved) return resolved.error;
	const product = resolved.product;
	const { error } = await supabaseAdmin.from("products").update({ active }).eq("id", product.id);
	if (error) return `Failed to update: ${error.message}`;
	return `✅ *${product.name}* is now ${active ? "visible in the shop" : "hidden from the shop"}`;
}
var Route$11 = createFileRoute("/api/verify-razorpay-payment")({ server: { handlers: { POST: async ({ request }) => {
	const auth = await getAuthenticatedUser$2(request);
	if (!auth) return json$2({ error: "Unauthorized" }, 401);
	let body;
	try {
		body = await request.json();
	} catch {
		return json$2({ error: "Bad request" }, 400);
	}
	const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = body;
	if (!orderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) return json$2({ error: "Missing fields" }, 400);
	const { data: order, error: fetchErr } = await auth.supabase.from("orders").select("id, user_id, razorpay_order_id, payment_status").eq("id", orderId).maybeSingle();
	if (fetchErr || !order) return json$2({ error: "Order not found" }, 404);
	if (order.user_id !== auth.userId) return json$2({ error: "Forbidden" }, 403);
	if (order.razorpay_order_id !== razorpayOrderId) return json$2({ error: "Order mismatch" }, 400);
	const keySecret = processModule.env.RAZORPAY_KEY_SECRET;
	if (!keySecret) {
		console.error("[verify-razorpay-payment] missing RAZORPAY_KEY_SECRET");
		return json$2({ error: "Payments are not configured yet" }, 500);
	}
	const expected = crypto.createHmac("sha256", keySecret).update(`${razorpayOrderId}|${razorpayPaymentId}`).digest("hex");
	const expectedBuf = Buffer.from(expected);
	const gotBuf = Buffer.from(razorpaySignature);
	if (!(expectedBuf.length === gotBuf.length && crypto.timingSafeEqual(expectedBuf, gotBuf))) {
		console.warn("[verify-razorpay-payment] signature mismatch for order", orderId);
		return json$2({ error: "Invalid signature" }, 400);
	}
	if (order.payment_status !== "paid") {
		const { supabaseAdmin } = await import("./client.server-Bw6iWMJ-.mjs");
		const { error: updateErr } = await supabaseAdmin.from("orders").update({
			payment_status: "paid",
			razorpay_payment_id: razorpayPaymentId,
			paid_at: (/* @__PURE__ */ new Date()).toISOString()
		}).eq("id", order.id);
		if (updateErr) {
			console.error("[verify-razorpay-payment] failed to mark order paid", updateErr);
			return json$2({ error: "Could not confirm payment" }, 500);
		}
	}
	return json$2({ ok: true });
} } } });
function json$2(body, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" }
	});
}
async function getAuthenticatedUser$2(request) {
	const supabaseUrl = processModule.env.SUPABASE_URL;
	const supabaseKey = processModule.env.SUPABASE_PUBLISHABLE_KEY;
	if (!supabaseUrl || !supabaseKey) {
		console.error("[verify-razorpay-payment] missing SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY");
		return null;
	}
	const authHeader = request.headers.get("authorization");
	if (!authHeader?.startsWith("Bearer ")) return null;
	const token = authHeader.replace("Bearer ", "");
	if (!token || token.split(".").length !== 3) return null;
	const supabase = createClient(supabaseUrl, supabaseKey, {
		global: { headers: { Authorization: `Bearer ${token}` } },
		auth: {
			persistSession: false,
			autoRefreshToken: false
		}
	});
	const { data, error } = await supabase.auth.getClaims(token);
	if (error || !data?.claims?.sub) return null;
	return {
		supabase,
		userId: data.claims.sub
	};
}
var Route$10 = createFileRoute("/api/refund-razorpay-payment")({ server: { handlers: { POST: async ({ request }) => {
	const auth = await getAuthenticatedUser$1(request);
	if (!auth) return json$1({ error: "Unauthorized" }, 401);
	const { data: roleRow } = await auth.supabase.from("user_roles").select("role").eq("user_id", auth.userId).eq("role", "admin").maybeSingle();
	if (!roleRow) return json$1({ error: "Admin access required" }, 403);
	let body;
	try {
		body = await request.json();
	} catch {
		return json$1({ error: "Bad request" }, 400);
	}
	const returnId = body.returnId;
	if (!returnId) return json$1({ error: "returnId is required" }, 400);
	const { data: ret, error: retErr } = await auth.supabase.from("return_requests").select("id, order_id, status, refund_amount_cents").eq("id", returnId).maybeSingle();
	if (retErr || !ret) return json$1({ error: "Return request not found" }, 404);
	if (ret.status !== "approved" && ret.status !== "partially_approved") return json$1({ error: "Only approved returns can be refunded" }, 400);
	if (!ret.refund_amount_cents || ret.refund_amount_cents <= 0) return json$1({ error: "Nothing to refund" }, 400);
	const { data: order, error: orderErr } = await auth.supabase.from("orders").select("id, razorpay_payment_id, payment_status").eq("id", ret.order_id).maybeSingle();
	if (orderErr || !order) return json$1({ error: "Order not found" }, 404);
	if (!order.razorpay_payment_id || order.payment_status !== "paid") return json$1({ error: "This order wasn't paid via Razorpay — use wallet credit instead" }, 400);
	const keyId = processModule.env.RAZORPAY_KEY_ID;
	const keySecret = processModule.env.RAZORPAY_KEY_SECRET;
	if (!keyId || !keySecret) {
		console.error("[refund-razorpay-payment] missing RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET");
		return json$1({ error: "Payments are not configured yet" }, 500);
	}
	const basicAuth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
	const rzpRes = await fetch(`https://api.razorpay.com/v1/payments/${order.razorpay_payment_id}/refund`, {
		method: "POST",
		headers: {
			Authorization: `Basic ${basicAuth}`,
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			amount: ret.refund_amount_cents,
			speed: "normal",
			notes: { return_request_id: ret.id }
		})
	});
	if (!rzpRes.ok) {
		const errText = await rzpRes.text();
		console.error("[refund-razorpay-payment] Razorpay API error", rzpRes.status, errText);
		return json$1({ error: "The payment gateway declined this refund" }, 502);
	}
	const rzpRefund = await rzpRes.json();
	const { data: result, error: rpcErr } = await auth.supabase.rpc("admin_process_refund", {
		p_return_id: ret.id,
		p_method: "original_payment",
		p_external_ref: rzpRefund.id
	});
	if (rpcErr) {
		console.error("[refund-razorpay-payment] gateway refund succeeded but record-keeping failed", rpcErr);
		return json$1({ error: "Refund was issued but couldn't be recorded — contact support with refund id " + rzpRefund.id }, 500);
	}
	return json$1({
		ok: true,
		refundId: rzpRefund.id,
		result
	});
} } } });
function json$1(body, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" }
	});
}
async function getAuthenticatedUser$1(request) {
	const supabaseUrl = processModule.env.SUPABASE_URL;
	const supabaseKey = processModule.env.SUPABASE_PUBLISHABLE_KEY;
	if (!supabaseUrl || !supabaseKey) {
		console.error("[refund-razorpay-payment] missing SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY");
		return null;
	}
	const authHeader = request.headers.get("authorization");
	if (!authHeader?.startsWith("Bearer ")) return null;
	const token = authHeader.replace("Bearer ", "");
	if (!token || token.split(".").length !== 3) return null;
	const supabase = createClient(supabaseUrl, supabaseKey, {
		global: { headers: { Authorization: `Bearer ${token}` } },
		auth: {
			persistSession: false,
			autoRefreshToken: false
		}
	});
	const { data, error } = await supabase.auth.getClaims(token);
	if (error || !data?.claims?.sub) return null;
	return {
		supabase,
		userId: data.claims.sub
	};
}
var Route$9 = createFileRoute("/api/razorpay-webhook")({ server: { handlers: { POST: async ({ request }) => {
	const rawBody = await request.text();
	const webhookSecret = processModule.env.RAZORPAY_WEBHOOK_SECRET;
	if (!webhookSecret) {
		console.error("[razorpay-webhook] RAZORPAY_WEBHOOK_SECRET is not set — refusing all requests");
		return new Response("Server not configured", { status: 500 });
	}
	if (!isValidSignature(rawBody, request.headers.get("x-razorpay-signature"), webhookSecret)) {
		console.warn("[razorpay-webhook] rejected request with invalid signature");
		return new Response("Invalid signature", { status: 401 });
	}
	let payload;
	try {
		payload = JSON.parse(rawBody);
	} catch {
		return new Response("Bad request", { status: 400 });
	}
	try {
		await handleEvent(payload);
	} catch (err) {
		console.error("[razorpay-webhook] handler error", err);
	}
	return new Response("OK", { status: 200 });
} } } });
function isValidSignature(rawBody, header, secret) {
	if (!header) return false;
	const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
	const expectedBuf = Buffer.from(expected);
	const headerBuf = Buffer.from(header);
	if (expectedBuf.length !== headerBuf.length) return false;
	return crypto.timingSafeEqual(expectedBuf, headerBuf);
}
async function handleEvent(payload) {
	const payment = payload.payload?.payment?.entity;
	if (!payment) return;
	const { supabaseAdmin } = await import("./client.server-Bw6iWMJ-.mjs");
	if (payload.event === "payment.captured") {
		const { data: order } = await supabaseAdmin.from("orders").select("id, payment_status").eq("razorpay_order_id", payment.order_id).maybeSingle();
		if (!order) {
			console.warn("[razorpay-webhook] payment.captured for unknown order", payment.order_id);
			return;
		}
		if (order.payment_status === "paid") return;
		await supabaseAdmin.from("orders").update({
			payment_status: "paid",
			razorpay_payment_id: payment.id,
			paid_at: (/* @__PURE__ */ new Date()).toISOString()
		}).eq("id", order.id);
	}
	if (payload.event === "payment.failed") {
		const { data: order } = await supabaseAdmin.from("orders").select("id, payment_status").eq("razorpay_order_id", payment.order_id).maybeSingle();
		if (!order || order.payment_status === "paid") return;
		await supabaseAdmin.from("orders").update({ payment_status: "failed" }).eq("id", order.id);
	}
}
var Route$8 = createFileRoute("/api/create-razorpay-order")({ server: { handlers: { POST: async ({ request }) => {
	const auth = await getAuthenticatedUser(request);
	if (!auth) return json({ error: "Unauthorized" }, 401);
	let body;
	try {
		body = await request.json();
	} catch {
		return json({ error: "Bad request" }, 400);
	}
	const orderId = body.orderId;
	if (!orderId) return json({ error: "orderId is required" }, 400);
	const { data: order, error: fetchErr } = await auth.supabase.from("orders").select("id, user_id, total_cents, wallet_used_cents, currency, payment_status").eq("id", orderId).maybeSingle();
	if (fetchErr || !order) return json({ error: "Order not found" }, 404);
	if (order.user_id !== auth.userId) return json({ error: "Forbidden" }, 403);
	if (order.payment_status === "paid") return json({ error: "Order is already paid" }, 400);
	const amountDue = order.total_cents - (order.wallet_used_cents ?? 0);
	if (amountDue <= 0) return json({ error: "Order is already fully paid" }, 400);
	const keyId = processModule.env.RAZORPAY_KEY_ID;
	const keySecret = processModule.env.RAZORPAY_KEY_SECRET;
	if (!keyId || !keySecret) {
		console.error("[create-razorpay-order] missing RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET");
		return json({ error: "Payments are not configured yet" }, 500);
	}
	const basicAuth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
	const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
		method: "POST",
		headers: {
			Authorization: `Basic ${basicAuth}`,
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			amount: amountDue,
			currency: order.currency || "INR",
			receipt: order.id
		})
	});
	if (!rzpRes.ok) {
		const errText = await rzpRes.text();
		console.error("[create-razorpay-order] Razorpay API error", rzpRes.status, errText);
		return json({ error: "Could not start payment" }, 502);
	}
	const rzpOrder = await rzpRes.json();
	const { supabaseAdmin } = await import("./client.server-Bw6iWMJ-.mjs");
	const { error: updateErr } = await supabaseAdmin.from("orders").update({ razorpay_order_id: rzpOrder.id }).eq("id", order.id);
	if (updateErr) {
		console.error("[create-razorpay-order] failed to save razorpay_order_id", updateErr);
		return json({ error: "Could not start payment" }, 500);
	}
	return json({
		razorpayOrderId: rzpOrder.id,
		amount: amountDue,
		currency: order.currency || "INR",
		keyId
	});
} } } });
function json(body, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" }
	});
}
async function getAuthenticatedUser(request) {
	const supabaseUrl = processModule.env.SUPABASE_URL;
	const supabaseKey = processModule.env.SUPABASE_PUBLISHABLE_KEY;
	if (!supabaseUrl || !supabaseKey) {
		console.error("[create-razorpay-order] missing SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY");
		return null;
	}
	const authHeader = request.headers.get("authorization");
	if (!authHeader?.startsWith("Bearer ")) return null;
	const token = authHeader.replace("Bearer ", "");
	if (!token || token.split(".").length !== 3) return null;
	const supabase = createClient(supabaseUrl, supabaseKey, {
		global: { headers: { Authorization: `Bearer ${token}` } },
		auth: {
			persistSession: false,
			autoRefreshToken: false
		}
	});
	const { data, error } = await supabase.auth.getClaims(token);
	if (error || !data?.claims?.sub) return null;
	return {
		supabase,
		userId: data.claims.sub
	};
}
var $$splitComponentImporter$7 = () => import("./admin.wallet-COdiBPTl.mjs");
var Route$7 = createFileRoute("/admin/wallet")({ component: lazyRouteComponent($$splitComponentImporter$7, "component") });
var $$splitComponentImporter$6 = () => import("./admin.users-lJvQ-k8S.mjs");
var Route$6 = createFileRoute("/admin/users")({ component: lazyRouteComponent($$splitComponentImporter$6, "component") });
var $$splitComponentImporter$5 = () => import("./admin.taxonomy-B05Wyoer.mjs");
var Route$5 = createFileRoute("/admin/taxonomy")({ component: lazyRouteComponent($$splitComponentImporter$5, "component") });
var $$splitComponentImporter$4 = () => import("./admin.returns-BdOQgOWD.mjs");
var Route$4 = createFileRoute("/admin/returns")({ component: lazyRouteComponent($$splitComponentImporter$4, "component") });
var $$splitComponentImporter$3 = () => import("./admin.products-CvOXwI4L.mjs");
var Route$3 = createFileRoute("/admin/products")({ component: lazyRouteComponent($$splitComponentImporter$3, "component") });
var $$splitComponentImporter$2 = () => import("./admin.orders-BpeowEjx.mjs");
var Route$2 = createFileRoute("/admin/orders")({ component: lazyRouteComponent($$splitComponentImporter$2, "component") });
var $$splitComponentImporter$1 = () => import("./admin.delivery-BrH3kgxR.mjs");
var Route$1 = createFileRoute("/admin/delivery")({ component: lazyRouteComponent($$splitComponentImporter$1, "component") });
var $$splitComponentImporter = () => import("./admin.coupons-DYm98jfg.mjs");
var Route = createFileRoute("/admin/coupons")({ component: lazyRouteComponent($$splitComponentImporter, "component") });
var WarrantyPolicyRoute = Route$27.update({
	id: "/warranty-policy",
	path: "/warranty-policy",
	getParentRoute: () => Route$28
});
var WalletRoute = Route$26.update({
	id: "/wallet",
	path: "/wallet",
	getParentRoute: () => Route$28
});
var TermsRoute = Route$25.update({
	id: "/terms",
	path: "/terms",
	getParentRoute: () => Route$28
});
var ShippingPolicyRoute = Route$24.update({
	id: "/shipping-policy",
	path: "/shipping-policy",
	getParentRoute: () => Route$28
});
var SearchRoute = Route$35.update({
	id: "/search",
	path: "/search",
	getParentRoute: () => Route$28
});
var ReturnsPolicyRoute = Route$23.update({
	id: "/returns-policy",
	path: "/returns-policy",
	getParentRoute: () => Route$28
});
var ProfileRoute = Route$22.update({
	id: "/profile",
	path: "/profile",
	getParentRoute: () => Route$28
});
var PrivacyPolicyRoute = Route$21.update({
	id: "/privacy-policy",
	path: "/privacy-policy",
	getParentRoute: () => Route$28
});
var OrdersRoute = Route$20.update({
	id: "/orders",
	path: "/orders",
	getParentRoute: () => Route$28
});
var ContactRoute = Route$19.update({
	id: "/contact",
	path: "/contact",
	getParentRoute: () => Route$28
});
var CartRoute = Route$18.update({
	id: "/cart",
	path: "/cart",
	getParentRoute: () => Route$28
});
var AuthRoute = Route$17.update({
	id: "/auth",
	path: "/auth",
	getParentRoute: () => Route$28
});
var AdminRoute = Route$16.update({
	id: "/admin",
	path: "/admin",
	getParentRoute: () => Route$28
});
var AboutRoute = Route$15.update({
	id: "/about",
	path: "/about",
	getParentRoute: () => Route$28
});
var IndexRoute = Route$14.update({
	id: "/",
	path: "/",
	getParentRoute: () => Route$28
});
var AdminIndexRoute = Route$13.update({
	id: "/",
	path: "/",
	getParentRoute: () => AdminRoute
});
var ProductSlugRoute = Route$34.update({
	id: "/product/$slug",
	path: "/product/$slug",
	getParentRoute: () => Route$28
});
var OrdersIdRoute = Route$32.update({
	id: "/$id",
	path: "/$id",
	getParentRoute: () => OrdersRoute
});
var CategoryNameRoute = Route$31.update({
	id: "/category/$name",
	path: "/category/$name",
	getParentRoute: () => Route$28
});
var ApiWhatsappWebhookRoute = Route$12.update({
	id: "/api/whatsapp-webhook",
	path: "/api/whatsapp-webhook",
	getParentRoute: () => Route$28
});
var ApiVerifyRazorpayPaymentRoute = Route$11.update({
	id: "/api/verify-razorpay-payment",
	path: "/api/verify-razorpay-payment",
	getParentRoute: () => Route$28
});
var ApiRefundRazorpayPaymentRoute = Route$10.update({
	id: "/api/refund-razorpay-payment",
	path: "/api/refund-razorpay-payment",
	getParentRoute: () => Route$28
});
var ApiRazorpayWebhookRoute = Route$9.update({
	id: "/api/razorpay-webhook",
	path: "/api/razorpay-webhook",
	getParentRoute: () => Route$28
});
var ApiCreateRazorpayOrderRoute = Route$8.update({
	id: "/api/create-razorpay-order",
	path: "/api/create-razorpay-order",
	getParentRoute: () => Route$28
});
var AdminWalletRoute = Route$7.update({
	id: "/wallet",
	path: "/wallet",
	getParentRoute: () => AdminRoute
});
var AdminUsersRoute = Route$6.update({
	id: "/users",
	path: "/users",
	getParentRoute: () => AdminRoute
});
var AdminTaxonomyRoute = Route$5.update({
	id: "/taxonomy",
	path: "/taxonomy",
	getParentRoute: () => AdminRoute
});
var AdminReturnsRoute = Route$4.update({
	id: "/returns",
	path: "/returns",
	getParentRoute: () => AdminRoute
});
var AdminProductsRoute = Route$3.update({
	id: "/products",
	path: "/products",
	getParentRoute: () => AdminRoute
});
var AdminOrdersRoute = Route$2.update({
	id: "/orders",
	path: "/orders",
	getParentRoute: () => AdminRoute
});
var AdminDeliveryRoute = Route$1.update({
	id: "/delivery",
	path: "/delivery",
	getParentRoute: () => AdminRoute
});
var AdminCouponsRoute = Route.update({
	id: "/coupons",
	path: "/coupons",
	getParentRoute: () => AdminRoute
});
var OrdersIdTrackRoute = Route$33.update({
	id: "/track",
	path: "/track",
	getParentRoute: () => OrdersIdRoute
});
var AdminUsersIdRoute = Route$30.update({
	id: "/$id",
	path: "/$id",
	getParentRoute: () => AdminUsersRoute
});
var AdminOrdersRouteChildren = { AdminOrdersIdRoute: Route$29.update({
	id: "/$id",
	path: "/$id",
	getParentRoute: () => AdminOrdersRoute
}) };
var AdminOrdersRouteWithChildren = AdminOrdersRoute._addFileChildren(AdminOrdersRouteChildren);
var AdminUsersRouteChildren = { AdminUsersIdRoute };
var AdminRouteChildren = {
	AdminCouponsRoute,
	AdminDeliveryRoute,
	AdminOrdersRoute: AdminOrdersRouteWithChildren,
	AdminProductsRoute,
	AdminReturnsRoute,
	AdminTaxonomyRoute,
	AdminUsersRoute: AdminUsersRoute._addFileChildren(AdminUsersRouteChildren),
	AdminWalletRoute,
	AdminIndexRoute
};
var AdminRouteWithChildren = AdminRoute._addFileChildren(AdminRouteChildren);
var OrdersIdRouteChildren = { OrdersIdTrackRoute };
var OrdersRouteChildren = { OrdersIdRoute: OrdersIdRoute._addFileChildren(OrdersIdRouteChildren) };
var rootRouteChildren = {
	IndexRoute,
	AboutRoute,
	AdminRoute: AdminRouteWithChildren,
	AuthRoute,
	CartRoute,
	ContactRoute,
	OrdersRoute: OrdersRoute._addFileChildren(OrdersRouteChildren),
	PrivacyPolicyRoute,
	ProfileRoute,
	ReturnsPolicyRoute,
	SearchRoute,
	ShippingPolicyRoute,
	TermsRoute,
	WalletRoute,
	WarrantyPolicyRoute,
	ApiCreateRazorpayOrderRoute,
	ApiRazorpayWebhookRoute,
	ApiRefundRazorpayPaymentRoute,
	ApiVerifyRazorpayPaymentRoute,
	ApiWhatsappWebhookRoute,
	CategoryNameRoute,
	ProductSlugRoute
};
var routeTree = Route$28._addFileChildren(rootRouteChildren)._addFileTypes();
var getRouter = () => {
	return createRouter({
		routeTree,
		context: { queryClient: new QueryClient() },
		scrollRestoration: true,
		defaultPreloadStaleTime: 0
	});
};
//#endregion
export { getRouter };

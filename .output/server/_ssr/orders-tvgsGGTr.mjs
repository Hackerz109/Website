import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { t as formatMoney } from "./cart-e0HpVhNN.mjs";
import { c as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { t as Button } from "./button-BNPKdh9r.mjs";
import { t as supabase } from "./client-C6ZaJElq.mjs";
import { c as useAuth } from "./useAuth-wDRVmRFv.mjs";
import { _ as useNavigate, f as Outlet, g as Link, l as useLocation } from "../_libs/@tanstack/react-router+[...].mjs";
import { r as useQueryClient, t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { Ct as ArrowRight, L as PackageSearch, c as Truck, h as Store } from "../_libs/lucide-react.mjs";
import { n as StoreHeader } from "./StoreHeader-BzV31mqn.mjs";
import { t as StoreFooter } from "./StoreFooter-SqAQEeLg.mjs";
import { t as Badge } from "./badge-BJLbp-XX.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { n as ORDER_STATUS_BADGE_CLASS, r as ORDER_STATUS_LABELS } from "./orderStatus-CtDgXVlR.mjs";
import { t as payForOrder } from "./razorpay-CLuPmmfq.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/orders-tvgsGGTr.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function paymentBadge(status) {
	switch (status) {
		case "paid": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
			className: "bg-green-600 hover:bg-green-600",
			children: "Paid"
		});
		case "failed": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
			variant: "destructive",
			children: "Payment failed"
		});
		case "refunded": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
			variant: "secondary",
			children: "Refunded"
		});
		default: return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
			variant: "outline",
			children: "Payment pending"
		});
	}
}
function OrdersPage() {
	const { user, loading } = useAuth();
	const navigate = useNavigate();
	const location = useLocation();
	const qc = useQueryClient();
	const [payingId, setPayingId] = (0, import_react.useState)(null);
	const isListView = location.pathname === "/orders";
	(0, import_react.useEffect)(() => {
		if (!loading && !user) navigate({ to: "/auth" });
	}, [
		loading,
		user,
		navigate
	]);
	const { data, isLoading } = useQuery({
		enabled: !!user && isListView,
		queryKey: ["my-orders", user?.id],
		queryFn: async () => {
			const { data, error } = await supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false });
			if (error) throw error;
			return data;
		}
	});
	async function retryPay(order) {
		setPayingId(order.id);
		const result = await payForOrder({
			id: order.id,
			customer_name: order.customer_name,
			customer_email: order.customer_email
		});
		setPayingId(null);
		if (result.status === "paid") {
			toast.success("Payment received — thank you!");
			qc.invalidateQueries({ queryKey: ["my-orders", user?.id] });
		} else if (result.status === "error") toast.error(result.message);
	}
	if (!isListView) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-screen bg-background",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StoreHeader, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mx-auto max-w-4xl px-6 py-10",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "text-2xl font-semibold tracking-tight",
						children: "My orders"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm text-muted-foreground",
						children: "Track deliveries, review items, and manage returns."
					}),
					isLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-6 space-y-4",
						children: [...Array(2)].map((_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-40 animate-pulse rounded-2xl border bg-secondary/30" }, i))
					}) : (data ?? []).length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-8 rounded-2xl border border-dashed p-16 text-center text-muted-foreground",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PackageSearch, { className: "mx-auto h-8 w-8 opacity-40" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-3",
								children: "No orders yet."
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/",
								className: "mt-1 inline-block text-sm font-medium text-primary underline underline-offset-4",
								children: "Start shopping"
							})
						]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-6 space-y-4",
						children: data?.map((o) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-md",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "p-5",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex flex-wrap items-center justify-between gap-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-xs text-muted-foreground",
											children: new Date(o.created_at).toLocaleString()
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
											className: "font-mono text-xs text-muted-foreground",
											children: ["Order #", o.id.slice(0, 8)]
										})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center gap-2",
											children: [paymentBadge(o.payment_status), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
												className: ORDER_STATUS_BADGE_CLASS[o.status],
												children: ORDER_STATUS_LABELS[o.status]
											})]
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "mt-2 flex items-center gap-1.5 text-xs text-muted-foreground",
										children: [o.fulfillment_type === "pickup" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Store, { className: "h-3 w-3" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Truck, { className: "h-3 w-3" }), o.fulfillment_type === "pickup" ? "Store Pickup" : "Home Delivery"]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "mt-3 space-y-1 text-sm",
										children: [o.order_items?.slice(0, 3).map((it) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex justify-between text-muted-foreground",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "truncate pr-4",
												children: [
													it.product_name,
													" × ",
													it.quantity
												]
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "flex-shrink-0 text-foreground",
												children: formatMoney(it.unit_price_cents * it.quantity)
											})]
										}, it.id)), (o.order_items?.length ?? 0) > 3 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
											className: "text-xs text-muted-foreground",
											children: [
												"+",
												o.order_items.length - 3,
												" more item(s)"
											]
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "mt-3 flex items-center justify-between border-t pt-3 text-sm font-medium",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Total" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: formatMoney(o.total_cents) })]
									}),
									o.payment_status === "pending" || o.payment_status === "failed" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
										className: "mt-3 w-full",
										size: "sm",
										variant: "outline",
										disabled: payingId === o.id,
										onClick: () => retryPay({
											id: o.id,
											customer_name: o.customer_name,
											customer_email: o.customer_email
										}),
										children: payingId === o.id ? "Opening payment…" : o.payment_status === "failed" ? "Try payment again" : "Pay now"
									}) : null
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
								to: "/orders/$id",
								params: { id: o.id },
								className: "group flex w-full items-center justify-center gap-2 bg-gradient-to-r from-primary to-primary/85 py-3.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 active:opacity-80",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PackageSearch, { className: "h-4 w-4" }),
									"View Order Details",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { className: "h-4 w-4 transition-transform group-hover:translate-x-0.5" })
								]
							})]
						}, o.id))
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StoreFooter, {})
		]
	});
}
//#endregion
export { OrdersPage as component };

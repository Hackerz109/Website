import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { c as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { t as supabase } from "./client-C6ZaJElq.mjs";
import { c as useAuth } from "./useAuth-wDRVmRFv.mjs";
import { _ as useNavigate, g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { c as Truck, h as Store, wt as ArrowLeft } from "../_libs/lucide-react.mjs";
import { n as StoreHeader } from "./StoreHeader-BzV31mqn.mjs";
import { t as StoreFooter } from "./StoreFooter-SqAQEeLg.mjs";
import { t as Badge } from "./badge-BJLbp-XX.mjs";
import { n as ORDER_STATUS_BADGE_CLASS, r as ORDER_STATUS_LABELS } from "./orderStatus-CtDgXVlR.mjs";
import { t as OrderTimeline } from "./OrderTimeline-RT0G6VTr.mjs";
import { t as Route } from "./orders._id.track-cmi0-mJW.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/orders._id.track-6DBKg5Q_.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function OrderTrackPage() {
	const { id } = Route.useParams();
	const { user, loading } = useAuth();
	const navigate = useNavigate();
	(0, import_react.useEffect)(() => {
		if (!loading && !user) navigate({ to: "/auth" });
	}, [
		loading,
		user,
		navigate
	]);
	const { data: order, isLoading: orderLoading, isError: orderErrored, error: orderError } = useQuery({
		enabled: !!user,
		queryKey: ["order-detail", id],
		queryFn: async () => {
			const { data, error } = await supabase.from("orders").select("*, order_items(*)").eq("id", id).single();
			if (error) throw error;
			return data;
		},
		retry: 1
	});
	const { data: history, isLoading: historyLoading } = useQuery({
		enabled: !!user,
		queryKey: ["order-history", id],
		queryFn: async () => {
			const { data, error } = await supabase.from("order_status_history").select("*").eq("order_id", id).order("created_at", { ascending: true });
			if (error) throw error;
			return data;
		}
	});
	if (orderErrored) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-screen bg-background",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StoreHeader, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto max-w-lg p-12 text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm font-medium text-red-600",
					children: "Couldn't load tracking for this order."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-xs text-muted-foreground",
					children: orderError?.message ?? "Please check the link and try again."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/orders",
					className: "mt-4 inline-block text-sm text-primary underline",
					children: "Back to orders"
				})
			]
		})]
	});
	if (!order) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-screen bg-background",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StoreHeader, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "p-12 text-center text-sm text-muted-foreground",
			children: orderLoading ? "Loading tracking…" : "Order not found."
		})]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-screen bg-background",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StoreHeader, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mx-auto max-w-2xl px-6 py-10",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
						to: "/orders/$id",
						params: { id: order.id },
						className: "inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowLeft, { className: "h-3.5 w-3.5" }), " Back to order details"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-4 flex flex-wrap items-center justify-between gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
							className: "text-xl font-semibold tracking-tight",
							children: ["Track Order #", order.id.slice(0, 8)]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground",
							children: [order.fulfillment_type === "pickup" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Store, { className: "h-3 w-3" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Truck, { className: "h-3 w-3" }), order.fulfillment_type === "pickup" ? "Store Pickup" : "Home Delivery"]
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
							className: ORDER_STATUS_BADGE_CLASS[order.status],
							children: ORDER_STATUS_LABELS[order.status]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-6 rounded-xl border p-5",
						children: historyLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-4 w-2/3 animate-pulse rounded bg-secondary/60" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-4 w-1/2 animate-pulse rounded bg-secondary/60" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-4 w-3/5 animate-pulse rounded bg-secondary/60" })
							]
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OrderTimeline, {
							fulfillmentType: order.fulfillment_type,
							currentStatus: order.status,
							history: (history ?? []).map((h) => ({
								id: h.id,
								status: h.status,
								note: h.note,
								created_at: h.created_at
							}))
						})
					}),
					order.fulfillment_type === "pickup" ? order.status === "ready_for_pickup" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-700",
						children: "Your order is ready for pickup at the store!"
					}) : order.status === "out_for_delivery" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-700",
						children: "Your order is out for delivery — it should arrive soon."
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StoreFooter, {})
		]
	});
}
//#endregion
export { OrderTrackPage as component };

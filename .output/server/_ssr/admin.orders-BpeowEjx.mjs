import { t as formatMoney } from "./cart-e0HpVhNN.mjs";
import { c as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { t as Button } from "./button-BNPKdh9r.mjs";
import { t as supabase } from "./client-C6ZaJElq.mjs";
import { f as Outlet, g as Link, l as useLocation } from "../_libs/@tanstack/react-router+[...].mjs";
import { r as useQueryClient, t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { St as ArrowUpRight, c as Truck, h as Store } from "../_libs/lucide-react.mjs";
import { t as Badge } from "./badge-BJLbp-XX.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./select-CEaR62Wk.mjs";
import { a as TableHeader, i as TableHead, n as TableBody, o as TableRow, r as TableCell, t as Table } from "./table-D6qyMGWy.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { r as ORDER_STATUS_LABELS, t as ALL_ORDER_STATUSES } from "./orderStatus-CtDgXVlR.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.orders-BpeowEjx.js
var import_jsx_runtime = require_jsx_runtime();
function fulfillmentBadge(type) {
	return type === "pickup" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
		className: "inline-flex items-center gap-1 text-xs text-muted-foreground",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Store, { className: "h-3 w-3" }), " Pickup"]
	}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
		className: "inline-flex items-center gap-1 text-xs text-muted-foreground",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Truck, { className: "h-3 w-3" }), " Delivery"]
	});
}
function paymentBadge(status) {
	switch (status) {
		case "paid": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
			className: "bg-green-600 hover:bg-green-600",
			children: "Paid"
		});
		case "failed": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
			variant: "destructive",
			children: "Failed"
		});
		case "refunded": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
			variant: "secondary",
			children: "Refunded"
		});
		default: return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
			variant: "outline",
			children: "Pending"
		});
	}
}
function AdminOrders() {
	const qc = useQueryClient();
	const isListView = useLocation().pathname === "/admin/orders";
	const { data } = useQuery({
		enabled: isListView,
		queryKey: ["admin-orders"],
		queryFn: async () => {
			const { data, error } = await supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false });
			if (error) throw error;
			return data;
		}
	});
	if (!isListView) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {});
	async function setStatus(id, status) {
		const { error } = await supabase.from("orders").update({ status }).eq("id", id);
		if (error) return toast.error(error.message);
		toast.success("Order updated");
		qc.invalidateQueries({ queryKey: ["admin-orders"] });
	}
	async function markPayment(id, payment_status) {
		const { error } = await supabase.from("orders").update({
			payment_status,
			paid_at: payment_status === "paid" ? (/* @__PURE__ */ new Date()).toISOString() : null
		}).eq("id", id);
		if (error) return toast.error(error.message);
		toast.success(payment_status === "paid" ? "Marked as paid" : "Payment status updated");
		qc.invalidateQueries({ queryKey: ["admin-orders"] });
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-2xl font-semibold tracking-tight",
				children: "Orders"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-3 md:hidden",
				children: [(data ?? []).map((o) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-xl border p-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-start justify-between gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
									to: "/admin/orders/$id",
									params: { id: o.id },
									className: "inline-flex items-center gap-1 font-mono text-xs font-medium text-primary hover:underline",
									children: [
										"#",
										o.id.slice(0, 8),
										" ",
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowUpRight, { className: "h-3 w-3" })
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs text-muted-foreground",
									children: new Date(o.created_at).toLocaleString()
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-1 text-sm",
									children: o.customer_name ?? "—"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs text-muted-foreground",
									children: o.customer_email
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "mt-1",
									children: fulfillmentBadge(o.fulfillment_type)
								})
							] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-col items-end gap-1",
								children: [paymentBadge(o.payment_status), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-sm font-medium",
									children: formatMoney(o.total_cents, o.currency)
								})]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-2 space-y-0.5 text-xs text-muted-foreground",
							children: o.order_items?.map((it) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
								it.product_name,
								" × ",
								it.quantity
							] }, it.id))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-3 flex items-center gap-2 border-t pt-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
								value: o.status,
								onValueChange: (v) => setStatus(o.id, v),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
									className: "h-9 flex-1",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {})
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: ALL_ORDER_STATUSES.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
									value: s,
									children: ORDER_STATUS_LABELS[s]
								}, s)) })]
							}), o.payment_status !== "paid" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								size: "sm",
								className: "h-9",
								onClick: () => markPayment(o.id, "paid"),
								children: "Mark paid"
							})]
						})
					]
				}, o.id)), (data ?? []).length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "rounded-xl border py-12 text-center text-sm text-muted-foreground",
					children: "No orders yet."
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "hidden rounded-xl border md:block",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Table, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableRow, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Order" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Customer" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Method" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Items" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Total" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Payment" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Status" })
				] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableBody, { children: [(data ?? []).map((o) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableRow, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableCell, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
						to: "/admin/orders/$id",
						params: { id: o.id },
						className: "inline-flex items-center gap-1 font-mono text-xs font-medium text-primary hover:underline",
						children: [
							"#",
							o.id.slice(0, 8),
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowUpRight, { className: "h-3 w-3" })
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-muted-foreground",
						children: new Date(o.created_at).toLocaleString()
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableCell, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm",
						children: o.customer_name ?? "—"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-muted-foreground",
						children: o.customer_email
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { children: fulfillmentBadge(o.fulfillment_type) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "space-y-0.5 text-xs",
						children: o.order_items?.map((it) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							it.product_name,
							" × ",
							it.quantity
						] }, it.id))
					}) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { children: formatMoney(o.total_cents, o.currency) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2",
						children: [paymentBadge(o.payment_status), o.payment_status !== "paid" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							size: "sm",
							variant: "outline",
							onClick: () => markPayment(o.id, "paid"),
							children: "Mark paid"
						})]
					}) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableCell, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
						value: o.status,
						onValueChange: (v) => setStatus(o.id, v),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
							className: "w-40",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: ALL_ORDER_STATUSES.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
							value: s,
							children: ORDER_STATUS_LABELS[s]
						}, s)) })]
					}), o.fulfillment_type === "pickup" && o.status !== "ready_for_pickup" && o.status !== "delivered" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "sm",
						variant: "link",
						className: "h-auto p-0 text-xs",
						onClick: () => setStatus(o.id, "ready_for_pickup"),
						children: "Mark ready for pickup"
					})] })
				] }, o.id)), (data ?? []).length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableRow, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
					colSpan: 7,
					className: "py-12 text-center text-sm text-muted-foreground",
					children: "No orders yet."
				}) })] })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "border-t p-3 text-xs text-muted-foreground",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
						variant: "secondary",
						children: "Tip"
					}), " Payment status updates automatically via Razorpay. Use \"Mark paid\" for bank transfers, cash, or other payments made outside the site."]
				})]
			})
		]
	});
}
//#endregion
export { AdminOrders as component };

import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { t as formatMoney } from "./cart-e0HpVhNN.mjs";
import { c as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { t as Button } from "./button-BNPKdh9r.mjs";
import { t as supabase } from "./client-C6ZaJElq.mjs";
import { g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { r as useQueryClient, t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { H as MapPin, N as Phone, O as Save, U as Mail, c as Truck, g as StickyNote, h as Store, i as Wallet, it as CreditCard, k as RotateCcw, o as User, p as Ticket, rt as ExternalLink, wt as ArrowLeft } from "../_libs/lucide-react.mjs";
import { t as Textarea } from "./textarea-BMjH46cN.mjs";
import { t as Badge } from "./badge-BJLbp-XX.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./select-CEaR62Wk.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { r as ORDER_STATUS_LABELS, t as ALL_ORDER_STATUSES } from "./orderStatus-CtDgXVlR.mjs";
import { t as Route } from "./admin.orders._id-VXMiQWr4.mjs";
import { t as OrderTimeline } from "./OrderTimeline-RT0G6VTr.mjs";
import { o as returnStatusBadgeClass, s as returnStatusLabel } from "./returns-B3w7iGqZ.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.orders._id-B8ff4KPJ.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function AdminOrderDetailPage() {
	const { id } = Route.useParams();
	const qc = useQueryClient();
	const [notesDraft, setNotesDraft] = (0, import_react.useState)(null);
	const [savingNotes, setSavingNotes] = (0, import_react.useState)(false);
	const { data: order, isLoading, isError } = useQuery({
		queryKey: ["admin-order-detail", id],
		queryFn: async () => {
			const { data, error } = await supabase.from("orders").select("*, order_items(*)").eq("id", id).single();
			if (error) throw error;
			return data;
		}
	});
	const { data: history } = useQuery({
		queryKey: ["admin-order-history", id],
		queryFn: async () => {
			const { data, error } = await supabase.from("order_status_history").select("*").eq("order_id", id).order("created_at", { ascending: true });
			if (error) throw error;
			return data;
		}
	});
	const { data: returns } = useQuery({
		queryKey: ["admin-order-returns", id],
		queryFn: async () => {
			const { data, error } = await supabase.from("return_requests").select("*, return_items(*), return_images(*)").eq("order_id", id).order("created_at", { ascending: false });
			if (error) throw error;
			return data;
		}
	});
	async function setStatus(status) {
		const { error } = await supabase.from("orders").update({ status }).eq("id", id);
		if (error) return toast.error(error.message);
		toast.success("Order status updated");
		qc.invalidateQueries({ queryKey: ["admin-order-detail", id] });
		qc.invalidateQueries({ queryKey: ["admin-order-history", id] });
		qc.invalidateQueries({ queryKey: ["admin-orders"] });
	}
	async function markPayment(payment_status) {
		const { error } = await supabase.from("orders").update({
			payment_status,
			paid_at: payment_status === "paid" ? (/* @__PURE__ */ new Date()).toISOString() : null
		}).eq("id", id);
		if (error) return toast.error(error.message);
		toast.success(payment_status === "paid" ? "Marked as paid" : "Payment status updated");
		qc.invalidateQueries({ queryKey: ["admin-order-detail", id] });
		qc.invalidateQueries({ queryKey: ["admin-orders"] });
	}
	async function saveNotes() {
		if (notesDraft === null) return;
		setSavingNotes(true);
		const { error } = await supabase.from("orders").update({ admin_notes: notesDraft }).eq("id", id);
		setSavingNotes(false);
		if (error) return toast.error(error.message);
		toast.success("Note saved");
		qc.invalidateQueries({ queryKey: ["admin-order-detail", id] });
	}
	if (isLoading) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "p-12 text-center text-sm text-muted-foreground",
		children: "Loading order…"
	});
	if (isError || !order) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "p-12 text-center",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-sm font-medium text-red-600",
			children: "Couldn't load this order."
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
			to: "/admin/orders",
			className: "mt-3 inline-block text-sm text-primary underline",
			children: "Back to Orders"
		})]
	});
	const addr = order.shipping_address ?? {};
	const items = order.order_items ?? [];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
			to: "/admin/orders",
			className: "inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowLeft, { className: "h-3.5 w-3.5" }), " Back to Orders"]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-4 flex flex-wrap items-center justify-between gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
				className: "text-xl font-semibold tracking-tight",
				children: ["Order #", order.id.slice(0, 8)]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-xs text-muted-foreground",
				children: ["Placed ", new Date(order.created_at).toLocaleString()]
			})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
					value: order.status,
					onValueChange: (v) => setStatus(v),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
						className: "w-44",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: ALL_ORDER_STATUSES.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
						value: s,
						children: ORDER_STATUS_LABELS[s]
					}, s)) })]
				}), order.payment_status !== "paid" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					size: "sm",
					onClick: () => markPayment("paid"),
					children: "Mark paid"
				})]
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-5 grid gap-5 md:grid-cols-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-5 md:col-span-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, {
						title: "Customer",
						icon: User,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm font-medium",
								children: order.customer_name ?? "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "flex items-center gap-1.5 text-sm text-muted-foreground",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mail, { className: "h-3.5 w-3.5" }),
									" ",
									order.customer_email
								]
							}),
							addr.phone && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "flex items-center gap-1.5 text-sm text-muted-foreground",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Phone, { className: "h-3.5 w-3.5" }),
									" ",
									addr.phone
								]
							}),
							order.user_id ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
								to: "/admin/users/$id",
								params: { id: order.user_id },
								className: "mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline",
								children: ["View full customer profile ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { className: "h-3 w-3" })]
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 text-xs text-muted-foreground",
								children: "Guest checkout — no account"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
						title: order.fulfillment_type === "pickup" ? "Store Pickup" : "Home Delivery",
						icon: order.fulfillment_type === "pickup" ? Store : Truck,
						children: order.fulfillment_type === "pickup" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-muted-foreground",
							children: order.pickup_instructions_snapshot || "No pickup instructions on file."
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "text-sm text-muted-foreground",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-start gap-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MapPin, { className: "mt-0.5 h-3.5 w-3.5 flex-shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
									addr.line1 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-foreground",
										children: addr.line1
									}),
									addr.line2 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: addr.line2 }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [[addr.city, addr.state].filter(Boolean).join(", "), addr.pincode ? ` – ${addr.pincode}` : ""] }),
									!addr.line1 && addr.address && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: addr.address })
								] })]
							}), order.delivery_distance_km != null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-1.5 text-xs",
								children: [order.delivery_distance_km, " km from store"]
							})]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
						title: "Items",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "divide-y",
							children: items.map((it) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between py-2.5 text-sm first:pt-0 last:pb-0",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [it.product_name, it.variant_name && ` (${it.variant_name})`] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "text-xs text-muted-foreground",
									children: [
										it.sku && `SKU ${it.sku} · `,
										"Qty ",
										it.quantity,
										" × ",
										formatMoney(it.unit_price_cents, order.currency)
									]
								})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "font-medium",
									children: formatMoney(it.unit_price_cents * it.quantity, order.currency)
								})]
							}, it.id))
						})
					}),
					order.notes && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
						title: "Customer note",
						icon: StickyNote,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-muted-foreground",
							children: order.notes
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, {
						title: "Admin notes",
						icon: StickyNote,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
							value: notesDraft ?? order.admin_notes ?? "",
							onChange: (e) => setNotesDraft(e.target.value),
							placeholder: "Internal notes about this order — not visible to the customer.",
							rows: 3
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							size: "sm",
							variant: "outline",
							className: "mt-2",
							disabled: notesDraft === null || savingNotes,
							onClick: saveNotes,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Save, { className: "mr-1.5 h-3.5 w-3.5" }),
								" ",
								savingNotes ? "Saving…" : "Save note"
							]
						})]
					}),
					returns && returns.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, {
						title: "Related returns",
						icon: RotateCcw,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "space-y-2",
							children: returns.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between rounded-lg border p-2.5 text-sm",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
									"Return #",
									r.id.slice(0, 8),
									" — ",
									r.reason
								] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
									className: returnStatusBadgeClass(r.status),
									children: returnStatusLabel(r.status)
								})]
							}, r.id))
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/admin/returns",
							className: "mt-2 inline-block text-xs text-primary hover:underline",
							children: "Manage in Returns & Refunds →"
						})]
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, {
					title: "Payment & totals",
					icon: CreditCard,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-1.5 text-sm",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex justify-between",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-muted-foreground",
									children: "Subtotal"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: formatMoney(order.subtotal_cents, order.currency) })]
							}),
							order.discount_cents > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex justify-between text-green-700",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "flex items-center gap-1",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ticket, { className: "h-3 w-3" }),
										" Discount ",
										order.coupon_code && `(${order.coupon_code})`
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["-", formatMoney(order.discount_cents, order.currency)] })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex justify-between",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-muted-foreground",
									children: order.fulfillment_type === "pickup" ? "Pickup charge" : "Delivery fee"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: formatMoney(order.shipping_cents, order.currency) })]
							}),
							order.wallet_used_cents > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex justify-between text-blue-700",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "flex items-center gap-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wallet, { className: "h-3 w-3" }), " Wallet used"]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["-", formatMoney(order.wallet_used_cents, order.currency)] })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex justify-between border-t pt-1.5 font-semibold",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Total" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: formatMoney(order.total_cents, order.currency) })]
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-3 space-y-1.5 border-t pt-3 text-xs text-muted-foreground",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Payment status" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
									variant: order.payment_status === "paid" ? "default" : "outline",
									className: order.payment_status === "paid" ? "bg-green-600 hover:bg-green-600" : "",
									children: order.payment_status
								})]
							}),
							order.paid_at && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: ["Paid ", new Date(order.paid_at).toLocaleString()] }),
							order.razorpay_payment_id && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "truncate",
								children: ["Razorpay: ", order.razorpay_payment_id]
							})
						]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
					title: "Status timeline",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OrderTimeline, {
						fulfillmentType: order.fulfillment_type,
						currentStatus: order.status,
						history: history ?? []
					})
				})]
			})]
		})
	] });
}
function Section({ title, icon: Icon, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-xl border p-5",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
			className: "flex items-center gap-2 text-sm font-semibold",
			children: [
				Icon && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "h-4 w-4" }),
				" ",
				title
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-3",
			children
		})]
	});
}
//#endregion
export { AdminOrderDetailPage as component };

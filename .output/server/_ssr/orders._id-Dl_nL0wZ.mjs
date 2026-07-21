import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { t as formatMoney } from "./cart-e0HpVhNN.mjs";
import { c as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { t as Button } from "./button-BNPKdh9r.mjs";
import { t as supabase } from "./client-C6ZaJElq.mjs";
import { c as useAuth } from "./useAuth-wDRVmRFv.mjs";
import { _ as useNavigate, f as Outlet, g as Link, l as useLocation } from "../_libs/@tanstack/react-router+[...].mjs";
import { r as useQueryClient, t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { A as Receipt, H as MapPin, L as PackageSearch, N as Phone, U as Mail, Z as ImagePlus, c as Truck, g as StickyNote, h as Store, n as X, wt as ArrowLeft, xt as BadgePercent } from "../_libs/lucide-react.mjs";
import { n as StoreHeader } from "./StoreHeader-BzV31mqn.mjs";
import { t as StoreFooter } from "./StoreFooter-SqAQEeLg.mjs";
import { t as Input } from "./input-fWD4AjO2.mjs";
import { t as Label } from "./label-RYLdB5Mm.mjs";
import { t as Textarea } from "./textarea-BMjH46cN.mjs";
import { t as Badge } from "./badge-BJLbp-XX.mjs";
import { a as DialogHeader, i as DialogFooter, n as DialogContent, o as DialogTitle, s as DialogTrigger, t as Dialog } from "./dialog-BrvgweL9.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { n as RadioGroupItem, t as RadioGroup } from "./radio-group-B9sPezFr.mjs";
import { n as ORDER_STATUS_BADGE_CLASS, r as ORDER_STATUS_LABELS } from "./orderStatus-CtDgXVlR.mjs";
import { c as uploadReturnImages, i as fetchMyReturns, o as returnStatusBadgeClass, r as createReturnRequest, s as returnStatusLabel } from "./returns-B3w7iGqZ.mjs";
import { t as payForOrder } from "./razorpay-CLuPmmfq.mjs";
import { t as Route } from "./orders._id-CbwHWNEY.mjs";
import { t as Checkbox } from "./checkbox-CjumKS33.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/orders._id-Dl_nL0wZ.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function OrderDetailPage() {
	const { id } = Route.useParams();
	const { user, loading } = useAuth();
	const navigate = useNavigate();
	const location = useLocation();
	const qc = useQueryClient();
	const [paying, setPaying] = (0, import_react.useState)(false);
	const [returnOpen, setReturnOpen] = (0, import_react.useState)(false);
	const isDetailView = location.pathname === `/orders/${id}`;
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
	const { data: returns } = useQuery({
		enabled: !!user && isDetailView,
		queryKey: [
			"order-returns",
			id,
			user?.id
		],
		queryFn: async () => {
			return (await fetchMyReturns(user.id)).filter((r) => r.order_id === id);
		}
	});
	async function retryPay() {
		if (!order) return;
		setPaying(true);
		const result = await payForOrder({
			id: order.id,
			customer_name: order.customer_name,
			customer_email: order.customer_email
		});
		setPaying(false);
		if (result.status === "paid") {
			toast.success("Payment received — thank you!");
			qc.invalidateQueries({ queryKey: ["order-detail", id] });
		} else if (result.status === "error") toast.error(result.message);
	}
	if (!isDetailView) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {});
	if (orderErrored) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-screen bg-background",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StoreHeader, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto max-w-lg p-12 text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm font-medium text-red-600",
					children: "Couldn't load this order."
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
			children: orderLoading ? "Loading order…" : "Order not found."
		})]
	});
	const alreadyReturnedQty = {};
	for (const r of returns ?? []) {
		if (r.status === "rejected") continue;
		for (const item of r.return_items) alreadyReturnedQty[item.order_item_id] = (alreadyReturnedQty[item.order_item_id] ?? 0) + item.quantity;
	}
	const orderItems = order.order_items ?? [];
	const canRequestReturn = (order.status === "delivered" || order.status === "return_rejected") && orderItems.some((it) => (alreadyReturnedQty[it.id] ?? 0) < it.quantity);
	const addr = order.shipping_address ?? {};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-screen bg-background",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StoreHeader, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mx-auto max-w-3xl px-6 py-10",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
						to: "/orders",
						className: "inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowLeft, { className: "h-3.5 w-3.5" }), " Back to orders"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-4 flex flex-wrap items-center justify-between gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
							className: "text-xl font-semibold tracking-tight",
							children: ["Order #", order.id.slice(0, 8)]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-xs text-muted-foreground",
							children: ["Placed on ", new Date(order.created_at).toLocaleString()]
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
							className: ORDER_STATUS_BADGE_CLASS[order.status],
							children: ORDER_STATUS_LABELS[order.status]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
						to: "/orders/$id/track",
						params: { id: order.id },
						className: "mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary/85 py-3.5 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 active:opacity-80",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PackageSearch, { className: "h-4 w-4" }), "Track This Order"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-6 grid grid-cols-1 gap-3 rounded-xl border p-5 sm:grid-cols-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-muted-foreground",
								children: "Ordered by"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-0.5 truncate text-sm font-medium",
								children: order.customer_name ?? "—"
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-muted-foreground",
								children: "Mobile number"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-0.5 flex items-center gap-1.5 text-sm font-medium",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Phone, { className: "h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" }), addr.phone ?? "—"]
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-muted-foreground",
								children: "Email"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-0.5 flex items-center gap-1.5 truncate text-sm font-medium",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mail, { className: "h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" }), order.customer_email]
							})] })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-6 rounded-xl border p-5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
							className: "flex items-center gap-2 font-semibold",
							children: [order.fulfillment_type === "pickup" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Store, { className: "h-4 w-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Truck, { className: "h-4 w-4" }), order.fulfillment_type === "pickup" ? "Store Pickup" : "Home Delivery"]
						}), order.fulfillment_type === "pickup" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-2 space-y-1 text-sm text-muted-foreground",
							children: [order.pickup_instructions_snapshot && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: order.pickup_instructions_snapshot }), order.status === "ready_for_pickup" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-medium text-green-700",
								children: "Your order is ready for pickup!"
							})]
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-2 space-y-1.5 text-sm",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-start gap-1.5 text-muted-foreground",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MapPin, { className: "mt-0.5 h-3.5 w-3.5 flex-shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
										addr.line1 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-foreground",
											children: addr.line1
										}),
										addr.line2 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: addr.line2 }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [[addr.city, addr.state].filter(Boolean).join(", "), addr.pincode ? ` – ${addr.pincode}` : ""] }),
										!addr.line1 && addr.address && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: addr.address })
									] })]
								}),
								order.delivery_distance_km != null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "text-muted-foreground",
									children: [order.delivery_distance_km, " km from store"]
								}),
								order.delivery_instructions_snapshot && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-muted-foreground",
									children: order.delivery_instructions_snapshot
								})
							]
						})]
					}),
					order.notes && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-6 rounded-xl border p-5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
							className: "flex items-center gap-2 font-semibold",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StickyNote, { className: "h-4 w-4" }), "Note you left at checkout"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-sm text-muted-foreground",
							children: order.notes
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-6 rounded-xl border p-5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "font-semibold",
								children: "Items"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-3 space-y-2 text-sm",
								children: orderItems.map((it) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex justify-between",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
										it.product_name,
										it.variant_name && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "text-muted-foreground",
											children: [
												" (",
												it.variant_name,
												")"
											]
										}),
										" × ",
										it.quantity,
										(alreadyReturnedQty[it.id] ?? 0) > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "ml-1.5 text-xs text-amber-600",
											children: [
												"(",
												alreadyReturnedQty[it.id],
												" returned)"
											]
										})
									] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: formatMoney(it.unit_price_cents * it.quantity) })]
								}, it.id))
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-4 space-y-1.5 border-t pt-3 text-sm",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex justify-between",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-muted-foreground",
											children: "Subtotal"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: formatMoney(order.subtotal_cents) })]
									}),
									order.discount_cents > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex justify-between text-primary",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "flex items-center gap-1.5",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BadgePercent, { className: "h-3.5 w-3.5" }),
												"Coupon discount",
												order.coupon_code ? ` (${order.coupon_code})` : ""
											]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["-", formatMoney(order.discount_cents)] })]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex justify-between",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-muted-foreground",
											children: order.fulfillment_type === "pickup" ? "Pickup charge" : "Delivery charge"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: formatMoney(order.shipping_cents) })]
									}),
									order.wallet_used_cents > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex justify-between text-primary",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Paid via wallet" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["-", formatMoney(order.wallet_used_cents)] })]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex justify-between border-t pt-1.5 text-base font-semibold",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Total paid" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: formatMoney(order.total_cents) })]
									})
								]
							}),
							order.payment_status === "paid" && (order.paid_at || order.razorpay_payment_id) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t pt-3 text-xs text-muted-foreground",
								children: [order.paid_at && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "flex items-center gap-1.5",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Receipt, { className: "h-3.5 w-3.5" }),
										"Paid on ",
										new Date(order.paid_at).toLocaleString()
									]
								}), order.razorpay_payment_id && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["Ref: ", order.razorpay_payment_id.slice(-8)] })]
							}),
							(order.payment_status === "pending" || order.payment_status === "failed") && order.total_cents > order.wallet_used_cents && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								className: "mt-4 w-full",
								size: "sm",
								disabled: paying,
								onClick: retryPay,
								children: paying ? "Opening payment…" : order.payment_status === "failed" ? "Try payment again" : "Pay now"
							})
						]
					}),
					canRequestReturn && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-6 rounded-xl border p-5",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "font-semibold",
								children: "Need to return something?"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Dialog, {
								open: returnOpen,
								onOpenChange: setReturnOpen,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTrigger, {
									asChild: true,
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
										size: "sm",
										variant: "outline",
										children: "Request return"
									})
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogContent, {
									className: "max-h-[85vh] overflow-y-auto",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ReturnRequestForm, {
										order: {
											...order,
											order_items: orderItems
										},
										alreadyReturnedQty,
										userId: user.id,
										onDone: () => {
											setReturnOpen(false);
											qc.invalidateQueries({ queryKey: [
												"order-returns",
												id,
												user?.id
											] });
											qc.invalidateQueries({ queryKey: ["order-detail", id] });
										}
									})
								})]
							})]
						})
					}),
					(returns ?? []).length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-6 rounded-xl border p-5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "font-semibold",
							children: "Return history"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-3 space-y-3",
							children: returns.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "rounded-lg border p-3 text-sm",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "font-medium",
											children: ["Return #", r.id.slice(0, 8)]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
											className: returnStatusBadgeClass(r.status),
											children: returnStatusLabel(r.status)
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "mt-1 text-xs text-muted-foreground",
										children: r.reason
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "mt-1 text-xs text-muted-foreground",
										children: ["Requested ", new Date(r.created_at).toLocaleDateString()]
									}),
									r.admin_notes && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "mt-1 text-xs",
										children: ["Note from store: ", r.admin_notes]
									}),
									r.status === "refunded" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "mt-1 text-xs font-medium text-green-700",
										children: [
											"Refunded ",
											formatMoney(r.refund_amount_cents),
											" ",
											r.refund_method === "wallet_credit" ? "to your wallet" : "to your original payment method"
										]
									})
								]
							}, r.id))
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StoreFooter, {})
		]
	});
}
function ReturnRequestForm({ order, alreadyReturnedQty, userId, onDone }) {
	const [selected, setSelected] = (0, import_react.useState)({});
	const [reason, setReason] = (0, import_react.useState)("");
	const [refundMethod, setRefundMethod] = (0, import_react.useState)("wallet_credit");
	const [files, setFiles] = (0, import_react.useState)([]);
	const [submitting, setSubmitting] = (0, import_react.useState)(false);
	const originalPaymentAvailable = order.payment_status === "paid" && !!order.razorpay_payment_id;
	function toggleItem(itemId, maxQty, checked) {
		setSelected((s) => {
			const next = { ...s };
			if (checked) next[itemId] = Math.min(1, maxQty);
			else delete next[itemId];
			return next;
		});
	}
	async function submit() {
		const items = Object.entries(selected).map(([order_item_id, quantity]) => ({
			order_item_id,
			quantity
		}));
		if (items.length === 0) return toast.error("Select at least one item to return");
		if (!reason.trim()) return toast.error("Please tell us the reason for the return");
		setSubmitting(true);
		const returnId = crypto.randomUUID();
		let imagePaths = [];
		try {
			if (files.length > 0) imagePaths = await uploadReturnImages(userId, returnId, files);
		} catch {
			setSubmitting(false);
			return toast.error("Couldn't upload one or more images — please try again");
		}
		const result = await createReturnRequest({
			orderId: order.id,
			items,
			reason,
			preferredRefundMethod: refundMethod,
			imagePaths,
			id: returnId
		});
		setSubmitting(false);
		if (!result.success) return toast.error(result.message ?? "Couldn't submit return request");
		toast.success("Return request submitted");
		onDone();
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: "Request a return" }) }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "space-y-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Items to return" }), order.order_items.map((it) => {
						const already = alreadyReturnedQty[it.id] ?? 0;
						const max = it.quantity - already;
						if (max <= 0) return null;
						const checked = it.id in selected;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-3 rounded-lg border p-2.5",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Checkbox, {
									checked,
									onCheckedChange: (v) => toggleItem(it.id, max, !!v)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "min-w-0 flex-1 text-sm",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "truncate",
										children: [it.product_name, it.variant_name && ` (${it.variant_name})`]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "text-xs text-muted-foreground",
										children: [
											"Ordered: ",
											it.quantity,
											already > 0 && ` · already returned: ${already}`
										]
									})]
								}),
								checked && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									type: "number",
									min: 1,
									max,
									value: selected[it.id],
									onChange: (e) => setSelected((s) => ({
										...s,
										[it.id]: Math.max(1, Math.min(max, Number(e.target.value) || 1))
									})),
									className: "h-8 w-16"
								})
							]
						}, it.id);
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
					htmlFor: "return-reason",
					children: "Reason for return"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
					id: "return-reason",
					value: reason,
					onChange: (e) => setReason(e.target.value),
					rows: 3,
					placeholder: "What went wrong?"
				})] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Photos (optional)" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-1 flex flex-wrap gap-2",
					children: [files.map((f, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative h-16 w-16 overflow-hidden rounded-lg border",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
							src: URL.createObjectURL(f),
							alt: "",
							className: "h-full w-full object-cover"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setFiles((fs) => fs.filter((_, idx) => idx !== i)),
							className: "absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-3 w-3" })
						})]
					}, i)), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "flex h-16 w-16 cursor-pointer items-center justify-center rounded-lg border border-dashed text-muted-foreground hover:bg-secondary/40",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ImagePlus, { className: "h-5 w-5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "file",
							accept: "image/*",
							multiple: true,
							className: "hidden",
							onChange: (e) => setFiles((fs) => [...fs, ...Array.from(e.target.files ?? [])].slice(0, 6))
						})]
					})]
				})] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Preferred refund method" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(RadioGroup, {
					value: refundMethod,
					onValueChange: (v) => setRefundMethod(v),
					className: "mt-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RadioGroupItem, {
							value: "wallet_credit",
							id: "rm-wallet"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
							htmlFor: "rm-wallet",
							className: "font-normal",
							children: "Store Wallet credit"
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RadioGroupItem, {
							value: "original_payment",
							id: "rm-original",
							disabled: !originalPaymentAvailable
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Label, {
							htmlFor: "rm-original",
							className: `font-normal ${!originalPaymentAvailable ? "text-muted-foreground" : ""}`,
							children: ["Original payment method", !originalPaymentAvailable && " (unavailable for this order)"]
						})]
					})]
				})] })
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogFooter, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
			onClick: submit,
			disabled: submitting,
			className: "w-full",
			children: submitting ? "Submitting…" : "Submit return request"
		}) })
	] });
}
//#endregion
export { OrderDetailPage as component };

import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { t as formatMoney } from "./cart-e0HpVhNN.mjs";
import { c as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { t as Button } from "./button-BNPKdh9r.mjs";
import { t as supabase } from "./client-C6ZaJElq.mjs";
import { r as useQueryClient, t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { X as Image } from "../_libs/lucide-react.mjs";
import { t as Input } from "./input-fWD4AjO2.mjs";
import { t as Textarea } from "./textarea-BMjH46cN.mjs";
import { t as Badge } from "./badge-BJLbp-XX.mjs";
import { a as DialogHeader, i as DialogFooter, n as DialogContent, o as DialogTitle, s as DialogTrigger, t as Dialog } from "./dialog-BrvgweL9.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { a as getReturnImageUrl, n as adminReviewReturn, o as returnStatusBadgeClass, s as returnStatusLabel, t as adminProcessRefund } from "./returns-B3w7iGqZ.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.returns-BdOQgOWD.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function AdminReturns() {
	const qc = useQueryClient();
	const { data } = useQuery({
		queryKey: ["admin-returns"],
		queryFn: async () => {
			const { data, error } = await supabase.from("return_requests").select("*, return_items(*), return_images(*), orders(customer_name, customer_email, payment_status, razorpay_payment_id, total_cents)").order("created_at", { ascending: false });
			if (error) throw error;
			return data;
		}
	});
	function refresh() {
		qc.invalidateQueries({ queryKey: ["admin-returns"] });
	}
	const pending = (data ?? []).filter((r) => r.status === "requested");
	const others = (data ?? []).filter((r) => r.status !== "requested");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-2xl font-semibold tracking-tight",
				children: "Returns & Refunds"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted-foreground",
				children: "Review return requests and process refunds to wallet or original payment method."
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
				className: "mb-3 text-sm font-medium text-muted-foreground",
				children: [
					"Awaiting review (",
					pending.length,
					")"
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-3",
				children: [pending.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ReturnCard, {
					r,
					onChanged: refresh
				}, r.id)), pending.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground",
					children: "Nothing waiting on review."
				})]
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "mb-3 text-sm font-medium text-muted-foreground",
				children: "History"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-3",
				children: [others.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ReturnCard, {
					r,
					onChanged: refresh
				}, r.id)), others.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted-foreground",
					children: "No reviewed returns yet."
				})]
			})] })
		]
	});
}
function ReturnCard({ r, onChanged }) {
	const [reviewOpen, setReviewOpen] = (0, import_react.useState)(false);
	const [refunding, setRefunding] = (0, import_react.useState)(false);
	async function refund(method) {
		setRefunding(true);
		if (method === "wallet_credit") {
			const result = await adminProcessRefund(r.id, "wallet_credit");
			setRefunding(false);
			if (!result.success) return toast.error(result.message ?? "Refund failed");
			toast.success("Refunded to customer's wallet");
			onChanged();
			return;
		}
		const { data: session } = await supabase.auth.getSession();
		const token = session.session?.access_token;
		try {
			const res = await fetch("/api/refund-razorpay-payment", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...token ? { Authorization: `Bearer ${token}` } : {}
				},
				body: JSON.stringify({ returnId: r.id })
			});
			const body = await res.json();
			setRefunding(false);
			if (!res.ok) return toast.error(body.error ?? "Refund failed");
			toast.success("Refunded to original payment method");
			onChanged();
		} catch {
			setRefunding(false);
			toast.error("Couldn't reach the payment gateway");
		}
	}
	const canRefund = r.status === "approved" || r.status === "partially_approved";
	const originalPaymentAvailable = r.orders?.payment_status === "paid" && !!r.orders?.razorpay_payment_id;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-xl border p-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-start justify-between gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm font-medium",
						children: r.orders?.customer_name ?? r.orders?.customer_email ?? "Customer"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-xs text-muted-foreground",
						children: [
							"Order #",
							r.order_id.slice(0, 8),
							" · Return #",
							r.id.slice(0, 8)
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-muted-foreground",
						children: new Date(r.created_at).toLocaleString()
					})
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
					className: returnStatusBadgeClass(r.status),
					children: returnStatusLabel(r.status)
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-sm",
				children: r.reason
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-2 space-y-1 text-xs text-muted-foreground",
				children: r.return_items.map((it) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					"Qty ",
					it.quantity,
					it.approved_quantity != null && it.approved_quantity !== it.quantity && ` (approved: ${it.approved_quantity})`,
					" — ",
					formatMoney(it.unit_price_cents),
					" each"
				] }, it.id))
			}),
			r.return_images.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-2 flex items-center gap-1 text-xs text-muted-foreground",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Image, { className: "h-3 w-3" }),
					" ",
					r.return_images.length,
					" photo",
					r.return_images.length > 1 ? "s" : "",
					" attached"
				]
			}),
			r.admin_notes && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-2 text-xs italic text-muted-foreground",
				children: ["Note: ", r.admin_notes]
			}),
			r.status === "refunded" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-2 text-xs font-medium text-green-700",
				children: [
					"Refunded ",
					formatMoney(r.refund_amount_cents),
					" via ",
					r.refund_method === "wallet_credit" ? "wallet credit" : "original payment method"
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-3 flex flex-wrap items-center gap-2",
				children: [r.status === "requested" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Dialog, {
					open: reviewOpen,
					onOpenChange: setReviewOpen,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTrigger, {
						asChild: true,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							size: "sm",
							children: "Review"
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogContent, {
						className: "max-h-[85vh] overflow-y-auto",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ReviewDialog, {
							r,
							onDone: () => {
								setReviewOpen(false);
								onChanged();
							}
						})
					})]
				}), canRefund && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					size: "sm",
					variant: "outline",
					disabled: refunding,
					onClick: () => refund("wallet_credit"),
					children: "Refund to wallet"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					size: "sm",
					variant: "outline",
					disabled: refunding || !originalPaymentAvailable,
					onClick: () => refund("original_payment"),
					children: ["Refund to original payment", !originalPaymentAvailable && " (unavailable)"]
				})] })]
			})
		]
	});
}
function ReviewDialog({ r, onDone }) {
	const [quantities, setQuantities] = (0, import_react.useState)(Object.fromEntries(r.return_items.map((it) => [it.id, it.quantity])));
	const [notes, setNotes] = (0, import_react.useState)("");
	const [imageUrls, setImageUrls] = (0, import_react.useState)({});
	const [submitting, setSubmitting] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		(async () => {
			const entries = await Promise.all(r.return_images.map(async (img) => [img.id, await getReturnImageUrl(img.url)]));
			setImageUrls(Object.fromEntries(entries.filter(([, url]) => !!url)));
		})();
	}, []);
	async function submit(reject) {
		setSubmitting(true);
		const itemDecisions = r.return_items.map((it) => ({
			return_item_id: it.id,
			approved_quantity: reject ? 0 : Math.max(0, Math.min(it.quantity, quantities[it.id] ?? 0))
		}));
		const anyReduced = !reject && itemDecisions.some((d) => {
			const original = r.return_items.find((it) => it.id === d.return_item_id).quantity;
			return d.approved_quantity < original;
		});
		const decision = reject ? "rejected" : anyReduced ? "partially_approved" : "approved";
		const result = await adminReviewReturn(r.id, decision, notes, itemDecisions);
		setSubmitting(false);
		if (!result.success) return toast.error(result.message ?? "Couldn't submit review");
		toast.success(reject ? "Return rejected" : "Return approved");
		onDone();
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogTitle, { children: ["Review return #", r.id.slice(0, 8)] }) }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "space-y-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm",
					children: r.reason
				}),
				r.return_images.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex flex-wrap gap-2",
					children: r.return_images.map((img) => imageUrls[img.id] ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
						src: imageUrls[img.id],
						alt: "",
						className: "h-20 w-20 rounded-lg border object-cover"
					}, img.id) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex h-20 w-20 items-center justify-center rounded-lg border text-muted-foreground",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Image, { className: "h-5 w-5" })
					}, img.id))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "space-y-2",
					children: r.return_items.map((it) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between gap-3 rounded-lg border p-2.5 text-sm",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: ["Requested qty: ", it.quantity] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-xs text-muted-foreground",
							children: [formatMoney(it.unit_price_cents), " each"]
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-xs text-muted-foreground",
								children: "Approve qty"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								type: "number",
								min: 0,
								max: it.quantity,
								value: quantities[it.id],
								onChange: (e) => setQuantities((q) => ({
									...q,
									[it.id]: Math.max(0, Math.min(it.quantity, Number(e.target.value) || 0))
								})),
								className: "h-8 w-16"
							})]
						})]
					}, it.id))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
					className: "text-sm font-medium",
					children: "Note to customer (optional)"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
					value: notes,
					onChange: (e) => setNotes(e.target.value),
					rows: 2
				})] })
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogFooter, {
			className: "gap-2 sm:gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				variant: "outline",
				disabled: submitting,
				onClick: () => submit(true),
				children: "Reject"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				disabled: submitting,
				onClick: () => submit(false),
				children: "Approve"
			})]
		})
	] });
}
//#endregion
export { AdminReturns as component };

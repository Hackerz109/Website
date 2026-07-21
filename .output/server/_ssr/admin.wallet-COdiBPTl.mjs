import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { t as formatMoney } from "./cart-e0HpVhNN.mjs";
import { c as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { t as Button } from "./button-BNPKdh9r.mjs";
import { t as supabase } from "./client-C6ZaJElq.mjs";
import { g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { r as useQueryClient, t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { E as Search, i as Wallet, rt as ExternalLink } from "../_libs/lucide-react.mjs";
import { t as Input } from "./input-fWD4AjO2.mjs";
import { t as Label } from "./label-RYLdB5Mm.mjs";
import { t as Textarea } from "./textarea-BMjH46cN.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { a as walletTransactionLabel, i as sumBalance, n as fetchWalletTransactions, t as adminAdjustWallet } from "./wallet-i5A9tLwA.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.wallet-COdiBPTl.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function AdminWallet() {
	const [query, setQuery] = (0, import_react.useState)("");
	const [results, setResults] = (0, import_react.useState)([]);
	const [searching, setSearching] = (0, import_react.useState)(false);
	const [selected, setSelected] = (0, import_react.useState)(null);
	async function search() {
		if (!query.trim()) return;
		setSearching(true);
		const { data, error } = await supabase.rpc("admin_search_customers", { p_query: query.trim() });
		setSearching(false);
		if (error) return toast.error(error.message);
		setResults(data ?? []);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-2xl font-semibold tracking-tight",
				children: "Store Wallet"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted-foreground",
				children: "Look up a customer to view their balance, transaction history, or make a manual adjustment."
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					value: query,
					onChange: (e) => setQuery(e.target.value),
					onKeyDown: (e) => e.key === "Enter" && search(),
					placeholder: "Search by name or email"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					onClick: search,
					disabled: searching,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "mr-1.5 h-4 w-4" }), " Search"]
				})]
			}),
			results.length > 0 && !selected && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "divide-y rounded-xl border",
				children: results.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					onClick: () => setSelected(c),
					className: "flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-secondary/50",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: c.full_name || "—" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-muted-foreground",
						children: c.email
					})]
				}, c.id))
			}),
			selected && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CustomerWallet, {
				customer: selected,
				onBack: () => setSelected(null)
			})
		]
	});
}
function CustomerWallet({ customer, onBack }) {
	const qc = useQueryClient();
	const [amount, setAmount] = (0, import_react.useState)("");
	const [reason, setReason] = (0, import_react.useState)("");
	const [submitting, setSubmitting] = (0, import_react.useState)(false);
	const [mode, setMode] = (0, import_react.useState)("credit");
	const { data: transactions } = useQuery({
		queryKey: ["admin-wallet-tx", customer.id],
		queryFn: () => fetchWalletTransactions(customer.id)
	});
	const balance = sumBalance(transactions ?? []);
	async function adjust() {
		const value = Number(amount);
		if (!(value > 0)) return toast.error("Enter an amount greater than 0");
		if (!reason.trim()) return toast.error("A reason is required");
		setSubmitting(true);
		const result = await adminAdjustWallet(customer.id, Math.round(value * 100) * (mode === "debit" ? -1 : 1), reason);
		setSubmitting(false);
		if (!result.success) return toast.error(result.message ?? "Adjustment failed");
		toast.success("Wallet updated");
		setAmount("");
		setReason("");
		qc.invalidateQueries({ queryKey: ["admin-wallet-tx", customer.id] });
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				variant: "ghost",
				size: "sm",
				onClick: onBack,
				children: "← Back to search"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-xl border p-5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted-foreground",
						children: customer.full_name || customer.email
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
						to: "/admin/users/$id",
						params: { id: customer.id },
						className: "inline-flex items-center gap-1 text-xs text-primary hover:underline",
						children: ["Full profile ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { className: "h-3 w-3" })]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-1 flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wallet, { className: "h-5 w-5 text-primary" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-2xl font-semibold",
						children: formatMoney(balance)
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-xl border p-5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "font-medium",
						children: "Manual adjustment"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-3 grid gap-3 sm:grid-cols-[auto_1fr]",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex gap-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								type: "button",
								size: "sm",
								variant: mode === "credit" ? "default" : "outline",
								onClick: () => setMode("credit"),
								children: "Credit"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								type: "button",
								size: "sm",
								variant: mode === "debit" ? "default" : "outline",
								onClick: () => setMode("debit"),
								children: "Debit"
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							type: "number",
							min: 0,
							step: "0.01",
							placeholder: "Amount (₹)",
							value: amount,
							onChange: (e) => setAmount(e.target.value)
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Reason" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
							value: reason,
							onChange: (e) => setReason(e.target.value),
							rows: 2,
							placeholder: "e.g. Goodwill credit for delayed delivery"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						className: "mt-3",
						onClick: adjust,
						disabled: submitting,
						children: submitting ? "Saving…" : `${mode === "credit" ? "Add" : "Deduct"} balance`
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "mb-2 font-medium",
				children: "Transaction history"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-2",
				children: [(transactions ?? []).map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between rounded-lg border p-3 text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-medium",
							children: walletTransactionLabel(t.type)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-muted-foreground",
							children: t.description
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-[11px] text-muted-foreground",
							children: new Date(t.created_at).toLocaleString()
						})
					] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: t.amount_cents >= 0 ? "font-semibold text-green-600" : "font-semibold",
						children: [t.amount_cents >= 0 ? "+" : "-", formatMoney(Math.abs(t.amount_cents))]
					})]
				}, t.id)), (transactions ?? []).length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted-foreground",
					children: "No transactions yet."
				})]
			})] })
		]
	});
}
//#endregion
export { AdminWallet as component };

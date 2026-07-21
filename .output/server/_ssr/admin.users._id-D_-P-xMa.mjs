import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { t as formatMoney } from "./cart-e0HpVhNN.mjs";
import { n as initials } from "./utils-CBUTxTND.mjs";
import { c as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { t as Button } from "./button-BNPKdh9r.mjs";
import { n as AvatarFallback, r as AvatarImage, t as Avatar } from "./avatar-CppsvtHo.mjs";
import { t as supabase } from "./client-C6ZaJElq.mjs";
import { c as useAuth } from "./useAuth-wDRVmRFv.mjs";
import { g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { r as useQueryClient, t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { I as Package, N as Phone, Q as House, S as ShieldOff, U as Mail, at as Copy, bt as Building2, gt as Check, i as Wallet, k as RotateCcw, lt as CircleArrowUp, ot as Clock, ut as CircleArrowDown, vt as Calendar, w as Settings2, wt as ArrowLeft, x as Shield } from "../_libs/lucide-react.mjs";
import { t as Badge } from "./badge-BJLbp-XX.mjs";
import { i as TabsTrigger, n as TabsContent, r as TabsList, t as Tabs } from "./tabs-DJ00V9Pn.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { n as ORDER_STATUS_BADGE_CLASS, r as ORDER_STATUS_LABELS } from "./orderStatus-CtDgXVlR.mjs";
import { o as returnStatusBadgeClass, s as returnStatusLabel } from "./returns-B3w7iGqZ.mjs";
import { r as adminSetAdminRole, t as adminGetCustomer } from "./admin-customers-BoHeaxpM.mjs";
import { t as Route } from "./admin.users._id-RHRCBvpY.mjs";
import { a as walletTransactionLabel, i as sumBalance, n as fetchWalletTransactions } from "./wallet-i5A9tLwA.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.users._id-D_-P-xMa.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function AdminCustomerDetailPage() {
	const { id } = Route.useParams();
	const { user: currentUser } = useAuth();
	const qc = useQueryClient();
	const [copied, setCopied] = (0, import_react.useState)(false);
	const [changingRole, setChangingRole] = (0, import_react.useState)(false);
	const { data: customer, isLoading, isError } = useQuery({
		queryKey: ["admin-customer", id],
		queryFn: () => adminGetCustomer(id)
	});
	const { data: orders } = useQuery({
		queryKey: ["admin-customer-orders", id],
		queryFn: async () => {
			const { data, error } = await supabase.from("orders").select("*").eq("user_id", id).order("created_at", { ascending: false });
			if (error) throw error;
			return data;
		}
	});
	const { data: walletTx } = useQuery({
		queryKey: ["admin-customer-wallet", id],
		queryFn: () => fetchWalletTransactions(id)
	});
	const { data: addresses } = useQuery({
		queryKey: ["admin-customer-addresses", id],
		queryFn: async () => {
			const { data, error } = await supabase.from("user_addresses").select("*").eq("user_id", id).order("is_default", { ascending: false });
			if (error) throw error;
			return data;
		}
	});
	const { data: returns } = useQuery({
		queryKey: ["admin-customer-returns", id],
		queryFn: async () => {
			const { data, error } = await supabase.from("return_requests").select("*, return_items(*), return_images(*)").eq("user_id", id).order("created_at", { ascending: false });
			if (error) throw error;
			return data;
		}
	});
	const walletBalance = sumBalance(walletTx ?? []);
	const isSelf = currentUser?.id === id;
	async function toggleRole() {
		if (!customer) return;
		const makeAdmin = !customer.is_admin;
		if (!confirm(`Are you sure you want to ${makeAdmin ? "grant admin access to" : "remove admin access from"} ${customer.full_name || customer.email}?`)) return;
		setChangingRole(true);
		const result = await adminSetAdminRole(id, makeAdmin);
		setChangingRole(false);
		if (!result.success) return toast.error(result.message ?? "Couldn't update admin access");
		toast.success(makeAdmin ? "Admin access granted" : "Admin access removed");
		qc.invalidateQueries({ queryKey: ["admin-customer", id] });
		qc.invalidateQueries({ queryKey: ["admin-customers"] });
	}
	function copyCode() {
		if (!customer) return;
		navigator.clipboard.writeText(customer.customer_code);
		setCopied(true);
		toast.success("Customer ID copied");
		setTimeout(() => setCopied(false), 1500);
	}
	if (isLoading) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "p-12 text-center text-sm text-muted-foreground",
		children: "Loading customer…"
	});
	if (isError || !customer) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "p-12 text-center",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-sm font-medium text-red-600",
			children: "Couldn't load this customer."
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
			to: "/admin/users",
			className: "mt-3 inline-block text-sm text-primary underline",
			children: "Back to Users"
		})]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
			to: "/admin/users",
			className: "inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowLeft, { className: "h-3.5 w-3.5" }), " Back to Users"]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-4 rounded-2xl border bg-gradient-to-br from-primary/10 to-primary/5 p-6",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-start justify-between gap-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Avatar, {
						className: "h-14 w-14 border-2 border-background shadow-soft",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AvatarImage, {
							src: customer.avatar_url ?? void 0,
							alt: ""
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AvatarFallback, {
							className: "bg-primary/15 text-lg font-semibold text-primary",
							children: initials(customer.full_name, customer.email)
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-lg font-semibold",
								children: customer.full_name || "Unnamed customer"
							}), customer.is_admin && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
								variant: "secondary",
								className: "flex items-center gap-1 text-[10px]",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shield, { className: "h-2.5 w-2.5" }), " Admin"]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "flex items-center gap-1.5 text-sm text-muted-foreground",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mail, { className: "h-3.5 w-3.5" }),
								" ",
								customer.email
							]
						}),
						customer.phone && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "flex items-center gap-1.5 text-sm text-muted-foreground",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Phone, { className: "h-3.5 w-3.5" }),
								" ",
								customer.phone
							]
						})
					] })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					variant: "outline",
					size: "sm",
					disabled: changingRole || isSelf,
					onClick: toggleRole,
					title: isSelf ? "You can't change your own admin access" : void 0,
					children: [customer.is_admin ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldOff, { className: "mr-1.5 h-3.5 w-3.5" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shield, { className: "mr-1.5 h-3.5 w-3.5" }), customer.is_admin ? "Remove admin access" : "Grant admin access"]
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-4 flex flex-wrap gap-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: copyCode,
						className: "flex items-center gap-2 rounded-lg border border-primary/20 bg-background/60 px-3 py-2 text-left transition-colors hover:bg-background",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-[10px] uppercase tracking-wide text-muted-foreground",
							children: "Customer ID"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-mono text-sm font-semibold",
							children: customer.customer_code
						})] }), copied ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-3.5 w-3.5 text-green-600" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { className: "h-3.5 w-3.5 text-muted-foreground" })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-1.5 rounded-lg border border-primary/20 bg-background/60 px-3 py-2 text-xs text-muted-foreground",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Calendar, { className: "h-3.5 w-3.5" }),
							" Joined ",
							new Date(customer.created_at).toLocaleDateString()
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-1.5 rounded-lg border border-primary/20 bg-background/60 px-3 py-2 text-xs text-muted-foreground",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { className: "h-3.5 w-3.5" }),
							" Last seen",
							" ",
							customer.last_seen_at ? new Date(customer.last_seen_at).toLocaleString() : "Never"
						]
					})
				]
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
					icon: Package,
					label: "Orders",
					value: String(customer.order_count)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
					icon: Wallet,
					label: "Total spent",
					value: formatMoney(customer.total_spent_cents)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
					icon: Wallet,
					label: "Wallet balance",
					value: formatMoney(walletBalance)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
					icon: RotateCcw,
					label: "Returns",
					value: String(returns?.length ?? 0)
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tabs, {
			defaultValue: "orders",
			className: "mt-6",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsList, {
					className: "grid w-full grid-cols-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
							value: "orders",
							children: "Orders"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
							value: "wallet",
							children: "Wallet"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
							value: "addresses",
							children: "Addresses"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
							value: "returns",
							children: "Returns"
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
					value: "orders",
					className: "mt-4 space-y-2",
					children: !orders || orders.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, { text: "No orders yet." }) : orders.map((o) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
						to: "/admin/orders/$id",
						params: { id: o.id },
						className: "flex items-center justify-between rounded-xl border p-4 transition-colors hover:bg-secondary/40",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-sm font-medium",
							children: ["#", o.id.slice(0, 8)]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-muted-foreground",
							children: new Date(o.created_at).toLocaleDateString()
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
								className: ORDER_STATUS_BADGE_CLASS[o.status],
								children: ORDER_STATUS_LABELS[o.status]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-sm font-semibold",
								children: formatMoney(o.total_cents)
							})]
						})]
					}, o.id))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsContent, {
					value: "wallet",
					className: "mt-4 space-y-2",
					children: [!walletTx || walletTx.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, { text: "No wallet activity." }) : walletTx.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-3 rounded-xl border p-3.5",
						children: [
							t.type === "debit" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleArrowUp, { className: "h-4 w-4 flex-shrink-0 text-red-500" }) : t.type === "adjustment" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Settings2, { className: "h-4 w-4 flex-shrink-0 text-blue-600" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleArrowDown, { className: "h-4 w-4 flex-shrink-0 text-green-600" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "min-w-0 flex-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-sm font-medium",
									children: walletTransactionLabel(t.type)
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "truncate text-xs text-muted-foreground",
									children: t.description
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex-shrink-0 text-right",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: `text-sm font-semibold ${t.amount_cents >= 0 ? "text-green-600" : "text-foreground"}`,
									children: [t.amount_cents >= 0 ? "+" : "-", formatMoney(Math.abs(t.amount_cents))]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-[11px] text-muted-foreground",
									children: new Date(t.created_at).toLocaleDateString()
								})]
							})
						]
					}, t.id)), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						asChild: true,
						variant: "outline",
						size: "sm",
						className: "w-full",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/admin/wallet",
							children: "Manage wallet balance →"
						})
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
					value: "addresses",
					className: "mt-4 space-y-2",
					children: !addresses || addresses.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, { text: "No saved addresses." }) : addresses.map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-xl border p-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2",
							children: [
								a.label.toLowerCase() === "work" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Building2, { className: "h-3.5 w-3.5 text-muted-foreground" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(House, { className: "h-3.5 w-3.5 text-muted-foreground" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-sm font-medium",
									children: a.label
								}),
								a.is_default && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
									variant: "secondary",
									className: "text-[10px]",
									children: "Default"
								})
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-2 text-sm text-muted-foreground",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "text-foreground",
									children: [a.full_name, a.phone && ` · ${a.phone}`]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [a.line1, a.line2 && `, ${a.line2}`] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
									a.city,
									", ",
									a.state,
									" - ",
									a.pincode
								] })
							]
						})]
					}, a.id))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
					value: "returns",
					className: "mt-4 space-y-2",
					children: !returns || returns.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, { text: "No return requests." }) : returns.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-xl border p-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "text-sm font-medium",
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
							})
						]
					}, r.id))
				})
			]
		})
	] });
}
function StatCard({ icon: Icon, label, value }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-xl border p-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center gap-1.5 text-xs text-muted-foreground",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "h-3.5 w-3.5" }),
				" ",
				label
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-1.5 text-lg font-semibold",
			children: value
		})]
	});
}
function EmptyState({ text }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground",
		children: text
	});
}
//#endregion
export { AdminCustomerDetailPage as component };

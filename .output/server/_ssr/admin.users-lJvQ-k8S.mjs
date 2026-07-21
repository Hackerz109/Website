import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { t as formatMoney } from "./cart-e0HpVhNN.mjs";
import { n as initials } from "./utils-CBUTxTND.mjs";
import { c as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { t as Button } from "./button-BNPKdh9r.mjs";
import { n as AvatarFallback, r as AvatarImage, t as Avatar } from "./avatar-CppsvtHo.mjs";
import { _ as useNavigate, f as Outlet, l as useLocation } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { E as Search, a as Users, mt as ChevronLeft, pt as ChevronRight, x as Shield } from "../_libs/lucide-react.mjs";
import { t as Input } from "./input-fWD4AjO2.mjs";
import { t as Badge } from "./badge-BJLbp-XX.mjs";
import { n as adminListCustomers } from "./admin-customers-BoHeaxpM.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.users-lJvQ-k8S.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var PAGE_SIZE = 20;
function AdminUsersPage() {
	const navigate = useNavigate();
	const location = useLocation();
	const [search, setSearch] = (0, import_react.useState)("");
	const [committedSearch, setCommittedSearch] = (0, import_react.useState)("");
	const [page, setPage] = (0, import_react.useState)(0);
	const isListView = location.pathname === "/admin/users";
	const { data, isLoading } = useQuery({
		enabled: isListView,
		queryKey: [
			"admin-customers",
			committedSearch,
			page
		],
		queryFn: () => adminListCustomers(committedSearch, PAGE_SIZE, page * PAGE_SIZE)
	});
	if (!isListView) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {});
	const rows = data?.rows ?? [];
	const total = data?.totalCount ?? 0;
	const from = total === 0 ? 0 : page * PAGE_SIZE + 1;
	const to = Math.min(total, (page + 1) * PAGE_SIZE);
	function submitSearch(e) {
		e.preventDefault();
		setPage(0);
		setCommittedSearch(search);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-wrap items-center justify-between gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-xl font-semibold tracking-tight",
				children: "Users"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-0.5 text-sm text-muted-foreground",
				children: "Every customer account, their Customer ID, orders, and wallet balance."
			})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Users, { className: "h-3.5 w-3.5" }),
					" ",
					total,
					" total"
				]
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
			onSubmit: submitSearch,
			className: "mt-5 flex gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative flex-1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					value: search,
					onChange: (e) => setSearch(e.target.value),
					placeholder: "Search by name, email, phone, or Customer ID…",
					className: "pl-9"
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				type: "submit",
				variant: "secondary",
				children: "Search"
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-5 space-y-2",
			children: isLoading ? Array.from({ length: 5 }).map((_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-20 animate-pulse rounded-xl bg-secondary/50" }, i)) : rows.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground",
				children: committedSearch ? "No customers match that search." : "No customers yet."
			}) : rows.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				onClick: () => navigate({
					to: "/admin/users/$id",
					params: { id: c.id }
				}),
				className: "flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors hover:bg-secondary/40",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Avatar, {
						className: "h-10 w-10 flex-shrink-0",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AvatarImage, {
							src: c.avatar_url ?? void 0,
							alt: ""
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AvatarFallback, {
							className: "bg-primary/10 text-xs font-semibold text-primary",
							children: initials(c.full_name, c.email)
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0 flex-1",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "truncate text-sm font-medium",
									children: c.full_name || "Unnamed customer"
								}), c.is_admin && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
									variant: "secondary",
									className: "flex items-center gap-1 text-[10px]",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shield, { className: "h-2.5 w-2.5" }), " Admin"]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "truncate text-xs text-muted-foreground",
								children: c.email
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-0.5 font-mono text-[11px] text-muted-foreground",
								children: c.customer_code
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "hidden flex-shrink-0 text-right sm:block",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-sm font-semibold",
							children: [
								c.order_count,
								" order",
								c.order_count === 1 ? "" : "s"
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-xs text-muted-foreground",
							children: [formatMoney(c.total_spent_cents), " spent"]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "hidden flex-shrink-0 text-right md:block",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm font-semibold",
							children: formatMoney(c.wallet_balance_cents)
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-muted-foreground",
							children: "wallet"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "h-4 w-4 flex-shrink-0 text-muted-foreground" })
				]
			}, c.id))
		}),
		total > PAGE_SIZE && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-5 flex items-center justify-between text-sm text-muted-foreground",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
				from,
				"–",
				to,
				" of ",
				total
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					variant: "outline",
					size: "sm",
					disabled: page === 0,
					onClick: () => setPage((p) => Math.max(0, p - 1)),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronLeft, { className: "mr-1 h-3.5 w-3.5" }), " Prev"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					variant: "outline",
					size: "sm",
					disabled: to >= total,
					onClick: () => setPage((p) => p + 1),
					children: ["Next ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "ml-1 h-3.5 w-3.5" })]
				})]
			})]
		})
	] });
}
//#endregion
export { AdminUsersPage as component };

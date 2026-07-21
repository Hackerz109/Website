import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { t as cn } from "./utils-CBUTxTND.mjs";
import { c as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { t as Button } from "./button-BNPKdh9r.mjs";
import { t as supabase } from "./client-C6ZaJElq.mjs";
import { c as useAuth } from "./useAuth-wDRVmRFv.mjs";
import { _ as useNavigate, f as Outlet, g as Link, l as useLocation } from "../_libs/@tanstack/react-router+[...].mjs";
import { I as Package, J as LayoutDashboard, V as MapPinned, W as LogOut, a as Users, i as Wallet, k as RotateCcw, m as Tags, p as Ticket, rt as ExternalLink, y as ShoppingCart } from "../_libs/lucide-react.mjs";
import { n as StoreHeader } from "./StoreHeader-BzV31mqn.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin-CmI7AQ6Q.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function AdminLayout() {
	const { user, isAdmin, loading } = useAuth();
	const navigate = useNavigate();
	const location = useLocation();
	(0, import_react.useEffect)(() => {
		if (loading) return;
		if (!user) navigate({ to: "/auth" });
	}, [
		loading,
		user,
		navigate
	]);
	if (loading) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "p-12 text-center text-sm text-muted-foreground",
		children: "Loading…"
	});
	if (!user) return null;
	if (!isAdmin) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-screen bg-background",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StoreHeader, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto max-w-md p-12 text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-xl font-semibold",
					children: "Admin access required"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted-foreground",
					children: "Your account isn't an admin yet. Ask the site owner to promote you, or if this is the first account, run the promotion step in chat."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-4 text-xs text-muted-foreground",
					children: ["Signed in as ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-mono",
						children: user.email
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					asChild: true,
					variant: "outline",
					className: "mt-6",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/",
						children: "Back to store"
					})
				})
			]
		})]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-screen bg-background",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("header", {
			className: "border-b bg-background/80 backdrop-blur",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LayoutDashboard, { className: "h-5 w-5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-semibold",
						children: "Admin"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-1 sm:gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						asChild: true,
						variant: "ghost",
						size: "sm",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
							to: "/",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { className: "h-4 w-4 sm:mr-2" }),
								" ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "hidden sm:inline",
									children: "View store"
								})
							]
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						variant: "ghost",
						size: "sm",
						onClick: async () => {
							await supabase.auth.signOut();
							navigate({ to: "/" });
						},
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LogOut, { className: "h-4 w-4 sm:mr-2" }),
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "hidden sm:inline",
								children: "Sign out"
							})
						]
					})]
				})]
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 sm:py-8 md:flex-row md:gap-8",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("aside", {
				className: "-mx-4 flex-shrink-0 border-b px-4 pb-3 sm:-mx-6 sm:px-6 md:mx-0 md:w-56 md:border-b-0 md:px-0 md:pb-0",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
					className: "flex gap-1 overflow-x-auto md:flex-col md:overflow-visible",
					children: [
						{
							to: "/admin",
							label: "Overview",
							icon: LayoutDashboard,
							exact: true
						},
						{
							to: "/admin/users",
							label: "Users",
							icon: Users
						},
						{
							to: "/admin/products",
							label: "Products",
							icon: Package
						},
						{
							to: "/admin/taxonomy",
							label: "Categories & Brands",
							icon: Tags
						},
						{
							to: "/admin/coupons",
							label: "Coupons",
							icon: Ticket
						},
						{
							to: "/admin/orders",
							label: "Orders",
							icon: ShoppingCart
						},
						{
							to: "/admin/delivery",
							label: "Delivery & Pickup",
							icon: MapPinned
						},
						{
							to: "/admin/returns",
							label: "Returns & Refunds",
							icon: RotateCcw
						},
						{
							to: "/admin/wallet",
							label: "Store Wallet",
							icon: Wallet
						}
					].map((n) => {
						const active = n.exact ? location.pathname === n.to : location.pathname.startsWith(n.to);
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
							to: n.to,
							className: cn("flex flex-shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm", active ? "bg-secondary font-medium" : "text-muted-foreground hover:bg-secondary/60"),
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(n.icon, { className: "h-4 w-4" }),
								" ",
								n.label
							]
						}, n.to);
					})
				})
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
				className: "min-w-0 flex-1",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {})
			})]
		})]
	});
}
//#endregion
export { AdminLayout as component };

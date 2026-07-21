import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { n as useCart, t as formatMoney } from "./cart-e0HpVhNN.mjs";
import { n as initials, t as cn } from "./utils-CBUTxTND.mjs";
import { c as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { t as Button } from "./button-BNPKdh9r.mjs";
import { n as AvatarFallback, r as AvatarImage, t as Avatar } from "./avatar-CppsvtHo.mjs";
import { t as supabase } from "./client-C6ZaJElq.mjs";
import { c as useAuth } from "./useAuth-wDRVmRFv.mjs";
import { _ as useNavigate, g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { E as Search, J as LayoutDashboard, W as LogOut, b as ShoppingBag, ct as CircleUser, gt as Check, i as Wallet, n as X, pt as ChevronRight, q as LoaderCircle, st as Circle, t as Zap } from "../_libs/lucide-react.mjs";
import { a as Label2, c as Root2, d as SubTrigger2, f as Trigger, i as ItemIndicator2, l as Separator2, n as Content2, o as Portal2, r as Item2, s as RadioItem2, t as CheckboxItem2, u as SubContent2 } from "../_libs/@radix-ui/react-dropdown-menu+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/StoreHeader-BzV31mqn.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function sanitize(q) {
	return q.replace(/[%,()]/g, " ").trim();
}
function SearchBar({ className = "", autoFocus = false, onNavigate }) {
	const [query, setQuery] = (0, import_react.useState)("");
	const [debounced, setDebounced] = (0, import_react.useState)("");
	const [open, setOpen] = (0, import_react.useState)(false);
	const navigate = useNavigate();
	const inputRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		const t = setTimeout(() => setDebounced(sanitize(query)), 250);
		return () => clearTimeout(t);
	}, [query]);
	const { data: results, isFetching } = useQuery({
		queryKey: ["search-preview", debounced],
		queryFn: async () => {
			const term = `%${debounced}%`;
			const [{ data: matchedCategories }, { data: matchedBrands }] = await Promise.all([supabase.from("categories").select("id").ilike("name", term), supabase.from("brands").select("id").ilike("name", term)]);
			const categoryIds = (matchedCategories ?? []).map((c) => c.id);
			const brandIds = (matchedBrands ?? []).map((b) => b.id);
			const orParts = [`name.ilike.${term}`, `description.ilike.${term}`];
			if (categoryIds.length > 0) orParts.push(`category_id.in.(${categoryIds.join(",")})`);
			if (brandIds.length > 0) orParts.push(`brand_id.in.(${brandIds.join(",")})`);
			const { data, error } = await supabase.from("products").select("id, name, slug, price_cents, currency, image_url, product_images(url, is_primary), product_variants(price_cents, stock), categories(name)").eq("active", true).or(orParts.join(",")).limit(6);
			if (error) throw error;
			return data;
		},
		enabled: debounced.length > 1
	});
	function goToResults() {
		const q = query.trim();
		if (!q) return;
		navigate({
			to: "/search",
			search: { q }
		});
		setOpen(false);
		onNavigate?.();
	}
	const showDropdown = open && debounced.length > 1;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `relative ${className}`,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("form", {
			onSubmit: (e) => {
				e.preventDefault();
				goToResults();
			},
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						ref: inputRef,
						autoFocus,
						value: query,
						onChange: (e) => setQuery(e.target.value),
						onFocus: () => setOpen(true),
						onBlur: () => setTimeout(() => setOpen(false), 150),
						placeholder: "Search products, categories…",
						className: "w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-9 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
					}),
					query && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onMouseDown: (e) => e.preventDefault(),
						onClick: () => {
							setQuery("");
							setDebounced("");
							inputRef.current?.focus();
						},
						className: "absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-4 w-4" })
					})
				]
			})
		}), showDropdown && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-2xl border border-border bg-card shadow-soft-lg",
			children: isFetching ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-4 w-4 animate-spin" }), " Searching…"]
			}) : !results || results.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "p-6 text-center text-sm text-muted-foreground",
				children: [
					"No results for \"",
					debounced,
					"\""
				]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { children: results.map((p) => {
				const img = p.product_images?.find((i) => i.is_primary)?.url ?? p.product_images?.[0]?.url ?? p.image_url;
				const variantPrices = (p.product_variants ?? []).map((v) => v.price_cents);
				const priceLabel = variantPrices.length > 0 ? Math.min(...variantPrices) === Math.max(...variantPrices) ? formatMoney(Math.min(...variantPrices), p.currency) : `From ${formatMoney(Math.min(...variantPrices), p.currency)}` : formatMoney(p.price_cents, p.currency);
				return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onMouseDown: (e) => e.preventDefault(),
					onClick: () => {
						navigate({
							to: "/product/$slug",
							params: { slug: p.slug }
						});
						setOpen(false);
						setQuery("");
						onNavigate?.();
					},
					className: "flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-accent",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-secondary",
							children: img && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
								src: img,
								alt: "",
								className: "h-full w-full object-cover"
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "min-w-0 flex-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "truncate text-sm font-medium",
								children: p.name
							}), p.categories?.name && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "truncate text-xs text-muted-foreground",
								children: p.categories.name
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "flex-shrink-0 text-sm font-semibold",
							children: priceLabel
						})
					]
				}) }, p.id);
			}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				onMouseDown: (e) => e.preventDefault(),
				onClick: goToResults,
				className: "w-full border-t border-border px-4 py-2.5 text-center text-sm font-semibold text-primary hover:bg-accent",
				children: [
					"View all results for \"",
					query.trim(),
					"\""
				]
			})] })
		})]
	});
}
var DropdownMenu = Root2;
var DropdownMenuTrigger = Trigger;
var DropdownMenuSubTrigger = import_react.forwardRef(({ className, inset, children, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SubTrigger2, {
	ref,
	className: cn("flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent data-[state=open]:bg-accent [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0", inset && "pl-8", className),
	...props,
	children: [children, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "ml-auto" })]
}));
DropdownMenuSubTrigger.displayName = SubTrigger2.displayName;
var DropdownMenuSubContent = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SubContent2, {
	ref,
	className: cn("z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-dropdown-menu-content-transform-origin)", className),
	...props
}));
DropdownMenuSubContent.displayName = SubContent2.displayName;
var DropdownMenuContent = import_react.forwardRef(({ className, sideOffset = 4, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Portal2, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Content2, {
	ref,
	sideOffset,
	className: cn("z-50 max-h-[var(--radix-dropdown-menu-content-available-height)] min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md", "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-dropdown-menu-content-transform-origin)", className),
	...props
}) }));
DropdownMenuContent.displayName = Content2.displayName;
var DropdownMenuItem = import_react.forwardRef(({ className, inset, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Item2, {
	ref,
	className: cn("relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0", inset && "pl-8", className),
	...props
}));
DropdownMenuItem.displayName = Item2.displayName;
var DropdownMenuCheckboxItem = import_react.forwardRef(({ className, children, checked, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CheckboxItem2, {
	ref,
	className: cn("relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50", className),
	checked,
	...props,
	children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "absolute left-2 flex h-3.5 w-3.5 items-center justify-center",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ItemIndicator2, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-4 w-4" }) })
	}), children]
}));
DropdownMenuCheckboxItem.displayName = CheckboxItem2.displayName;
var DropdownMenuRadioItem = import_react.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(RadioItem2, {
	ref,
	className: cn("relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50", className),
	...props,
	children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "absolute left-2 flex h-3.5 w-3.5 items-center justify-center",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ItemIndicator2, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Circle, { className: "h-2 w-2 fill-current" }) })
	}), children]
}));
DropdownMenuRadioItem.displayName = RadioItem2.displayName;
var DropdownMenuLabel = import_react.forwardRef(({ className, inset, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label2, {
	ref,
	className: cn("px-2 py-1.5 text-sm font-semibold", inset && "pl-8", className),
	...props
}));
DropdownMenuLabel.displayName = Label2.displayName;
var DropdownMenuSeparator = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Separator2, {
	ref,
	className: cn("-mx-1 my-1 h-px bg-muted", className),
	...props
}));
DropdownMenuSeparator.displayName = Separator2.displayName;
var DropdownMenuShortcut = ({ className, ...props }) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: cn("ml-auto text-xs tracking-widest opacity-60", className),
		...props
	});
};
DropdownMenuShortcut.displayName = "DropdownMenuShortcut";
function StoreHeader() {
	const count = useCart((s) => s.items.reduce((sum, i) => sum + i.quantity, 0));
	const { user, isAdmin, profile } = useAuth();
	const navigate = useNavigate();
	const [mobileSearchOpen, setMobileSearchOpen] = (0, import_react.useState)(false);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
		className: "sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
					to: "/",
					className: "flex flex-shrink-0 items-center gap-2.5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-soft",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Zap, { className: "h-4 w-4 fill-current" })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-display text-lg font-bold tracking-tight text-foreground",
						children: "My Shop"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mx-6 hidden max-w-md flex-1 md:block",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SearchBar, {})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", {
					className: "flex items-center gap-1.5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "ghost",
							size: "sm",
							className: "rounded-lg md:hidden",
							onClick: () => setMobileSearchOpen((v) => !v),
							children: mobileSearchOpen ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-4 w-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "h-4 w-4" })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							asChild: true,
							variant: "ghost",
							size: "sm",
							className: "rounded-lg",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
								to: "/cart",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShoppingBag, { className: "h-4 w-4" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "ml-2 hidden sm:inline",
										children: "Cart"
									}),
									count > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "ml-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold text-primary-foreground",
										children: count
									})
								]
							})
						}),
						user ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenu, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuTrigger, {
							asChild: true,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								variant: "ghost",
								size: "sm",
								className: "rounded-lg px-1.5 sm:px-2.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Avatar, {
									className: "h-6 w-6",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AvatarImage, {
										src: profile?.avatar_url ?? void 0,
										alt: ""
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AvatarFallback, {
										className: "bg-primary/10 text-[10px] font-semibold text-primary",
										children: initials(profile?.full_name, user.email)
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "ml-2 hidden max-w-[120px] truncate sm:inline",
									children: profile?.full_name || user.email
								})]
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenuContent, {
							align: "end",
							className: "w-56",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenuLabel, {
									className: "font-normal",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "truncate text-sm font-medium text-foreground",
											children: profile?.full_name || "Your account"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "truncate text-xs text-muted-foreground",
											children: user.email
										}),
										profile?.customer_code && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "mt-1 inline-block rounded-full bg-secondary px-2 py-0.5 font-mono text-[10px] tracking-wide text-muted-foreground",
											children: profile.customer_code
										})
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuSeparator, {}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenuItem, {
									onClick: () => navigate({ to: "/profile" }),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleUser, { className: "mr-2 h-4 w-4" }), " My profile"]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuItem, {
									onClick: () => navigate({ to: "/orders" }),
									children: "My orders"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenuItem, {
									onClick: () => navigate({ to: "/wallet" }),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wallet, { className: "mr-2 h-4 w-4" }), " Store Wallet"]
								}),
								isAdmin && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenuItem, {
									onClick: () => navigate({ to: "/admin" }),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LayoutDashboard, { className: "mr-2 h-4 w-4" }), " Admin dashboard"]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuSeparator, {}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenuItem, {
									onClick: async () => {
										await supabase.auth.signOut();
										navigate({ to: "/" });
									},
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LogOut, { className: "mr-2 h-4 w-4" }), " Sign out"]
								})
							]
						})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							asChild: true,
							size: "sm",
							className: "rounded-lg shadow-soft",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/auth",
								children: "Sign in"
							})
						})
					]
				})
			]
		}), mobileSearchOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "border-t border-border px-4 py-3 md:hidden",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SearchBar, {
				autoFocus: true,
				onNavigate: () => setMobileSearchOpen(false)
			})
		})]
	});
}
//#endregion
export { StoreHeader as n, SearchBar as t };

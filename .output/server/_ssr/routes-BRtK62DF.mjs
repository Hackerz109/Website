import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { t as cn } from "./utils-CBUTxTND.mjs";
import { c as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { t as Button } from "./button-BNPKdh9r.mjs";
import { t as supabase } from "./client-C6ZaJElq.mjs";
import { c as useAuth } from "./useAuth-wDRVmRFv.mjs";
import { g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { C as ShieldCheck, M as Plug, P as Percent, R as PackageCheck, Y as IndianRupee, at as Copy, b as ShoppingBag, c as Truck, et as Fan, f as ToggleLeft, gt as Check, p as Ticket, t as Zap, yt as Cable } from "../_libs/lucide-react.mjs";
import { n as StoreHeader } from "./StoreHeader-BzV31mqn.mjs";
import { t as StoreFooter } from "./StoreFooter-SqAQEeLg.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { n as fetchEligibleCoupons, t as describeCoupon } from "./coupons-CAkuEXl3.mjs";
import { t as ProductCard } from "./ProductCard-CjjWhxkf.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-BRtK62DF.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var BRANDS = [
	{
		name: "Havells",
		src: "/brands/havells.png"
	},
	{
		name: "Orient Electric",
		src: "/brands/orient-electric.png"
	},
	{
		name: "Anchor by Panasonic",
		src: "/brands/anchor-panasonic.png"
	},
	{
		name: "REO",
		src: "/brands/reo.png"
	},
	{
		name: "KEI Wires & Cables",
		src: "/brands/kei.png"
	},
	{
		name: "Polycab",
		src: "/brands/polycab.png"
	},
	{
		name: "Summercool",
		src: "/brands/summercool.jpg"
	},
	{
		name: "Vansal",
		src: "/brands/vansal.png"
	},
	{
		name: "Crompton",
		src: "/brands/crompton.png"
	}
];
function LogoTile({ name, src }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "mx-3 flex h-24 w-40 flex-shrink-0 items-center justify-center rounded-2xl border border-border bg-card p-4 shadow-soft",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
			src,
			alt: name,
			title: name,
			className: "max-h-full max-w-full object-contain grayscale opacity-70 transition-all duration-300 hover:grayscale-0 hover:opacity-100"
		})
	});
}
function BrandsStrip() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "border-y border-border bg-card/50 py-12",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto max-w-6xl px-6",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground",
				children: "Brands we carry"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "mt-1 text-center text-xl font-extrabold tracking-tight text-foreground md:text-2xl",
				children: "Genuine products, trusted names"
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-8 overflow-hidden",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "brand-track",
				children: [BRANDS.map((b) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LogoTile, { ...b }, `${b.name}-a`)), BRANDS.map((b) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LogoTile, { ...b }, `${b.name}-b`))]
			})
		})]
	});
}
function iconFor(type) {
	if (type === "percentage") return Percent;
	if (type === "free_shipping") return Truck;
	return IndianRupee;
}
function CouponTicket({ coupon }) {
	const [copied, setCopied] = (0, import_react.useState)(false);
	const Icon = iconFor(coupon.discount_type);
	async function copy() {
		try {
			await navigator.clipboard.writeText(coupon.code);
			setCopied(true);
			toast.success(`Copied "${coupon.code}"`);
			setTimeout(() => setCopied(false), 1800);
		} catch {
			toast.error("Couldn't copy — long-press the code instead.");
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "relative mx-2 flex w-72 flex-shrink-0 overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "absolute inset-y-0 left-[74px] flex flex-col justify-between py-1",
				children: Array.from({ length: 8 }).map((_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "h-1.5 w-1.5 rounded-full bg-background" }, i))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex w-[74px] flex-shrink-0 flex-col items-center justify-center gap-1 border-r border-dashed border-primary-foreground/30 px-2 py-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "h-6 w-6" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-center text-[10px] font-medium uppercase tracking-wide opacity-80",
					children: "Offer"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-1 flex-col justify-between p-4 pl-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-base font-bold leading-tight",
						children: describeCoupon(coupon)
					}),
					coupon.description && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 line-clamp-2 text-xs text-primary-foreground/80",
						children: coupon.description
					}),
					coupon.min_order_cents ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-1 text-[11px] text-primary-foreground/70",
						children: ["On orders above ₹", (coupon.min_order_cents / 100).toFixed(0)]
					}) : null
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: copy,
					className: cn("mt-3 flex items-center justify-between gap-2 rounded-lg bg-background/15 px-3 py-2 font-mono text-sm font-semibold backdrop-blur-sm transition hover:bg-background/25"),
					children: [coupon.code, copied ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-3.5 w-3.5" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { className: "h-3.5 w-3.5" })]
				})]
			})
		]
	});
}
/**
* A highlighted, "you qualify for this" coupon strip. Only ever shows
* coupons the current visitor is actually eligible for right now — a
* first-order coupon drops off the instant they've placed one, a
* logged-in-only coupon is hidden from guests, and so on, so nothing shown
* here can end up being a broken promise at checkout.
*/
function CouponShowcase() {
	const { user } = useAuth();
	const [coupons, setCoupons] = (0, import_react.useState)([]);
	const [loaded, setLoaded] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		fetchEligibleCoupons(user?.id ?? null).then((c) => {
			setCoupons(c);
			setLoaded(true);
		});
	}, [user?.id]);
	if (!loaded || coupons.length === 0) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "border-y border-border bg-secondary/30 py-10",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto max-w-6xl px-6",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ticket, { className: "h-3.5 w-3.5" }), " Offers for you"]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "mt-1 text-xl font-extrabold tracking-tight text-foreground md:text-2xl",
				children: "Deals you're eligible for right now"
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-6 flex overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mx-auto flex",
				children: coupons.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CouponTicket, { coupon: c }, c.code))
			})
		})]
	});
}
function Index() {
	const { data, isLoading, isError } = useQuery({
		queryKey: ["products", "public"],
		queryFn: async () => {
			const { data, error } = await supabase.from("products").select("*, product_images(url, is_primary), product_variants(price_cents, stock)").eq("active", true).order("featured", { ascending: false }).order("created_at", { ascending: false });
			if (error) throw error;
			return data;
		}
	});
	const products = data ?? [];
	const categories = Array.from(new Set(products.map((p) => p.category).filter(Boolean)));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-screen bg-background",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StoreHeader, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "relative overflow-hidden",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "pointer-events-none absolute inset-0 bg-glow-mesh" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 md:grid-cols-2 md:py-28",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "reveal-up",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-soft",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "h-1.5 w-1.5 rounded-full bg-primary" }), "Live inventory, every category"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
								className: "mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight text-foreground md:text-6xl",
								children: [
									"Everything electrical,",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-primary",
										children: "done right."
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-5 max-w-md text-base text-muted-foreground md:text-lg",
								children: "Switches, fans, wiring, and fittings from brands you can trust — with clear stock levels, honest warranty details, and a checkout that takes minutes."
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-8 flex flex-wrap gap-3",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									asChild: true,
									size: "lg",
									className: "rounded-xl shadow-soft",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
										href: "#products",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShoppingBag, { className: "mr-2 h-4 w-4" }), " Shop the catalog"]
									})
								})
							}),
							categories.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-8 flex flex-wrap gap-2",
								children: categories.slice(0, 6).map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
									to: "/category/$name",
									params: { name: c },
									className: "rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary hover:text-primary",
									children: c
								}, c))
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "relative hidden md:block",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeroPanel, {})
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CouponShowcase, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				className: "border-y border-border bg-card",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mx-auto grid max-w-6xl grid-cols-1 gap-6 px-6 py-10 md:grid-cols-3",
					children: [
						{
							icon: PackageCheck,
							title: "Real-time stock",
							desc: "See exactly what's available before you order"
						},
						{
							icon: Zap,
							title: "Every category",
							desc: "Wiring, switches, fans, fittings & more"
						},
						{
							icon: ShieldCheck,
							title: "Secure, worry-free checkout",
							desc: "Encrypted payment and clear warranty details on every order"
						}
					].map(({ icon: Icon, title, desc }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-start gap-3 rounded-2xl border border-border bg-background p-4 shadow-soft",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-accent text-primary",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "h-5 w-5" })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm font-semibold",
							children: title
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-0.5 text-sm text-muted-foreground",
							children: desc
						})] })]
					}, title))
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BrandsStrip, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				id: "products",
				className: "mx-auto max-w-6xl px-6 py-16 md:py-24",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mb-10",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-2xl font-extrabold tracking-tight text-foreground md:text-3xl",
						children: "The collection"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1.5 text-sm text-muted-foreground",
						children: products.length > 0 ? `${products.length} product${products.length !== 1 ? "s" : ""} available` : "Fresh arrivals coming soon"
					})]
				}), isLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4",
					children: Array.from({ length: 8 }).map((_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "animate-pulse",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "aspect-square rounded-2xl bg-secondary" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "mt-4 h-4 w-2/3 rounded bg-secondary" })]
					}, i))
				}) : isError ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "rounded-2xl border border-border bg-card p-12 text-center text-sm text-muted-foreground shadow-soft",
					children: "Couldn't load products right now."
				}) : products.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-2xl border border-dashed border-border bg-card p-16 text-center",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShoppingBag, { className: "mx-auto mb-4 h-10 w-10 text-muted-foreground" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "text-lg font-semibold",
							children: "New arrivals on the way"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mx-auto mt-2 max-w-md text-sm text-muted-foreground",
							children: "We're setting up the shelves. Check back soon, or sign in as admin to add your first product from the dashboard."
						})
					]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3 lg:grid-cols-4",
					children: products.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProductCard, { product: p }, p.id))
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StoreFooter, {})
		]
	});
}
/** Signature element: a floating panel showing the shop's categories,
*  linked by circuit-trace lines with an animated current pulse. */
function HeroPanel() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "relative mx-auto aspect-[4/3] w-full max-w-md rounded-3xl border border-border bg-card p-2 shadow-soft-lg",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "relative h-full w-full overflow-hidden rounded-2xl bg-secondary/40",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
				viewBox: "0 0 380 280",
				className: "absolute inset-0 h-full w-full",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
						d: "M 95 60 H 190 V 130 H 190",
						fill: "none",
						stroke: "var(--color-border)",
						strokeWidth: "1.5"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
						d: "M 285 55 H 190 V 130",
						fill: "none",
						stroke: "var(--color-border)",
						strokeWidth: "1.5"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
						d: "M 90 220 H 190 V 130",
						fill: "none",
						stroke: "var(--color-border)",
						strokeWidth: "1.5"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
						d: "M 275 230 H 190 V 130",
						fill: "none",
						stroke: "var(--color-border)",
						strokeWidth: "1.5"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
						cx: "190",
						cy: "130",
						r: "4",
						fill: "var(--color-primary)"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
						d: "M 95 60 H 190 V 130",
						fill: "none",
						stroke: "var(--color-primary)",
						strokeWidth: "2",
						pathLength: "1",
						className: "trace-pulse",
						style: { animationDelay: "0s" }
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
						d: "M 90 220 H 190 V 130",
						fill: "none",
						stroke: "var(--color-primary)",
						strokeWidth: "2",
						pathLength: "1",
						className: "trace-pulse",
						style: { animationDelay: "1.8s" }
					})
				]
			}), [
				{
					icon: ToggleLeft,
					label: "Switches",
					x: 60,
					y: 46
				},
				{
					icon: Fan,
					label: "Fans",
					x: 300,
					y: 30
				},
				{
					icon: Cable,
					label: "Wires",
					x: 50,
					y: 210
				},
				{
					icon: Plug,
					label: "Fittings",
					x: 290,
					y: 220
				}
			].map(({ icon: Icon, label, x, y }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5",
				style: {
					left: x,
					top: y
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-card text-primary shadow-soft",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "h-5 w-5" })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "rounded-full bg-foreground/90 px-2 py-0.5 text-[10px] font-medium text-background",
					children: label
				})]
			}, label))]
		})
	});
}
//#endregion
export { Index as component };

import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { n as useCart, t as formatMoney } from "./cart-e0HpVhNN.mjs";
import { c as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { t as Button } from "./button-BNPKdh9r.mjs";
import { t as supabase } from "./client-C6ZaJElq.mjs";
import { c as useAuth } from "./useAuth-wDRVmRFv.mjs";
import { g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { C as ShieldCheck, Ct as ArrowRight, S as ShieldOff, b as ShoppingBag, j as Plus, p as Ticket, wt as ArrowLeft, z as Minus } from "../_libs/lucide-react.mjs";
import { n as StoreHeader } from "./StoreHeader-BzV31mqn.mjs";
import { t as StoreFooter } from "./StoreFooter-SqAQEeLg.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { i as fetchOffersForProduct, t as describeCoupon } from "./coupons-CAkuEXl3.mjs";
import { t as Route } from "./product._slug-BS34dFUS.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/product._slug--sXqSpQf.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var WARRANTY_TYPE_LABEL = {
	manufacturer: "Manufacturer Warranty",
	seller: "Seller Warranty",
	extended: "Extended Warranty"
};
var SERVICE_METHOD_LABEL = {
	home_service: "Home Service",
	authorized_service_center: "Authorized Service Center",
	bring_to_store: "Bring to Store",
	carry_in_service: "Carry-in Service",
	on_site_service: "On-site Service"
};
/**
* Premium, at-a-glance warranty summary shown on every product page.
* Falls back gracefully to the legacy free-text warranty note for
* products that haven't been migrated to the structured fields yet.
*/
function WarrantyCard({ product }) {
	const hasStructuredWarranty = !!product.warranty_available;
	const hasLegacyNote = !hasStructuredWarranty && !!product.warranty?.trim();
	const explicitlyNoWarranty = product.warranty_available === false && !hasLegacyNote;
	if (!hasStructuredWarranty && !hasLegacyNote && !explicitlyNoWarranty) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-soft",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center gap-2.5 border-b border-border bg-secondary/40 px-4 py-3",
			children: [explicitlyNoWarranty ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldOff, { className: "h-4 w-4 text-muted-foreground" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "h-4 w-4 text-primary" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm font-semibold text-foreground",
				children: "Warranty Information"
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "space-y-2 px-4 py-4 text-sm",
			children: [explicitlyNoWarranty ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-muted-foreground",
				children: "This product doesn't come with a warranty. We stand by every order with our standard return and refund policy — reach out any time if something isn't right."
			}) : hasStructuredWarranty ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
					label: "Warranty",
					value: [product.warranty_duration, product.warranty_type ? WARRANTY_TYPE_LABEL[product.warranty_type] : null].filter(Boolean).join(" ") || "Covered"
				}),
				product.warranty_provider && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
					label: "Provider",
					value: product.warranty_provider
				}),
				product.warranty_service_method && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
					label: "Service",
					value: SERVICE_METHOD_LABEL[product.warranty_service_method]
				}),
				product.warranty_notes && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
					label: "Note",
					value: product.warranty_notes
				})
			] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "whitespace-pre-wrap text-muted-foreground",
				children: product.warranty
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "pt-1",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
					to: "/warranty-policy",
					className: "inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline",
					children: ["Read Full Warranty Policy ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { className: "h-3.5 w-3.5" })]
				})
			})]
		})]
	});
}
function Row({ label, value }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex gap-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "w-20 flex-shrink-0 text-muted-foreground",
			children: [label, ":"]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "font-medium text-foreground",
			children: value
		})]
	});
}
/**
* Surfaces "visible" coupons that actually apply to this product AND to
* this specific shopper — category/brand/product targeting, exclusions,
* and eligibility rules (first order, logged-in only, new/existing
* customer, usage limits) are all checked. The same rules run again at
* checkout, so what's shown here always matches what will actually work.
*/
function AvailableOffers({ productId, categoryId, brandId }) {
	const { user } = useAuth();
	const [coupons, setCoupons] = (0, import_react.useState)([]);
	(0, import_react.useEffect)(() => {
		fetchOffersForProduct(productId, categoryId, brandId, user?.id ?? null).then((all) => setCoupons(all.filter((c) => c.visibility === "visible")));
	}, [
		productId,
		categoryId,
		brandId,
		user?.id
	]);
	if (coupons.length === 0) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mt-6 rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "flex items-center gap-1.5 text-sm font-semibold text-foreground",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ticket, { className: "h-4 w-4 text-primary" }), " Available offers"]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-2 space-y-1.5",
				children: coupons.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "flex items-center gap-2 text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "rounded-md bg-background px-1.5 py-0.5 font-mono text-xs font-semibold",
						children: c.code
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-muted-foreground",
						children: describeCoupon(c)
					})]
				}, c.code))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-xs text-muted-foreground",
				children: "Enter the code at checkout — eligibility is confirmed there."
			})
		]
	});
}
function ProductPage() {
	const { slug } = Route.useParams();
	const add = useCart((s) => s.add);
	const [activeImage, setActiveImage] = (0, import_react.useState)(null);
	const [variantId, setVariantId] = (0, import_react.useState)(null);
	const { data: product, isLoading } = useQuery({
		queryKey: ["product", slug],
		queryFn: async () => {
			const { data, error } = await supabase.from("products").select("*, product_images(id, url, is_primary, sort_order), product_variants(id, name, price_cents, stock, sku, sort_order), categories(name, slug), brands(name)").eq("slug", slug).eq("active", true).maybeSingle();
			if (error) throw error;
			return data;
		}
	});
	const images = [...product?.product_images ?? []].sort((a, b) => {
		if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
		return a.sort_order - b.sort_order;
	});
	const variants = [...product?.product_variants ?? []].sort((a, b) => a.sort_order - b.sort_order);
	const hasVariants = variants.length > 0;
	const selectedVariant = variants.find((v) => v.id === variantId) ?? variants[0] ?? null;
	const gallery = images.length > 0 ? images.map((i) => i.url) : product?.image_url ? [product.image_url] : [];
	const mainImage = activeImage ?? gallery[0] ?? null;
	(0, import_react.useEffect)(() => {
		setActiveImage(null);
		setVariantId(null);
		setQtyState(1);
	}, [product?.id]);
	const price = hasVariants ? selectedVariant?.price_cents ?? 0 : product?.price_cents ?? 0;
	const stock = hasVariants ? selectedVariant?.stock ?? 0 : product?.stock ?? 0;
	const canAdd = hasVariants ? !!selectedVariant && stock > 0 : stock > 0;
	const hasDiscount = !hasVariants && !!product?.mrp_cents && product.mrp_cents > (product?.price_cents ?? 0);
	const discountPct = hasDiscount ? Math.round((product.mrp_cents - product.price_cents) / product.mrp_cents * 100) : 0;
	const specs = Array.isArray(product?.specifications) ? product.specifications.filter((s) => s.key || s.value) : [];
	const [qty, setQtyState] = (0, import_react.useState)(1);
	(0, import_react.useEffect)(() => {
		setQtyState((q) => Math.min(Math.max(q, 1), Math.max(stock, 1)));
	}, [stock]);
	function changeQty(delta) {
		setQtyState((q) => Math.min(Math.max(q + delta, 1), Math.max(stock, 1)));
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-screen bg-background",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StoreHeader, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mx-auto max-w-5xl px-6 py-8",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					asChild: true,
					variant: "ghost",
					size: "sm",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
						to: "/",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowLeft, { className: "mr-2 h-4 w-4" }), " Back"]
					})
				}), isLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-8 grid gap-8 md:grid-cols-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "aspect-square animate-pulse rounded-md bg-secondary/60" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-8 w-2/3 animate-pulse rounded bg-secondary/60" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-4 w-1/3 animate-pulse rounded bg-secondary/60" })]
					})]
				}) : !product ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-12 text-center text-muted-foreground",
					children: "Product not found."
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-8 grid gap-10 md:grid-cols-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "aspect-square overflow-hidden rounded-2xl border border-border bg-secondary/40 shadow-soft",
						children: mainImage ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
							src: mainImage,
							alt: product.name,
							className: "h-full w-full object-cover"
						}) : null
					}), gallery.length > 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-3 flex gap-2 overflow-x-auto",
						children: gallery.map((url) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => setActiveImage(url),
							className: `h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border ${mainImage === url ? "border-primary" : "border-border opacity-70 hover:opacity-100"}`,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
								src: url,
								alt: "",
								className: "h-full w-full object-cover"
							})
						}, url))
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						(product.brands?.name || product.categories?.name) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-xs font-semibold text-primary",
							children: [
								product.brands?.name,
								product.brands?.name && product.categories?.name ? " · " : "",
								product.categories?.name && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
									to: "/category/$name",
									params: { name: product.categories.slug },
									className: "hover:underline",
									children: product.categories.name
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							className: "mt-1 text-3xl font-extrabold tracking-tight",
							children: product.name
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-3 flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-2xl font-bold",
								children: formatMoney(price, product.currency)
							}), hasDiscount && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm text-muted-foreground line-through",
								children: formatMoney(product.mrp_cents, product.currency)
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-sm font-semibold text-green-600",
								children: [discountPct, "% off"]
							})] })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-1 text-sm text-muted-foreground",
							children: [
								stock > 0 ? `${stock} in stock` : "Sold out",
								hasVariants && selectedVariant?.sku ? ` · SKU ${selectedVariant.sku}` : "",
								!hasVariants && product.sku ? ` · SKU ${product.sku}` : ""
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "my-6 h-px bg-border" }),
						hasVariants && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mb-6",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mb-2 text-xs font-semibold text-muted-foreground",
								children: "Choose an option"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "flex flex-wrap gap-2",
								children: variants.map((v) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									onClick: () => setVariantId(v.id),
									disabled: v.stock <= 0,
									className: `rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${selectedVariant?.id === v.id ? "border-primary bg-primary text-primary-foreground shadow-soft" : "border-border hover:border-primary"}`,
									children: [v.name, v.stock <= 0 ? " (sold out)" : ""]
								}, v.id))
							})]
						}),
						product.description && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-6 whitespace-pre-wrap text-sm text-muted-foreground",
							children: product.description
						}),
						specs.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-6",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mb-2 text-sm font-semibold",
								children: "Specifications"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "overflow-hidden rounded-xl border border-border",
								children: specs.map((s, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: `flex justify-between gap-4 px-4 py-2 text-sm ${i % 2 === 1 ? "bg-secondary/40" : ""}`,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-muted-foreground",
										children: s.key
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-right font-medium",
										children: s.value
									})]
								}, i))
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(WarrantyCard, { product }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AvailableOffers, {
							productId: product.id,
							categoryId: product.category_id,
							brandId: product.brand_id
						}),
						canAdd && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-6 flex items-center gap-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs font-semibold text-muted-foreground",
									children: "Qty"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
											type: "button",
											size: "icon",
											variant: "outline",
											className: "h-9 w-9 rounded-lg",
											disabled: qty <= 1,
											onClick: () => changeQty(-1),
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Minus, { className: "h-3 w-3" })
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "w-8 text-center text-sm font-semibold tabular-nums",
											children: qty
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
											type: "button",
											size: "icon",
											variant: "outline",
											className: "h-9 w-9 rounded-lg",
											disabled: qty >= stock,
											onClick: () => changeQty(1),
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-3 w-3" })
										})
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "text-xs text-muted-foreground",
									children: [stock, " available"]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							className: "mt-4 w-full rounded-xl text-base font-semibold shadow-soft",
							size: "lg",
							disabled: !canAdd,
							onClick: () => {
								add({
									id: product.id,
									name: hasVariants && selectedVariant ? `${product.name} — ${selectedVariant.name}` : product.name,
									slug: product.slug,
									price_cents: price,
									image_url: mainImage,
									stock,
									variantId: hasVariants ? selectedVariant?.id ?? null : null,
									variantName: hasVariants ? selectedVariant?.name ?? null : null,
									sku: hasVariants ? selectedVariant?.sku ?? null : null,
									category_id: product.category_id ?? null,
									brand_id: product.brand_id ?? null
								}, qty);
								toast.success(qty > 1 ? `Added ${qty} to cart` : "Added to cart");
								setQtyState(1);
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShoppingBag, { className: "mr-2 h-4 w-4" }), canAdd ? "Add to cart" : "Sold out"]
						})
					] })]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StoreFooter, {})
		]
	});
}
//#endregion
export { ProductPage as component };

import { t as formatMoney } from "./cart-e0HpVhNN.mjs";
import { c as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { C as ShieldCheck } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/ProductCard-CjjWhxkf.js
var import_jsx_runtime = require_jsx_runtime();
function ProductCard({ product }) {
	const images = product.product_images ?? [];
	const variants = product.product_variants ?? [];
	const primaryImage = images.find((i) => i.is_primary)?.url ?? images[0]?.url ?? product.image_url;
	const outOfStock = variants.length > 0 ? variants.every((v) => v.stock <= 0) : product.stock <= 0;
	let priceLabel;
	if (variants.length > 0) {
		const prices = variants.map((v) => v.price_cents);
		const min = Math.min(...prices);
		priceLabel = min === Math.max(...prices) ? formatMoney(min, product.currency) : `From ${formatMoney(min, product.currency)}`;
	} else priceLabel = formatMoney(product.price_cents, product.currency);
	const hasDiscount = variants.length === 0 && !!product.mrp_cents && product.mrp_cents > product.price_cents;
	const discountPct = hasDiscount ? Math.round((product.mrp_cents - product.price_cents) / product.mrp_cents * 100) : 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
		to: "/product/$slug",
		params: { slug: product.slug },
		className: "group block rounded-2xl transition-transform duration-300 hover:-translate-y-1",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "relative aspect-square overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-shadow duration-300 group-hover:shadow-soft-lg",
			children: [
				primaryImage ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					src: primaryImage,
					alt: product.name,
					className: "h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex h-full w-full items-center justify-center bg-secondary",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-xs font-medium text-muted-foreground",
						children: "No image"
					})
				}),
				product.featured && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "absolute right-2.5 top-2.5 rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold text-primary-foreground shadow-soft",
					children: "Featured"
				}),
				outOfStock && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "absolute left-2.5 top-2.5 rounded-full border border-border bg-card px-2.5 py-1 text-[10px] font-medium text-muted-foreground shadow-soft",
					children: "Sold out"
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-3",
			children: [
				product.categories?.name && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-[11px] font-medium text-primary",
					children: product.categories.name
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "mt-0.5 truncate text-sm font-medium text-foreground",
					children: product.name
				}),
				product.warranty_available && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-0.5 flex items-center gap-1 text-[11px] font-medium text-primary/80",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "h-3 w-3" }), " Warranty included"]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-1 flex items-center gap-1.5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-base font-bold text-foreground",
						children: priceLabel
					}), hasDiscount && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-muted-foreground line-through",
						children: formatMoney(product.mrp_cents, product.currency)
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-xs font-semibold text-green-600",
						children: [discountPct, "% off"]
					})] })]
				})
			]
		})]
	});
}
//#endregion
export { ProductCard as t };

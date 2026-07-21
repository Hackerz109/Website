import { c as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { t as Button } from "./button-BNPKdh9r.mjs";
import { t as supabase } from "./client-C6ZaJElq.mjs";
import { t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { n as X, v as SlidersHorizontal } from "../_libs/lucide-react.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./select-CEaR62Wk.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/ProductFilters-CqvUeZvB.js
var import_jsx_runtime = require_jsx_runtime();
var SORT_LABELS = {
	featured: "Featured",
	newest: "Newest",
	price_asc: "Price: Low to High",
	price_desc: "Price: High to Low",
	name_asc: "Name: A–Z"
};
var ANY = "__any__";
function ProductFilters({ sort, onSortChange, categoryId, onCategoryChange, brandId, onBrandChange, showCategoryFilter = true }) {
	const { data: categories } = useQuery({
		queryKey: ["taxonomy-options", "categories"],
		queryFn: async () => {
			const { data, error } = await supabase.from("categories").select("id, name").order("name");
			if (error) throw error;
			return data;
		},
		enabled: showCategoryFilter
	});
	const { data: brands } = useQuery({
		queryKey: ["taxonomy-options", "brands"],
		queryFn: async () => {
			const { data, error } = await supabase.from("brands").select("id, name").order("name");
			if (error) throw error;
			return data;
		}
	});
	const hasActiveFilters = categoryId !== null || brandId !== null || sort !== "featured";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-wrap items-center gap-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SlidersHorizontal, { className: "h-4 w-4 text-muted-foreground" }),
			showCategoryFilter && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
				value: categoryId ?? ANY,
				onValueChange: (v) => onCategoryChange(v === ANY ? null : v),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
					className: "h-9 w-auto min-w-[9rem]",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "Category" })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
					value: ANY,
					children: "All categories"
				}), (categories ?? []).map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
					value: c.id,
					children: c.name
				}, c.id))] })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
				value: brandId ?? ANY,
				onValueChange: (v) => onBrandChange(v === ANY ? null : v),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
					className: "h-9 w-auto min-w-[9rem]",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "Brand" })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
					value: ANY,
					children: "All brands"
				}), (brands ?? []).map((b) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
					value: b.id,
					children: b.name
				}, b.id))] })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
				value: sort,
				onValueChange: (v) => onSortChange(v),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
					className: "h-9 w-auto min-w-[10rem]",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: Object.keys(SORT_LABELS).map((key) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
					value: key,
					children: SORT_LABELS[key]
				}, key)) })]
			}),
			hasActiveFilters && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
				variant: "ghost",
				size: "sm",
				className: "h-9",
				onClick: () => {
					onSortChange("featured");
					onCategoryChange(null);
					onBrandChange(null);
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "mr-1 h-3.5 w-3.5" }), " Clear"]
			})
		]
	});
}
/** Shared query-building helper so every listing page sorts/filters the same way. */
function applySortAndFilter(query, sort, categoryId, brandId) {
	let q = query;
	if (categoryId) q = q.eq("category_id", categoryId);
	if (brandId) q = q.eq("brand_id", brandId);
	switch (sort) {
		case "price_asc": return q.order("price_cents", { ascending: true });
		case "price_desc": return q.order("price_cents", { ascending: false });
		case "name_asc": return q.order("name", { ascending: true });
		case "newest": return q.order("created_at", { ascending: false });
		default: return q.order("featured", { ascending: false }).order("created_at", { ascending: false });
	}
}
//#endregion
export { applySortAndFilter as n, ProductFilters as t };

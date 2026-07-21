import { c as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { t as supabase } from "./client-C6ZaJElq.mjs";
import { t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { D as SearchX, b as ShoppingBag } from "../_libs/lucide-react.mjs";
import { n as StoreHeader, t as SearchBar } from "./StoreHeader-BzV31mqn.mjs";
import { t as StoreFooter } from "./StoreFooter-SqAQEeLg.mjs";
import { t as ProductCard } from "./ProductCard-CjjWhxkf.mjs";
import { n as applySortAndFilter, t as ProductFilters } from "./ProductFilters-CqvUeZvB.mjs";
import { t as Route } from "./search-ByEhiXep.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/search-gCeunj70.js
var import_jsx_runtime = require_jsx_runtime();
function sanitize(q) {
	return q.replace(/[%,()]/g, " ").trim();
}
function SearchPage() {
	const { q, sort, category, brand } = Route.useSearch();
	const navigate = Route.useNavigate();
	const term = sanitize(q);
	const { data, isLoading } = useQuery({
		queryKey: [
			"search-results",
			term,
			sort,
			category,
			brand
		],
		queryFn: async () => {
			const like = `%${term}%`;
			const [{ data: matchedCategories }, { data: matchedBrands }] = await Promise.all([supabase.from("categories").select("id").ilike("name", like), supabase.from("brands").select("id").ilike("name", like)]);
			const categoryIds = (matchedCategories ?? []).map((c) => c.id);
			const brandIds = (matchedBrands ?? []).map((b) => b.id);
			const orParts = [`name.ilike.${like}`, `description.ilike.${like}`];
			if (categoryIds.length > 0) orParts.push(`category_id.in.(${categoryIds.join(",")})`);
			if (brandIds.length > 0) orParts.push(`brand_id.in.(${brandIds.join(",")})`);
			let query = supabase.from("products").select("*, product_images(url, is_primary), product_variants(price_cents, stock), categories(name, slug), brands(name)").eq("active", true).or(orParts.join(","));
			query = applySortAndFilter(query, sort, category, brand);
			const { data, error } = await query;
			if (error) throw error;
			return data;
		},
		enabled: term.length > 0
	});
	const products = data ?? [];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-screen bg-background",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StoreHeader, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mx-auto max-w-6xl px-6 py-10",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "text-2xl font-extrabold tracking-tight text-foreground md:text-3xl",
						children: term ? `Results for "${term}"` : "Search"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1.5 text-sm text-muted-foreground",
						children: term ? isLoading ? "Searching…" : `${products.length} product${products.length !== 1 ? "s" : ""} found` : "Search for a product, category, or brand"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-6 max-w-lg",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SearchBar, {})
					}),
					term && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-6",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProductFilters, {
							sort,
							onSortChange: (v) => navigate({ search: (prev) => ({
								...prev,
								sort: v
							}) }),
							categoryId: category,
							onCategoryChange: (v) => navigate({ search: (prev) => ({
								...prev,
								category: v
							}) }),
							brandId: brand,
							onBrandChange: (v) => navigate({ search: (prev) => ({
								...prev,
								brand: v
							}) })
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-10",
						children: isLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4",
							children: Array.from({ length: 8 }).map((_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "animate-pulse",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "aspect-square rounded-2xl bg-secondary" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "mt-4 h-4 w-2/3 rounded bg-secondary" })]
							}, i))
						}) : !term ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-2xl border border-dashed border-border bg-card p-16 text-center",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShoppingBag, { className: "mx-auto mb-4 h-10 w-10 text-muted-foreground" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm text-muted-foreground",
								children: "Start typing above to find what you need."
							})]
						}) : products.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-2xl border border-dashed border-border bg-card p-16 text-center",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SearchX, { className: "mx-auto mb-4 h-10 w-10 text-muted-foreground" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
									className: "text-lg font-semibold",
									children: "No products found"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mx-auto mt-2 max-w-md text-sm text-muted-foreground",
									children: "Try a different word, or check the spelling of what you're looking for."
								})
							]
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3 lg:grid-cols-4",
							children: products.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProductCard, { product: p }, p.id))
						})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StoreFooter, {})
		]
	});
}
//#endregion
export { SearchPage as component };

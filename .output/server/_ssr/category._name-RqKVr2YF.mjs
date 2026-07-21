import { c as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { t as supabase } from "./client-C6ZaJElq.mjs";
import { _ as useNavigate, g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { L as PackageSearch, wt as ArrowLeft } from "../_libs/lucide-react.mjs";
import { n as StoreHeader } from "./StoreHeader-BzV31mqn.mjs";
import { t as StoreFooter } from "./StoreFooter-SqAQEeLg.mjs";
import { t as Route } from "./category._name-D61L28JQ.mjs";
import { t as ProductCard } from "./ProductCard-CjjWhxkf.mjs";
import { n as applySortAndFilter, t as ProductFilters } from "./ProductFilters-CqvUeZvB.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/category._name-RqKVr2YF.js
var import_jsx_runtime = require_jsx_runtime();
function CategoryPage() {
	const { name: slug } = Route.useParams();
	const { sort, brand } = Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });
	const { data: category } = useQuery({
		queryKey: ["category-meta", slug],
		queryFn: async () => {
			const { data, error } = await supabase.from("categories").select("id, name").eq("slug", slug).maybeSingle();
			if (error) throw error;
			return data;
		}
	});
	const { data, isLoading } = useQuery({
		enabled: !!category,
		queryKey: [
			"category-products",
			slug,
			sort,
			brand
		],
		queryFn: async () => {
			let query = supabase.from("products").select("*, product_images(url, is_primary), product_variants(price_cents, stock), categories(name, slug), brands(name)").eq("active", true).eq("category_id", category.id);
			query = applySortAndFilter(query, sort, null, brand);
			const { data, error } = await query;
			if (error) throw error;
			return data;
		}
	});
	const products = data ?? [];
	const categoryName = category?.name ?? slug;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-screen bg-background",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StoreHeader, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mx-auto max-w-6xl px-6 py-10",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
						to: "/",
						className: "inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowLeft, { className: "h-4 w-4" }), " All products"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "mt-3 text-2xl font-extrabold tracking-tight text-foreground md:text-3xl",
						children: categoryName
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-2 flex flex-wrap items-center justify-between gap-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-muted-foreground",
							children: isLoading ? "Loading…" : `${products.length} product${products.length !== 1 ? "s" : ""} in this category`
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProductFilters, {
							sort,
							onSortChange: (v) => navigate({ search: (prev) => ({
								...prev,
								sort: v
							}) }),
							categoryId: null,
							onCategoryChange: () => {},
							brandId: brand,
							onBrandChange: (v) => navigate({ search: (prev) => ({
								...prev,
								brand: v
							}) }),
							showCategoryFilter: false
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-10",
						children: isLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4",
							children: Array.from({ length: 8 }).map((_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "animate-pulse",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "aspect-square rounded-2xl bg-secondary" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "mt-4 h-4 w-2/3 rounded bg-secondary" })]
							}, i))
						}) : products.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-2xl border border-dashed border-border bg-card p-16 text-center",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PackageSearch, { className: "mx-auto mb-4 h-10 w-10 text-muted-foreground" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
									className: "text-lg font-semibold",
									children: "No products here yet"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "mx-auto mt-2 max-w-md text-sm text-muted-foreground",
									children: [
										"Nothing is currently listed under \"",
										categoryName,
										"\"."
									]
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
export { CategoryPage as component };

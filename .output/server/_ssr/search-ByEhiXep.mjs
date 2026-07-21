import { m as createFileRoute, p as lazyRouteComponent } from "../_libs/@tanstack/react-router+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/search-ByEhiXep.js
var $$splitComponentImporter = () => import("./search-gCeunj70.mjs");
var Route = createFileRoute("/search")({
	component: lazyRouteComponent($$splitComponentImporter, "component"),
	validateSearch: (search) => ({
		q: typeof search.q === "string" ? search.q : "",
		sort: typeof search.sort === "string" ? search.sort : "featured",
		category: typeof search.category === "string" ? search.category : null,
		brand: typeof search.brand === "string" ? search.brand : null
	})
});
//#endregion
export { Route as t };

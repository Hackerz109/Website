import { m as createFileRoute, p as lazyRouteComponent } from "../_libs/@tanstack/react-router+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/category._name-D61L28JQ.js
var $$splitComponentImporter = () => import("./category._name-RqKVr2YF.mjs");
var Route = createFileRoute("/category/$name")({
	component: lazyRouteComponent($$splitComponentImporter, "component"),
	validateSearch: (search) => ({
		sort: typeof search.sort === "string" ? search.sort : "featured",
		brand: typeof search.brand === "string" ? search.brand : null
	})
});
//#endregion
export { Route as t };

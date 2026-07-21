import { m as createFileRoute, p as lazyRouteComponent } from "../_libs/@tanstack/react-router+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/product._slug-BS34dFUS.js
var $$splitNotFoundComponentImporter = () => import("./product._slug-B6nY_3K1.mjs");
var $$splitErrorComponentImporter = () => import("./product._slug-CvGTUtnl.mjs");
var $$splitComponentImporter = () => import("./product._slug--sXqSpQf.mjs");
var Route = createFileRoute("/product/$slug")({
	component: lazyRouteComponent($$splitComponentImporter, "component"),
	errorComponent: lazyRouteComponent($$splitErrorComponentImporter, "errorComponent"),
	notFoundComponent: lazyRouteComponent($$splitNotFoundComponentImporter, "notFoundComponent")
});
//#endregion
export { Route as t };

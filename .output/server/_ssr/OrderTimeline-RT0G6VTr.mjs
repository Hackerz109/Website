import { t as cn } from "./utils-CBUTxTND.mjs";
import { c as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { gt as Check, k as RotateCcw, n as X } from "../_libs/lucide-react.mjs";
import { a as happyPathSteps, i as SIDE_TRACK_STATUSES, r as ORDER_STATUS_LABELS } from "./orderStatus-CtDgXVlR.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/OrderTimeline-RT0G6VTr.js
var import_jsx_runtime = require_jsx_runtime();
function OrderTimeline({ fulfillmentType, currentStatus, history }) {
	const steps = happyPathSteps(fulfillmentType);
	const isSideTrack = SIDE_TRACK_STATUSES.includes(currentStatus);
	const currentIndex = steps.indexOf(currentStatus);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-5",
		children: [isSideTrack ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: cn("flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium", currentStatus === "cancelled" || currentStatus === "return_rejected" ? "bg-red-500/10 text-red-700" : "bg-amber-500/10 text-amber-700"),
			children: [currentStatus === "cancelled" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-4 w-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, { className: "h-4 w-4" }), ORDER_STATUS_LABELS[currentStatus]]
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex items-center",
			children: steps.map((step, i) => {
				const done = currentIndex >= 0 && i <= currentIndex;
				const isLast = i === steps.length - 1;
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-1 items-center last:flex-none",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-col items-center gap-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: cn("flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold", done ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"),
							children: done ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-3.5 w-3.5" }) : i + 1
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: cn("hidden text-center text-[11px] leading-tight sm:block", done ? "font-medium text-foreground" : "text-muted-foreground"),
							children: ORDER_STATUS_LABELS[step]
						})]
					}), !isLast && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: cn("mx-1 h-0.5 flex-1", i < currentIndex ? "bg-primary" : "bg-secondary") })]
				}, step);
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "space-y-3 border-t pt-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs font-medium uppercase tracking-wide text-muted-foreground",
				children: "History"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "space-y-2.5",
				children: history.map((h) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "flex items-start justify-between gap-3 text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-medium",
						children: ORDER_STATUS_LABELS[h.status]
					}), h.note && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-muted-foreground",
						children: h.note
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "whitespace-nowrap text-xs text-muted-foreground",
						children: new Date(h.created_at).toLocaleString()
					})]
				}, h.id))
			})]
		})]
	});
}
//#endregion
export { OrderTimeline as t };

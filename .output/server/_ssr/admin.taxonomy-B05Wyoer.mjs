import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { c as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { t as Button } from "./button-BNPKdh9r.mjs";
import { t as supabase } from "./client-C6ZaJElq.mjs";
import { r as useQueryClient, t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { F as Pencil, d as Trash2, gt as Check, j as Plus, n as X } from "../_libs/lucide-react.mjs";
import { t as Input } from "./input-fWD4AjO2.mjs";
import { n as toast } from "../_libs/sonner.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.taxonomy-B05Wyoer.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function slugify(s) {
	return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
function AdminTaxonomy() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-10",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-2xl font-semibold tracking-tight",
				children: "Categories & Brands"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-sm text-muted-foreground",
				children: "Manage these here, then pick from them when creating or editing a product."
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TaxonomyManager, {
				table: "categories",
				title: "Categories",
				withSlug: true
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TaxonomyManager, {
				table: "brands",
				title: "Brands"
			})
		]
	});
}
function TaxonomyManager({ table, title, withSlug = false }) {
	const qc = useQueryClient();
	const [newName, setNewName] = (0, import_react.useState)("");
	const [editingId, setEditingId] = (0, import_react.useState)(null);
	const [editValue, setEditValue] = (0, import_react.useState)("");
	const { data: rows } = useQuery({
		queryKey: [table],
		queryFn: async () => {
			const { data, error } = await supabase.from(table).select("*").order("name");
			if (error) throw error;
			return data;
		}
	});
	function refresh() {
		qc.invalidateQueries({ queryKey: [table] });
		qc.invalidateQueries({ queryKey: ["taxonomy-options"] });
		qc.invalidateQueries({ queryKey: ["products", "public"] });
		qc.invalidateQueries({ queryKey: ["admin-products"] });
	}
	async function add() {
		const name = newName.trim();
		if (!name) return;
		const payload = { name };
		if (withSlug) payload.slug = slugify(name);
		const { error } = await supabase.from(table).insert(payload);
		if (error) return toast.error(error.message.includes("duplicate") ? `"${name}" already exists` : error.message);
		setNewName("");
		toast.success(`${title.slice(0, -1)} added`);
		refresh();
	}
	async function rename(row) {
		const name = editValue.trim();
		if (!name) return;
		const payload = { name };
		if (withSlug) payload.slug = slugify(name);
		const { error } = await supabase.from(table).update(payload).eq("id", row.id);
		if (error) return toast.error(error.message);
		setEditingId(null);
		toast.success("Renamed — note: products already using this won't relabel until you re-save them in the product form");
		refresh();
	}
	async function del(row) {
		if (!confirm(`Delete "${row.name}"? Products using it will just show no ${title.slice(0, -1).toLowerCase()}, not get deleted.`)) return;
		const { error } = await supabase.from(table).delete().eq("id", row.id);
		if (error) return toast.error(error.message);
		toast.success("Deleted");
		refresh();
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
			className: "text-lg font-semibold",
			children: title
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-3 flex gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
				value: newName,
				onChange: (e) => setNewName(e.target.value),
				onKeyDown: (e) => e.key === "Enter" && add(),
				placeholder: `New ${title.slice(0, -1).toLowerCase()} name`
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
				onClick: add,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "mr-1 h-4 w-4" }), " Add"]
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-4 divide-y rounded-xl border",
			children: [(rows ?? []).map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex items-center gap-2 px-4 py-2.5",
				children: editingId === row.id ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						value: editValue,
						onChange: (e) => setEditValue(e.target.value),
						onKeyDown: (e) => e.key === "Enter" && rename(row),
						className: "h-8",
						autoFocus: true
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "icon",
						variant: "ghost",
						className: "h-8 w-8",
						onClick: () => rename(row),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-4 w-4" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "icon",
						variant: "ghost",
						className: "h-8 w-8",
						onClick: () => setEditingId(null),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-4 w-4" })
					})
				] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "flex-1 text-sm",
						children: row.name
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "icon",
						variant: "ghost",
						className: "h-8 w-8",
						onClick: () => {
							setEditingId(row.id);
							setEditValue(row.name);
						},
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pencil, { className: "h-3.5 w-3.5" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						size: "icon",
						variant: "ghost",
						className: "h-8 w-8",
						onClick: () => del(row),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-3.5 w-3.5" })
					})
				] })
			}, row.id)), (rows ?? []).length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "px-4 py-8 text-center text-sm text-muted-foreground",
				children: [
					"No ",
					title.toLowerCase(),
					" yet — add one above."
				]
			})]
		})
	] });
}
//#endregion
export { AdminTaxonomy as component };

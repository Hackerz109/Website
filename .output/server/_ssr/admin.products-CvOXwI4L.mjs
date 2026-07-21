import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { t as formatMoney } from "./cart-e0HpVhNN.mjs";
import { c as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { t as Button } from "./button-BNPKdh9r.mjs";
import { t as supabase } from "./client-C6ZaJElq.mjs";
import { r as useQueryClient, t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { F as Pencil, _ as Star, d as Trash2, gt as Check, j as Plus, n as X, q as LoaderCircle, r as WandSparkles, s as Upload } from "../_libs/lucide-react.mjs";
import { t as Input } from "./input-fWD4AjO2.mjs";
import { t as Label } from "./label-RYLdB5Mm.mjs";
import { t as Textarea } from "./textarea-BMjH46cN.mjs";
import { t as Switch } from "./switch-B_mOGtgs.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./select-CEaR62Wk.mjs";
import { a as DialogHeader, i as DialogFooter, n as DialogContent, o as DialogTitle, r as DialogDescription, t as Dialog } from "./dialog-BrvgweL9.mjs";
import { a as TableHeader, i as TableHead, n as TableBody, o as TableRow, r as TableCell, t as Table } from "./table-D6qyMGWy.mjs";
import { n as toast } from "../_libs/sonner.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.products-CvOXwI4L.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function slugify$1(s) {
	return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
var NONE = "__none__";
function TaxonomySelect({ table, label, value, onChange }) {
	const qc = useQueryClient();
	const [adding, setAdding] = (0, import_react.useState)(false);
	const [newName, setNewName] = (0, import_react.useState)("");
	const { data: options } = useQuery({
		queryKey: ["taxonomy-options", table],
		queryFn: async () => {
			const { data, error } = await supabase.from(table).select("id, name").order("name");
			if (error) throw error;
			return data;
		}
	});
	async function createAndSelect() {
		const name = newName.trim();
		if (!name) return setAdding(false);
		const payload = { name };
		if (table === "categories") payload.slug = slugify$1(name);
		const { data, error } = await supabase.from(table).insert(payload).select("id").single();
		if (error) {
			toast.error(error.message.includes("duplicate") ? `"${name}" already exists` : error.message);
			return;
		}
		qc.invalidateQueries({ queryKey: ["taxonomy-options", table] });
		qc.invalidateQueries({ queryKey: [table] });
		onChange(data.id);
		setNewName("");
		setAdding(false);
	}
	if (adding) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
		className: "text-sm font-medium",
		children: label
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mt-1.5 flex gap-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
				value: newName,
				onChange: (e) => setNewName(e.target.value),
				onKeyDown: (e) => e.key === "Enter" && createAndSelect(),
				placeholder: `New ${label.toLowerCase()}`,
				autoFocus: true
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				type: "button",
				size: "icon",
				variant: "outline",
				onClick: createAndSelect,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-4 w-4" })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				type: "button",
				size: "icon",
				variant: "ghost",
				onClick: () => setAdding(false),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-4 w-4" })
			})
		]
	})] });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
		className: "text-sm font-medium",
		children: label
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
		value: value ?? NONE,
		onValueChange: (v) => {
			if (v === "__add_new__") {
				setAdding(true);
				return;
			}
			onChange(v === NONE ? null : v);
		},
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
			className: "mt-1.5",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: `No ${label.toLowerCase()}` })
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
				value: NONE,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "text-muted-foreground",
					children: ["No ", label.toLowerCase()]
				})
			}),
			(options ?? []).map((o) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
				value: o.id,
				children: o.name
			}, o.id)),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
				value: "__add_new__",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "flex items-center gap-1 text-primary",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-3.5 w-3.5" }),
						" Add new ",
						label.toLowerCase()
					]
				})
			})
		] })]
	})] });
}
function isHeaderRow({ key, value }) {
	const k = key.trim().toLowerCase();
	const v = value.trim().toLowerCase();
	return (k === "specification" || k === "spec" || k === "key" || k === "field" || k === "attribute") && (v === "details" || v === "detail" || v === "value" || v === "");
}
function dedupe(pairs) {
	const seen = /* @__PURE__ */ new Map();
	const result = [];
	for (const pair of pairs) {
		const key = pair.key.trim();
		if (!key) continue;
		const normalized = key.toLowerCase();
		if (seen.has(normalized)) result[seen.get(normalized)] = {
			key,
			value: pair.value.trim()
		};
		else {
			seen.set(normalized, result.length);
			result.push({
				key,
				value: pair.value.trim()
			});
		}
	}
	return result;
}
/**
* Converts pasted specification data — copied Excel/table rows (tab-separated),
* pipe tables ("Key| Value"), colon lines ("Brand: SummerCool / Capacity: 65L"),
* or plain alternating lines (key on one line, value on the next) — into a
* clean list of { key, value } specification rows.
*/
function parseSmartSpecifications(raw) {
	const lines = raw.replace(/\r\n/g, "\n").split("\n");
	const nonEmptyLines = lines.map((l) => l.trim()).filter((l) => l.length > 0);
	if (nonEmptyLines.length === 0) return [];
	if (lines.some((l) => l.includes("	"))) {
		const pairs = lines.filter((l) => l.trim().length > 0).map((l) => {
			const parts = l.split("	").map((p) => p.trim());
			return {
				key: parts[0] ?? "",
				value: parts.slice(1).join(" ").trim()
			};
		}).filter((p) => p.key && !isHeaderRow(p));
		if (pairs.length > 0) return dedupe(pairs);
	}
	if (nonEmptyLines.some((l) => l.includes("|"))) {
		const pairs = nonEmptyLines.map((l) => {
			const parts = l.split("|").map((p) => p.trim());
			return {
				key: parts[0] ?? "",
				value: parts.slice(1).join(" ").trim()
			};
		}).filter((p) => p.key && !isHeaderRow(p));
		if (pairs.length > 0) return dedupe(pairs);
	}
	if (nonEmptyLines.filter((l) => l.includes(":")).length / nonEmptyLines.length >= .5) {
		const pairs = [];
		for (const line of nonEmptyLines) {
			const segments = line.split("/").map((s) => s.trim()).filter(Boolean);
			for (const segment of segments) {
				const colonIndex = segment.indexOf(":");
				if (colonIndex === -1) continue;
				const key = segment.slice(0, colonIndex).trim();
				const value = segment.slice(colonIndex + 1).trim();
				if (key) pairs.push({
					key,
					value
				});
			}
		}
		if (pairs.length > 0) return dedupe(pairs.filter((p) => !isHeaderRow(p)));
	}
	const pairs = [];
	for (let i = 0; i < nonEmptyLines.length; i += 2) {
		const key = nonEmptyLines[i];
		const value = nonEmptyLines[i + 1] ?? "";
		if (key) pairs.push({
			key,
			value
		});
	}
	return dedupe(pairs.filter((p) => !isHeaderRow(p)));
}
var PLACEHOLDER = `Paste specs in any format, for example:

Brand
SummerCool

Model
Bandhan

Capacity
65 Litres

...or "Brand: SummerCool / Capacity: 65L", or rows copied straight from Excel.`;
/**
* Lets an admin paste specifications in whatever format they have on hand
* (Excel rows, a pipe table, "Key: Value" text, or alternating lines) and
* turns it into clean, editable specification rows before saving.
*
* Specs stay stored as a plain key/value list (JSON), so any product —
* in any category — can have its own set of fields without any database
* changes.
*/
function SmartSpecImporter({ onImport }) {
	const [open, setOpen] = (0, import_react.useState)(false);
	const [raw, setRaw] = (0, import_react.useState)("");
	const [preview, setPreview] = (0, import_react.useState)(null);
	function handleParse() {
		const parsed = parseSmartSpecifications(raw);
		if (parsed.length === 0) {
			toast.error("Couldn't find any specifications in that text — try pasting it differently.");
			return;
		}
		setPreview(parsed);
	}
	function updatePreview(i, field, val) {
		if (!preview) return;
		setPreview(preview.map((p, idx) => idx === i ? {
			...p,
			[field]: val
		} : p));
	}
	function removeRow(i) {
		if (!preview) return;
		setPreview(preview.filter((_, idx) => idx !== i));
	}
	function addRow() {
		setPreview([...preview ?? [], {
			key: "",
			value: ""
		}]);
	}
	function reset() {
		setRaw("");
		setPreview(null);
	}
	function handleConfirm() {
		const clean = (preview ?? []).filter((p) => p.key.trim());
		if (clean.length === 0) {
			toast.error("Add at least one specification before importing.");
			return;
		}
		onImport(clean);
		toast.success(`Imported ${clean.length} specification${clean.length === 1 ? "" : "s"}.`);
		setOpen(false);
		reset();
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Dialog, {
		open,
		onOpenChange: (v) => {
			setOpen(v);
			if (!v) reset();
		},
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
			type: "button",
			size: "sm",
			variant: "outline",
			onClick: () => setOpen(true),
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(WandSparkles, { className: "mr-1 h-3 w-3" }), " Smart import"]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
			className: "max-h-[85vh] max-w-2xl overflow-y-auto",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: "Smart Specification Importer" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, { children: "Paste specs from Excel, a table, or plain text — we'll convert them into clean specification rows automatically." })] }),
				!preview ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Paste your specifications" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
						value: raw,
						onChange: (e) => setRaw(e.target.value),
						placeholder: PLACEHOLDER,
						rows: 12,
						className: "font-mono text-xs"
					})]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Preview — edit anything before importing" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							type: "button",
							size: "sm",
							variant: "outline",
							onClick: addRow,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "mr-1 h-3 w-3" }), " Add row"]
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-lg border border-border",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-[1fr_1fr_auto] gap-2 border-b border-border bg-secondary/40 px-3 py-2 text-xs font-semibold text-muted-foreground",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Specification" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Details" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {})
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "max-h-72 space-y-2 overflow-y-auto p-3",
							children: [preview.map((p, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid grid-cols-[1fr_1fr_auto] items-center gap-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										value: p.key,
										onChange: (e) => updatePreview(i, "key", e.target.value),
										placeholder: "Specification"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										value: p.value,
										onChange: (e) => updatePreview(i, "value", e.target.value),
										placeholder: "Details"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
										type: "button",
										size: "icon",
										variant: "ghost",
										onClick: () => removeRow(i),
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-4 w-4" })
									})
								]
							}, i)), preview.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "py-4 text-center text-xs text-muted-foreground",
								children: "No rows left — add one above."
							})]
						})]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogFooter, { children: !preview ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					type: "button",
					onClick: handleParse,
					disabled: !raw.trim(),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(WandSparkles, { className: "mr-1.5 h-4 w-4" }), " Convert"]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "button",
					variant: "outline",
					onClick: () => setPreview(null),
					children: "Back"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					type: "button",
					onClick: handleConfirm,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "mr-1.5 h-4 w-4" }), " Add to specifications"]
				})] }) })
			]
		})]
	});
}
var empty = {
	name: "",
	slug: "",
	description: "",
	category: null,
	brand: null,
	price: "",
	mrp: "",
	sku: "",
	stock: "0",
	image_url: "",
	warranty: "",
	warranty_available: false,
	warranty_type: null,
	warranty_duration: "",
	warranty_provider: "",
	warranty_service_method: null,
	warranty_notes: "",
	specifications: [],
	active: true,
	featured: false
};
var WARRANTY_TYPE_OPTIONS = [
	{
		value: "manufacturer",
		label: "Manufacturer Warranty"
	},
	{
		value: "seller",
		label: "Seller Warranty"
	},
	{
		value: "extended",
		label: "Extended Warranty"
	}
];
var SERVICE_METHOD_OPTIONS = [
	{
		value: "home_service",
		label: "Home Service"
	},
	{
		value: "authorized_service_center",
		label: "Authorized Service Center"
	},
	{
		value: "bring_to_store",
		label: "Bring to Store"
	},
	{
		value: "carry_in_service",
		label: "Carry-in Service"
	},
	{
		value: "on_site_service",
		label: "On-site Service"
	}
];
function slugify(s) {
	return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
function pathFromPublicUrl(url) {
	const idx = url.indexOf("/object/public/product-images/");
	return idx >= 0 ? url.slice(idx + 30) : null;
}
function AdminProducts() {
	const qc = useQueryClient();
	const [open, setOpen] = (0, import_react.useState)(false);
	const [editing, setEditing] = (0, import_react.useState)(null);
	const [form, setForm] = (0, import_react.useState)(empty);
	const [saving, setSaving] = (0, import_react.useState)(false);
	const { data: products } = useQuery({
		queryKey: ["admin-products"],
		queryFn: async () => {
			const { data, error } = await supabase.from("products").select("*, product_variants(price_cents, stock), categories(name), brands(name)").order("created_at", { ascending: false });
			if (error) throw error;
			return data;
		}
	});
	function priceDisplay(p) {
		const variants = p.product_variants ?? [];
		if (variants.length === 0) return formatMoney(p.price_cents, p.currency);
		const prices = variants.map((v) => v.price_cents);
		const min = Math.min(...prices);
		const max = Math.max(...prices);
		return min === max ? formatMoney(min, p.currency) : `${formatMoney(min, p.currency)}–${formatMoney(max, p.currency)}`;
	}
	function stockDisplay(p) {
		const variants = p.product_variants ?? [];
		if (variants.length === 0) return p.stock;
		return variants.reduce((sum, v) => sum + v.stock, 0);
	}
	function invalidateStoreFront() {
		qc.invalidateQueries({ queryKey: ["admin-products"] });
		qc.invalidateQueries({ queryKey: ["products", "public"] });
		qc.invalidateQueries({ queryKey: ["product"] });
	}
	function openNew() {
		setEditing(null);
		setForm(empty);
		setOpen(true);
	}
	function openEdit(p) {
		setEditing(p);
		setForm({
			name: p.name,
			slug: p.slug,
			description: p.description ?? "",
			category: p.category_id ?? null,
			brand: p.brand_id ?? null,
			price: (p.price_cents / 100).toString(),
			mrp: p.mrp_cents ? (p.mrp_cents / 100).toString() : "",
			sku: p.sku ?? "",
			stock: p.stock.toString(),
			image_url: p.image_url ?? "",
			warranty: p.warranty ?? "",
			warranty_available: p.warranty_available ?? false,
			warranty_type: p.warranty_type ?? null,
			warranty_duration: p.warranty_duration ?? "",
			warranty_provider: p.warranty_provider ?? "",
			warranty_service_method: p.warranty_service_method ?? null,
			warranty_notes: p.warranty_notes ?? "",
			specifications: Array.isArray(p.specifications) ? p.specifications : [],
			active: p.active,
			featured: p.featured
		});
		setOpen(true);
	}
	async function save() {
		const price_cents = Math.round(parseFloat(form.price || "0") * 100);
		const stock = parseInt(form.stock || "0", 10);
		if (!form.name || isNaN(price_cents)) return toast.error("Name and price required");
		let mrp_cents = null;
		if (form.mrp.trim()) {
			mrp_cents = Math.round(parseFloat(form.mrp) * 100);
			if (isNaN(mrp_cents)) return toast.error("MRP must be a number");
			if (mrp_cents < price_cents) return toast.error("MRP can't be lower than the price");
		}
		const cleanSpecs = form.specifications.filter((s) => s.key.trim() || s.value.trim());
		setSaving(true);
		const payload = {
			name: form.name,
			slug: form.slug || slugify(form.name),
			description: form.description || null,
			category_id: form.category || null,
			brand_id: form.brand || null,
			price_cents,
			mrp_cents,
			sku: form.sku || null,
			stock,
			image_url: form.image_url || null,
			warranty: form.warranty || null,
			warranty_available: form.warranty_available,
			warranty_type: form.warranty_available ? form.warranty_type : null,
			warranty_duration: form.warranty_available ? form.warranty_duration || null : null,
			warranty_provider: form.warranty_available ? form.warranty_provider || null : null,
			warranty_service_method: form.warranty_available ? form.warranty_service_method : null,
			warranty_notes: form.warranty_available ? form.warranty_notes || null : null,
			specifications: cleanSpecs,
			active: form.active,
			featured: form.featured
		};
		if (editing) {
			const { error } = await supabase.from("products").update(payload).eq("id", editing.id);
			setSaving(false);
			if (error) return toast.error(error.message);
			toast.success("Product updated");
			invalidateStoreFront();
		} else {
			const { data, error } = await supabase.from("products").insert(payload).select().single();
			setSaving(false);
			if (error) return toast.error(error.message);
			toast.success("Product created — now add variants & images below");
			setEditing(data);
			invalidateStoreFront();
			return;
		}
	}
	async function del(p) {
		if (!confirm(`Delete "${p.name}"? This also removes its variants and images.`)) return;
		const { error } = await supabase.from("products").delete().eq("id", p.id);
		if (error) return toast.error(error.message);
		toast.success("Deleted");
		invalidateStoreFront();
	}
	async function toggleActive(p) {
		const { error } = await supabase.from("products").update({ active: !p.active }).eq("id", p.id);
		if (error) return toast.error(error.message);
		invalidateStoreFront();
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-2xl font-semibold tracking-tight",
					children: "Products"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					onClick: openNew,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "mr-2 h-4 w-4" }), " Add product"]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-3 md:hidden",
				children: [(products ?? []).map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-xl border p-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-start gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-secondary/60",
							children: p.image_url && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
								src: p.image_url,
								alt: "",
								className: "h-full w-full object-cover"
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "min-w-0 flex-1",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "flex items-center gap-1 font-medium",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "truncate",
										children: p.name
									}), p.featured && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Star, { className: "h-3 w-3 flex-shrink-0 fill-current text-amber-500" })]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "truncate text-xs text-muted-foreground",
									children: [
										"/",
										p.slug,
										p.categories?.name ? ` · ${p.categories.name}` : ""
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-medium",
										children: priceDisplay(p)
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: stockDisplay(p) <= 3 ? "text-amber-600" : "text-muted-foreground",
										children: [
											stockDisplay(p),
											" in stock",
											(p.product_variants?.length ?? 0) > 0 && ` (${p.product_variants.length} variants)`
										]
									})]
								})
							]
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-3 flex items-center justify-between border-t pt-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
								checked: p.active,
								onCheckedChange: () => toggleActive(p)
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-xs text-muted-foreground",
								children: p.active ? "Active" : "Hidden"
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex gap-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								size: "icon",
								variant: "ghost",
								className: "h-9 w-9",
								onClick: () => openEdit(p),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pencil, { className: "h-4 w-4" })
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								size: "icon",
								variant: "ghost",
								className: "h-9 w-9",
								onClick: () => del(p),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-4 w-4" })
							})]
						})]
					})]
				}, p.id)), (products ?? []).length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "rounded-xl border py-12 text-center text-sm text-muted-foreground",
					children: "No products yet — tap \"Add product\" to create your first one."
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "hidden rounded-xl border md:block",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Table, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableRow, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Product" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Price" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Stock" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Active" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, {
						className: "text-right",
						children: "Actions"
					})
				] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableBody, { children: [(products ?? []).map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableRow, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "h-10 w-10 overflow-hidden rounded bg-secondary/60",
							children: p.image_url && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
								src: p.image_url,
								alt: "",
								className: "h-full w-full object-cover"
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "flex items-center gap-1 font-medium",
							children: [p.name, p.featured && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Star, { className: "h-3 w-3 fill-current text-amber-500" })]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-xs text-muted-foreground",
							children: [
								"/",
								p.slug,
								p.categories?.name ? ` · ${p.categories.name}` : ""
							]
						})] })]
					}) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { children: priceDisplay(p) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableCell, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: stockDisplay(p) <= 3 ? "text-amber-600" : "",
						children: stockDisplay(p)
					}), (p.product_variants?.length ?? 0) > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "ml-1 text-xs text-muted-foreground",
						children: [
							"(",
							p.product_variants.length,
							" variant",
							p.product_variants.length !== 1 ? "s" : "",
							")"
						]
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
						checked: p.active,
						onCheckedChange: () => toggleActive(p)
					}) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableCell, {
						className: "text-right",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							size: "icon",
							variant: "ghost",
							onClick: () => openEdit(p),
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pencil, { className: "h-4 w-4" })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							size: "icon",
							variant: "ghost",
							onClick: () => del(p),
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-4 w-4" })
						})]
					})
				] }, p.id)), (products ?? []).length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableRow, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
					colSpan: 5,
					className: "py-12 text-center text-sm text-muted-foreground",
					children: "No products yet — click \"Add product\" to create your first one."
				}) })] })] })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
				open,
				onOpenChange: setOpen,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
					className: "max-h-[85vh] max-w-lg overflow-y-auto",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: editing ? "Edit product" : "Add product" }) }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-4",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Name" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									value: form.name,
									onChange: (e) => setForm({
										...form,
										name: e.target.value
									})
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Slug (URL)" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									value: form.slug,
									placeholder: form.name ? slugify(form.name) : "product-slug",
									onChange: (e) => setForm({
										...form,
										slug: e.target.value
									})
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Description" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
									value: form.description,
									onChange: (e) => setForm({
										...form,
										description: e.target.value
									}),
									rows: 3
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "grid grid-cols-1 gap-3 sm:grid-cols-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TaxonomySelect, {
										table: "categories",
										label: "Category",
										value: form.category,
										onChange: (id) => setForm({
											...form,
											category: id
										})
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TaxonomySelect, {
										table: "brands",
										label: "Brand",
										value: form.brand,
										onChange: (id) => setForm({
											...form,
											brand: id
										})
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "grid grid-cols-1 gap-3 sm:grid-cols-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Price (INR)" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										type: "number",
										step: "0.01",
										value: form.price,
										onChange: (e) => setForm({
											...form,
											price: e.target.value
										})
									})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Stock" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										type: "number",
										value: form.stock,
										onChange: (e) => setForm({
											...form,
											stock: e.target.value
										})
									})] })]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "grid grid-cols-1 gap-3 sm:grid-cols-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "MRP (INR)" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											type: "number",
											step: "0.01",
											placeholder: "Optional",
											value: form.mrp,
											onChange: (e) => setForm({
												...form,
												mrp: e.target.value
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "mt-1 text-xs text-muted-foreground",
											children: "Shown struck-through if higher than price."
										})
									] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "SKU" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										placeholder: "Optional",
										value: form.sku,
										onChange: (e) => setForm({
											...form,
											sku: e.target.value
										})
									})] })]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "-mt-2 text-xs text-muted-foreground",
									children: "Price, MRP, stock & SKU above are used only if this product has no variants (see below)."
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "rounded-xl border border-border p-4",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center gap-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
												checked: form.warranty_available,
												onCheckedChange: (v) => setForm({
													...form,
													warranty_available: v
												})
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Warranty available" })]
										}),
										!form.warranty_available ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "mt-2 text-xs text-muted-foreground",
											children: "The product page will show \"No Warranty\"."
										}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "mt-4 space-y-3",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "grid gap-3 sm:grid-cols-2",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Warranty type" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
														value: form.warranty_type ?? void 0,
														onValueChange: (v) => setForm({
															...form,
															warranty_type: v
														}),
														children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "Select type" }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: WARRANTY_TYPE_OPTIONS.map((o) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
															value: o.value,
															children: o.label
														}, o.value)) })]
													})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Warranty duration" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
														placeholder: "e.g. 1 Year",
														value: form.warranty_duration,
														onChange: (e) => setForm({
															...form,
															warranty_duration: e.target.value
														})
													})] })]
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "grid gap-3 sm:grid-cols-2",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Warranty provider" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
														placeholder: "e.g. SummerCool",
														value: form.warranty_provider,
														onChange: (e) => setForm({
															...form,
															warranty_provider: e.target.value
														})
													})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Service method" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
														value: form.warranty_service_method ?? void 0,
														onValueChange: (v) => setForm({
															...form,
															warranty_service_method: v
														}),
														children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "Select service method" }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: SERVICE_METHOD_OPTIONS.map((o) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
															value: o.value,
															children: o.label
														}, o.value)) })]
													})] })]
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Warranty notes" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
													placeholder: "e.g. Original purchase invoice required.",
													value: form.warranty_notes,
													onChange: (e) => setForm({
														...form,
														warranty_notes: e.target.value
													}),
													rows: 2
												})] })
											]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "mt-3 text-xs text-muted-foreground",
											children: "Legacy free-text warranty note (only shown if the fields above are left off):"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
											className: "mt-1",
											placeholder: "e.g. 1 year manufacturer warranty. No returns on used items.",
											value: form.warranty,
											onChange: (e) => setForm({
												...form,
												warranty: e.target.value
											}),
											rows: 2
										})
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SpecificationsEditor, {
									specs: form.specifications,
									onChange: (specs) => setForm({
										...form,
										specifications: specs
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Fallback image URL" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										value: form.image_url,
										placeholder: "https://…",
										onChange: (e) => setForm({
											...form,
											image_url: e.target.value
										})
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "mt-1 text-xs text-muted-foreground",
										children: "Used only if no images are uploaded below."
									})
								] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
										checked: form.active,
										onCheckedChange: (v) => setForm({
											...form,
											active: v
										})
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Active (visible in store)" })]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
										checked: form.featured,
										onCheckedChange: (v) => setForm({
											...form,
											featured: v
										})
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Featured" })]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "border-t pt-4",
									children: editing ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(VariantsEditor, {
										product: editing,
										qc,
										invalidateStoreFront
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "mt-6",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ImagesEditor, {
											product: editing,
											qc,
											invalidateStoreFront
										})
									})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "rounded-lg bg-secondary/50 p-3 text-sm text-muted-foreground",
										children: "Save the product first, then variants and images can be added here."
									})
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "ghost",
							onClick: () => setOpen(false),
							children: "Close"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							onClick: save,
							disabled: saving,
							children: "Save details"
						})] })
					]
				})
			})
		]
	});
}
function VariantsEditor({ product, qc, invalidateStoreFront }) {
	const { data: variants } = useQuery({
		queryKey: ["admin-variants", product.id],
		queryFn: async () => {
			const { data, error } = await supabase.from("product_variants").select("*").eq("product_id", product.id).order("sort_order", { ascending: true });
			if (error) throw error;
			return data;
		}
	});
	const [drafts, setDrafts] = (0, import_react.useState)({});
	(0, import_react.useEffect)(() => {
		if (!variants) return;
		const next = {};
		for (const v of variants) next[v.id] = {
			name: v.name,
			price: (v.price_cents / 100).toString(),
			stock: v.stock.toString(),
			sku: v.sku ?? ""
		};
		setDrafts(next);
	}, [variants]);
	function refresh() {
		qc.invalidateQueries({ queryKey: ["admin-variants", product.id] });
		invalidateStoreFront();
	}
	async function addVariant() {
		const isFirstVariant = (variants?.length ?? 0) === 0;
		if (isFirstVariant) {
			const { error: seedError } = await supabase.from("product_variants").insert({
				product_id: product.id,
				name: "Standard",
				price_cents: product.price_cents,
				stock: product.stock,
				sort_order: 0
			});
			if (seedError) return toast.error(seedError.message);
		}
		const { error } = await supabase.from("product_variants").insert({
			product_id: product.id,
			name: "New variant",
			price_cents: product.price_cents,
			stock: 0,
			sort_order: isFirstVariant ? 1 : variants?.length ?? 0
		});
		if (error) return toast.error(error.message);
		if (isFirstVariant) toast.success("Added \"Standard\" (your existing price & stock) plus a new variant to edit");
		refresh();
	}
	async function saveVariant(v) {
		const d = drafts[v.id];
		if (!d) return;
		const price_cents = Math.round(parseFloat(d.price || "0") * 100);
		const stock = parseInt(d.stock || "0", 10);
		if (!d.name || isNaN(price_cents)) return toast.error("Variant name and price required");
		const { error } = await supabase.from("product_variants").update({
			name: d.name,
			price_cents,
			stock,
			sku: d.sku || null
		}).eq("id", v.id);
		if (error) return toast.error(error.message);
		toast.success("Variant saved");
		refresh();
	}
	async function deleteVariant(v) {
		if (!confirm(`Delete variant "${v.name}"?`)) return;
		const { error } = await supabase.from("product_variants").delete().eq("id", v.id);
		if (error) return toast.error(error.message);
		refresh();
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center justify-between",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Variants" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
				size: "sm",
				variant: "outline",
				onClick: addVariant,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "mr-1 h-3 w-3" }), " Add variant"]
			})]
		}),
		(!variants || variants.length === 0) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-2 text-xs text-muted-foreground",
			children: "No variants — the product's own price & stock will be used."
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-2 space-y-2",
			children: (variants ?? []).map((v) => {
				const d = drafts[v.id] ?? {
					name: "",
					price: "",
					stock: "",
					sku: ""
				};
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-lg border p-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-2 gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								placeholder: "Variant name (e.g. 1.5 sq.mm)",
								value: d.name,
								onChange: (e) => setDrafts({
									...drafts,
									[v.id]: {
										...d,
										name: e.target.value
									}
								}),
								className: "col-span-2"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								type: "number",
								step: "0.01",
								placeholder: "Price",
								value: d.price,
								onChange: (e) => setDrafts({
									...drafts,
									[v.id]: {
										...d,
										price: e.target.value
									}
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								type: "number",
								placeholder: "Stock",
								value: d.stock,
								onChange: (e) => setDrafts({
									...drafts,
									[v.id]: {
										...d,
										stock: e.target.value
									}
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								placeholder: "SKU (optional)",
								value: d.sku,
								onChange: (e) => setDrafts({
									...drafts,
									[v.id]: {
										...d,
										sku: e.target.value
									}
								}),
								className: "col-span-2"
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-2 flex justify-end gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							size: "sm",
							variant: "ghost",
							onClick: () => deleteVariant(v),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "mr-1 h-3 w-3" }), " Delete"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							size: "sm",
							onClick: () => saveVariant(v),
							children: "Save"
						})]
					})]
				}, v.id);
			})
		})
	] });
}
function ImagesEditor({ product, qc, invalidateStoreFront }) {
	const [uploading, setUploading] = (0, import_react.useState)(false);
	const { data: images } = useQuery({
		queryKey: ["admin-images", product.id],
		queryFn: async () => {
			const { data, error } = await supabase.from("product_images").select("*").eq("product_id", product.id).order("sort_order", { ascending: true });
			if (error) throw error;
			return data;
		}
	});
	function refresh() {
		qc.invalidateQueries({ queryKey: ["admin-images", product.id] });
		invalidateStoreFront();
	}
	async function handleFiles(e) {
		const files = Array.from(e.target.files ?? []);
		e.target.value = "";
		if (files.length === 0) return;
		setUploading(true);
		const startCount = images?.length ?? 0;
		for (let i = 0; i < files.length; i++) {
			const file = files[i];
			const cleanName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
			const path = `${product.id}/${crypto.randomUUID()}-${cleanName}`;
			const { error: upErr } = await supabase.storage.from("product-images").upload(path, file);
			if (upErr) {
				toast.error(`Upload failed: ${upErr.message}`);
				continue;
			}
			const { data: pub } = supabase.storage.from("product-images").getPublicUrl(path);
			const { error: insErr } = await supabase.from("product_images").insert({
				product_id: product.id,
				url: pub.publicUrl,
				is_primary: startCount === 0 && i === 0,
				sort_order: startCount + i
			});
			if (insErr) toast.error(insErr.message);
		}
		setUploading(false);
		toast.success("Images uploaded");
		refresh();
	}
	async function setPrimary(img) {
		await supabase.from("product_images").update({ is_primary: false }).eq("product_id", product.id).neq("id", img.id);
		const { error } = await supabase.from("product_images").update({ is_primary: true }).eq("id", img.id);
		if (error) return toast.error(error.message);
		refresh();
	}
	async function deleteImage(img) {
		if (!confirm("Delete this image?")) return;
		const path = pathFromPublicUrl(img.url);
		if (path) await supabase.storage.from("product-images").remove([path]);
		const { error } = await supabase.from("product_images").delete().eq("id", img.id);
		if (error) return toast.error(error.message);
		if (img.is_primary) {
			const remaining = (images ?? []).filter((i) => i.id !== img.id);
			if (remaining.length > 0) await supabase.from("product_images").update({ is_primary: true }).eq("id", remaining[0].id);
		}
		refresh();
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center justify-between",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Images" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				type: "file",
				accept: "image/*",
				multiple: true,
				className: "hidden",
				onChange: handleFiles,
				disabled: uploading
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "inline-flex cursor-pointer items-center rounded-md border px-3 py-1.5 text-sm hover:bg-secondary/50",
				children: [uploading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "mr-1 h-3 w-3 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Upload, { className: "mr-1 h-3 w-3" }), uploading ? "Uploading…" : "Upload images"]
			})] })]
		}),
		(!images || images.length === 0) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-2 text-xs text-muted-foreground",
			children: "No images uploaded — the fallback image URL above will be used."
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-2 grid grid-cols-3 gap-2",
			children: (images ?? []).map((img) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative overflow-hidden rounded-lg border",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
						src: img.url,
						alt: "",
						className: "aspect-square w-full object-cover"
					}),
					img.is_primary && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "absolute left-1 top-1 rounded bg-foreground/90 px-1.5 py-0.5 text-[10px] font-medium text-background",
						children: "Primary"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex divide-x border-t bg-background",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							disabled: img.is_primary,
							onClick: () => setPrimary(img),
							className: "flex-1 py-1 text-[11px] disabled:text-muted-foreground hover:bg-secondary/50",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Star, { className: "mx-auto h-3 w-3" })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => deleteImage(img),
							className: "flex-1 py-1 text-[11px] hover:bg-secondary/50",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "mx-auto h-3 w-3" })
						})]
					})
				]
			}, img.id))
		})
	] });
}
function SpecificationsEditor({ specs, onChange }) {
	function update(i, field, val) {
		onChange(specs.map((s, idx) => idx === i ? {
			...s,
			[field]: val
		} : s));
	}
	function add() {
		onChange([...specs, {
			key: "",
			value: ""
		}]);
	}
	function remove(i) {
		onChange(specs.filter((_, idx) => idx !== i));
	}
	function handleSmartImport(imported) {
		const next = [...specs];
		for (const { key, value } of imported) {
			const existingIndex = next.findIndex((s) => s.key.trim().toLowerCase() === key.trim().toLowerCase());
			if (existingIndex >= 0) next[existingIndex] = {
				key: next[existingIndex].key,
				value
			};
			else next.push({
				key,
				value
			});
		}
		onChange(next);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center justify-between",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Specifications" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SmartSpecImporter, { onImport: handleSmartImport }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					type: "button",
					size: "sm",
					variant: "outline",
					onClick: add,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "mr-1 h-3 w-3" }), " Add row"]
				})]
			})]
		}),
		specs.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "mt-2 text-xs text-muted-foreground",
			children: [
				"e.g. Voltage — 220V, Material — Copper, Wattage — 60W. Or paste a spec sheet with",
				" ",
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "font-medium text-foreground",
					children: "Smart import"
				}),
				" above."
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-2 space-y-2",
			children: specs.map((s, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						placeholder: "Spec name (e.g. Voltage)",
						value: s.key,
						onChange: (e) => update(i, "key", e.target.value),
						className: "flex-1"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						placeholder: "Value (e.g. 220V)",
						value: s.value,
						onChange: (e) => update(i, "value", e.target.value),
						className: "flex-1"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "button",
						size: "icon",
						variant: "ghost",
						className: "flex-shrink-0",
						onClick: () => remove(i),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-4 w-4" })
					})
				]
			}, i))
		})
	] });
}
//#endregion
export { AdminProducts as component };

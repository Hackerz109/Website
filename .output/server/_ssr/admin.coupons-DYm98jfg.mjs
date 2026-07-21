import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { t as formatMoney } from "./cart-e0HpVhNN.mjs";
import { t as cn } from "./utils-CBUTxTND.mjs";
import { c as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { t as Button } from "./button-BNPKdh9r.mjs";
import { t as supabase } from "./client-C6ZaJElq.mjs";
import { E as Search, F as Pencil, P as Percent, Y as IndianRupee, at as Copy, c as Truck, d as Trash2, dt as ChevronsUpDown, gt as Check, j as Plus, n as X, nt as EyeOff, p as Ticket, t as Zap, tt as Eye } from "../_libs/lucide-react.mjs";
import { t as Input } from "./input-fWD4AjO2.mjs";
import { t as Label } from "./label-RYLdB5Mm.mjs";
import { t as Textarea } from "./textarea-BMjH46cN.mjs";
import { t as Switch } from "./switch-B_mOGtgs.mjs";
import { t as Badge } from "./badge-BJLbp-XX.mjs";
import { i as TabsTrigger, n as TabsContent, r as TabsList, t as Tabs } from "./tabs-DJ00V9Pn.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./select-CEaR62Wk.mjs";
import { a as DialogHeader, i as DialogFooter, n as DialogContent, o as DialogTitle, t as Dialog } from "./dialog-BrvgweL9.mjs";
import { a as TableHeader, i as TableHead, n as TableBody, o as TableRow, r as TableCell, t as Table } from "./table-D6qyMGWy.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { i as Trigger, n as Portal, r as Root2, t as Content2 } from "../_libs/radix-ui__react-popover.mjs";
import { t as _e } from "../_libs/cmdk.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.coupons-DYm98jfg.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var Popover = Root2;
var PopoverTrigger = Trigger;
var PopoverContent = import_react.forwardRef(({ className, align = "center", sideOffset = 4, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Portal, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Content2, {
	ref,
	align,
	sideOffset,
	className: cn("z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-popover-content-transform-origin)", className),
	...props
}) }));
PopoverContent.displayName = Content2.displayName;
var Command$1 = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(_e, {
	ref,
	className: cn("flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground", className),
	...props
}));
Command$1.displayName = _e.displayName;
var CommandInput = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
	className: "flex items-center border-b px-3",
	"cmdk-input-wrapper": "",
	children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "mr-2 h-4 w-4 shrink-0 opacity-50" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(_e.Input, {
		ref,
		className: cn("flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50", className),
		...props
	})]
}));
CommandInput.displayName = _e.Input.displayName;
var CommandList = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(_e.List, {
	ref,
	className: cn("max-h-[300px] overflow-y-auto overflow-x-hidden", className),
	...props
}));
CommandList.displayName = _e.List.displayName;
var CommandEmpty = import_react.forwardRef((props, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(_e.Empty, {
	ref,
	className: "py-6 text-center text-sm",
	...props
}));
CommandEmpty.displayName = _e.Empty.displayName;
var CommandGroup = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(_e.Group, {
	ref,
	className: cn("overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground", className),
	...props
}));
CommandGroup.displayName = _e.Group.displayName;
var CommandSeparator = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(_e.Separator, {
	ref,
	className: cn("-mx-1 h-px bg-border", className),
	...props
}));
CommandSeparator.displayName = _e.Separator.displayName;
var CommandItem = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(_e.Item, {
	ref,
	className: cn("relative flex cursor-default gap-2 select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none data-[disabled=true]:pointer-events-none data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0", className),
	...props
}));
CommandItem.displayName = _e.Item.displayName;
var CommandShortcut = ({ className, ...props }) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: cn("ml-auto text-xs tracking-widest text-muted-foreground", className),
		...props
	});
};
CommandShortcut.displayName = "CommandShortcut";
function MultiSelect({ options, selected, onChange, placeholder = "Select…" }) {
	const [open, setOpen] = (0, import_react.useState)(false);
	const selectedOptions = options.filter((o) => selected.includes(o.id));
	function toggle(id) {
		onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Popover, {
		open,
		onOpenChange: setOpen,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PopoverTrigger, {
			asChild: true,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
				type: "button",
				variant: "outline",
				role: "combobox",
				className: "w-full justify-between font-normal",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "truncate text-muted-foreground",
					children: selectedOptions.length === 0 ? placeholder : `${selectedOptions.length} selected`
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronsUpDown, { className: "ml-2 h-4 w-4 flex-shrink-0 opacity-50" })]
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PopoverContent, {
			className: "w-[--radix-popover-trigger-width] p-0",
			align: "start",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Command$1, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CommandInput, { placeholder: "Search…" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CommandList, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CommandEmpty, { children: "Nothing found." }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CommandGroup, { children: options.map((o) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CommandItem, {
				value: o.label,
				onSelect: () => toggle(o.id),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: cn("mr-2 h-4 w-4", selected.includes(o.id) ? "opacity-100" : "opacity-0") }), o.label]
			}, o.id)) })] })] })
		})]
	}), selectedOptions.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "mt-2 flex flex-wrap gap-1.5",
		children: selectedOptions.map((o) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
			variant: "secondary",
			className: "gap-1 pr-1 font-normal",
			children: [o.label, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: () => toggle(o.id),
				className: "rounded-full hover:bg-muted-foreground/20",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-3 w-3" })
			})]
		}, o.id))
	})] });
}
var emptyForm = {
	code: "",
	description: "",
	discount_type: "percentage",
	discount_value: "",
	max_discount_cents: "",
	visibility: "visible",
	active: true,
	min_order_cents: "",
	max_order_cents: "",
	first_order_only: false,
	login_required: false,
	customer_type: "any",
	eligible_product_ids: [],
	eligible_category_ids: [],
	eligible_brand_ids: [],
	excluded_product_ids: [],
	excluded_category_ids: [],
	excluded_brand_ids: [],
	stackable: false,
	valid_from: "",
	valid_until: "",
	usage_limit: "",
	usage_limit_per_customer: ""
};
function generateCode() {
	const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
	let out = "";
	for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * 32)];
	return out;
}
function toDatetimeLocal(iso) {
	if (!iso) return "";
	const d = new Date(iso);
	const pad = (n) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function statusOf(c) {
	if (!c.active) return "Disabled";
	if (c.valid_until && new Date(c.valid_until) < /* @__PURE__ */ new Date()) return "Expired";
	return "Active";
}
function statusColor(s) {
	if (s === "Active") return "bg-green-100 text-green-700 hover:bg-green-100";
	if (s === "Expired") return "bg-amber-100 text-amber-700 hover:bg-amber-100";
	return "bg-secondary text-muted-foreground hover:bg-secondary";
}
function discountLabel(c) {
	if (c.discount_type === "free_shipping") return "Free shipping";
	if (c.discount_type === "percentage") {
		const cap = c.max_discount_cents ? ` (up to ${formatMoney(c.max_discount_cents)})` : "";
		return `${c.discount_value}% off${cap}`;
	}
	return `${formatMoney(c.discount_value)} off`;
}
function discountIcon(type) {
	if (type === "percentage") return Percent;
	if (type === "free_shipping") return Truck;
	return IndianRupee;
}
function AdminCoupons() {
	const [coupons, setCoupons] = (0, import_react.useState)([]);
	const [stats, setStats] = (0, import_react.useState)({});
	const [products, setProducts] = (0, import_react.useState)([]);
	const [categories, setCategories] = (0, import_react.useState)([]);
	const [brands, setBrands] = (0, import_react.useState)([]);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [open, setOpen] = (0, import_react.useState)(false);
	const [editing, setEditing] = (0, import_react.useState)(null);
	const [form, setForm] = (0, import_react.useState)(emptyForm);
	const [saving, setSaving] = (0, import_react.useState)(false);
	async function load() {
		setLoading(true);
		const [couponsRes, statsRes, productsRes, categoriesRes, brandsRes] = await Promise.all([
			supabase.from("coupons").select("*").order("created_at", { ascending: false }),
			supabase.rpc("get_coupon_stats"),
			supabase.from("products").select("id, name").order("name"),
			supabase.from("categories").select("id, name").order("name"),
			supabase.from("brands").select("id, name").order("name")
		]);
		if (couponsRes.error) toast.error(couponsRes.error.message);
		setCoupons(couponsRes.data ?? []);
		const statsMap = {};
		for (const row of statsRes.data ?? []) statsMap[row.coupon_id] = {
			usage_count: row.usage_count,
			total_discount_cents: row.total_discount_cents,
			revenue_cents: row.revenue_cents
		};
		setStats(statsMap);
		setProducts(productsRes.data ?? []);
		setCategories(categoriesRes.data ?? []);
		setBrands(brandsRes.data ?? []);
		setLoading(false);
	}
	(0, import_react.useEffect)(() => {
		load();
	}, []);
	function openCreate() {
		setEditing(null);
		setForm({
			...emptyForm,
			code: generateCode()
		});
		setOpen(true);
	}
	function openEdit(c) {
		setEditing(c);
		setForm({
			code: c.code,
			description: c.description ?? "",
			discount_type: c.discount_type,
			discount_value: c.discount_type === "fixed" ? (c.discount_value / 100).toString() : String(c.discount_value),
			max_discount_cents: c.max_discount_cents ? (c.max_discount_cents / 100).toString() : "",
			visibility: c.visibility,
			active: c.active,
			min_order_cents: c.min_order_cents ? (c.min_order_cents / 100).toString() : "",
			max_order_cents: c.max_order_cents ? (c.max_order_cents / 100).toString() : "",
			first_order_only: c.first_order_only,
			login_required: c.login_required,
			customer_type: c.customer_type,
			eligible_product_ids: c.eligible_product_ids ?? [],
			eligible_category_ids: c.eligible_category_ids ?? [],
			eligible_brand_ids: c.eligible_brand_ids ?? [],
			excluded_product_ids: c.excluded_product_ids ?? [],
			excluded_category_ids: c.excluded_category_ids ?? [],
			excluded_brand_ids: c.excluded_brand_ids ?? [],
			stackable: c.stackable,
			valid_from: toDatetimeLocal(c.valid_from),
			valid_until: toDatetimeLocal(c.valid_until),
			usage_limit: c.usage_limit?.toString() ?? "",
			usage_limit_per_customer: c.usage_limit_per_customer?.toString() ?? ""
		});
		setOpen(true);
	}
	function buildPayload() {
		const discount_value = form.discount_type === "fixed" ? Math.round(parseFloat(form.discount_value || "0") * 100) : Math.round(parseFloat(form.discount_value || "0"));
		return {
			code: form.code.trim().toUpperCase(),
			description: form.description || null,
			discount_type: form.discount_type,
			discount_value: isNaN(discount_value) ? 0 : discount_value,
			max_discount_cents: form.max_discount_cents ? Math.round(parseFloat(form.max_discount_cents) * 100) : null,
			visibility: form.visibility,
			active: form.active,
			min_order_cents: form.min_order_cents ? Math.round(parseFloat(form.min_order_cents) * 100) : null,
			max_order_cents: form.max_order_cents ? Math.round(parseFloat(form.max_order_cents) * 100) : null,
			first_order_only: form.first_order_only,
			login_required: form.login_required,
			customer_type: form.customer_type,
			eligible_product_ids: form.eligible_product_ids,
			eligible_category_ids: form.eligible_category_ids,
			eligible_brand_ids: form.eligible_brand_ids,
			excluded_product_ids: form.excluded_product_ids,
			excluded_category_ids: form.excluded_category_ids,
			excluded_brand_ids: form.excluded_brand_ids,
			stackable: form.stackable,
			valid_from: form.valid_from ? new Date(form.valid_from).toISOString() : null,
			valid_until: form.valid_until ? new Date(form.valid_until).toISOString() : null,
			usage_limit: form.usage_limit ? parseInt(form.usage_limit, 10) : null,
			usage_limit_per_customer: form.usage_limit_per_customer ? parseInt(form.usage_limit_per_customer, 10) : null
		};
	}
	async function save() {
		if (!form.code.trim()) return toast.error("Coupon code is required");
		if (form.discount_type !== "free_shipping" && !form.discount_value) return toast.error("Enter a discount value");
		setSaving(true);
		const payload = buildPayload();
		const { error } = editing ? await supabase.from("coupons").update(payload).eq("id", editing.id) : await supabase.from("coupons").insert(payload);
		setSaving(false);
		if (error) return toast.error(error.message);
		toast.success(editing ? "Coupon updated" : "Coupon created");
		setOpen(false);
		load();
	}
	async function toggleActive(c) {
		const { error } = await supabase.from("coupons").update({ active: !c.active }).eq("id", c.id);
		if (error) return toast.error(error.message);
		setCoupons((prev) => prev.map((x) => x.id === c.id ? {
			...x,
			active: !x.active
		} : x));
	}
	async function duplicate(c) {
		const { id, created_at, updated_at, ...rest } = c;
		const payload = {
			...rest,
			code: `${c.code}-COPY`,
			active: false
		};
		const { error } = await supabase.from("coupons").insert(payload);
		if (error) return toast.error(error.message);
		toast.success("Coupon duplicated — review it before enabling.");
		load();
	}
	async function remove(c) {
		if (!confirm(`Delete coupon "${c.code}"? This can't be undone.`)) return;
		const { error } = await supabase.from("coupons").delete().eq("id", c.id);
		if (error) return toast.error(error.message);
		toast.success("Coupon deleted");
		setCoupons((prev) => prev.filter((x) => x.id !== c.id));
	}
	const rows = (0, import_react.useMemo)(() => coupons.map((c) => ({
		coupon: c,
		status: statusOf(c),
		stats: stats[c.id] ?? {
			usage_count: 0,
			total_discount_cents: 0,
			revenue_cents: 0
		}
	})), [coupons, stats]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center justify-between gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-2xl font-semibold tracking-tight",
				children: "Coupons"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-sm text-muted-foreground",
				children: "Create and track discount codes for your store."
			})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
				onClick: openCreate,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "mr-1.5 h-4 w-4" }), " New coupon"]
			})]
		}),
		loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-8 text-sm text-muted-foreground",
			children: "Loading…"
		}) : rows.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-8 rounded-2xl border border-dashed p-16 text-center text-muted-foreground",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ticket, { className: "mx-auto h-8 w-8 opacity-40" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3",
				children: "No coupons yet. Create your first one to start offering discounts."
			})]
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-6 space-y-3 md:hidden",
			children: rows.map(({ coupon: c, status, stats: s }) => {
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-xl border p-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-start justify-between gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-accent text-primary",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(discountIcon(c.discount_type), { className: "h-4 w-4" })
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "font-mono text-sm font-semibold",
									children: c.code
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs text-muted-foreground",
									children: discountLabel(c)
								})] })]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
								className: statusColor(status),
								variant: "secondary",
								children: status
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-3 grid grid-cols-3 gap-2 border-t pt-3 text-center text-xs",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "font-semibold",
									children: s.usage_count
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-muted-foreground",
									children: "Used"
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "font-semibold",
									children: formatMoney(s.total_discount_cents)
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-muted-foreground",
									children: "Given"
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "font-semibold",
									children: formatMoney(s.revenue_cents)
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-muted-foreground",
									children: "Revenue"
								})] })
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-3 flex items-center justify-between border-t pt-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
									checked: c.active,
									onCheckedChange: () => toggleActive(c)
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-xs text-muted-foreground",
									children: c.active ? "Enabled" : "Disabled"
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex gap-1",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
										size: "icon",
										variant: "ghost",
										onClick: () => duplicate(c),
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { className: "h-4 w-4" })
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
										size: "icon",
										variant: "ghost",
										onClick: () => openEdit(c),
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pencil, { className: "h-4 w-4" })
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
										size: "icon",
										variant: "ghost",
										onClick: () => remove(c),
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-4 w-4" })
									})
								]
							})]
						})
					]
				}, c.id);
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-6 hidden overflow-x-auto rounded-xl border md:block",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Table, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableRow, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Code" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Discount" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Status" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, {
					className: "text-right",
					children: "Uses"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, {
					className: "text-right",
					children: "Discount given"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, {
					className: "text-right",
					children: "Revenue"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Valid" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, {
					className: "text-right",
					children: "Actions"
				})
			] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableBody, { children: rows.map(({ coupon: c, status, stats: s }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableRow, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-mono text-sm font-semibold",
							children: c.code
						}),
						c.visibility === "hidden" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EyeOff, { className: "h-3.5 w-3.5 text-muted-foreground" }),
						c.visibility === "visible" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Eye, { className: "h-3.5 w-3.5 text-muted-foreground" }),
						c.visibility === "auto_apply" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Zap, { className: "h-3.5 w-3.5 text-muted-foreground" })
					]
				}) }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
					className: "text-sm",
					children: discountLabel(c)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
						checked: c.active,
						onCheckedChange: () => toggleActive(c)
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
						className: statusColor(status),
						variant: "secondary",
						children: status
					})]
				}) }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableCell, {
					className: "text-right text-sm",
					children: [s.usage_count, c.usage_limit ? ` / ${c.usage_limit}` : ""]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
					className: "text-right text-sm",
					children: formatMoney(s.total_discount_cents)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
					className: "text-right text-sm",
					children: formatMoney(s.revenue_cents)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableCell, {
					className: "text-xs text-muted-foreground",
					children: [
						c.valid_from ? new Date(c.valid_from).toLocaleDateString() : "Any time",
						" – ",
						c.valid_until ? new Date(c.valid_until).toLocaleDateString() : "No expiry"
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
					className: "text-right",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex justify-end gap-1",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								size: "icon",
								variant: "ghost",
								onClick: () => duplicate(c),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { className: "h-4 w-4" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								size: "icon",
								variant: "ghost",
								onClick: () => openEdit(c),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pencil, { className: "h-4 w-4" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								size: "icon",
								variant: "ghost",
								onClick: () => remove(c),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-4 w-4" })
							})
						]
					})
				})
			] }, c.id)) })] })
		})] }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
			open,
			onOpenChange: setOpen,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
				className: "max-h-[85vh] max-w-2xl overflow-y-auto",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: editing ? "Edit coupon" : "New coupon" }) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tabs, {
						defaultValue: "basics",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsList, {
								className: "grid w-full grid-cols-3",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
										value: "basics",
										children: "Basics"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
										value: "conditions",
										children: "Conditions"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
										value: "limits",
										children: "Limits & dates"
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsContent, {
								value: "basics",
								className: "space-y-4 pt-4",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Coupon code" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "mt-1.5 flex gap-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											value: form.code,
											onChange: (e) => setForm({
												...form,
												code: e.target.value.toUpperCase()
											}),
											placeholder: "SUMMER20",
											className: "font-mono"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
											type: "button",
											variant: "outline",
											onClick: () => setForm({
												...form,
												code: generateCode()
											}),
											children: "Generate"
										})]
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Internal description (optional)" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
										value: form.description,
										onChange: (e) => setForm({
											...form,
											description: e.target.value
										}),
										placeholder: "What's this coupon for? Shown to shoppers if visible.",
										rows: 2
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "grid grid-cols-1 gap-3 sm:grid-cols-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Discount type" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
											value: form.discount_type,
											onValueChange: (v) => setForm({
												...form,
												discount_type: v
											}),
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
													value: "percentage",
													children: "Percentage"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
													value: "fixed",
													children: "Fixed amount"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
													value: "free_shipping",
													children: "Free shipping"
												})
											] })]
										})] }), form.discount_type !== "free_shipping" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: form.discount_type === "percentage" ? "Discount (%)" : "Discount amount (INR)" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											type: "number",
											value: form.discount_value,
											onChange: (e) => setForm({
												...form,
												discount_value: e.target.value
											}),
											placeholder: form.discount_type === "percentage" ? "10" : "200"
										})] })]
									}),
									form.discount_type === "percentage" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Maximum discount (INR, optional)" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										type: "number",
										value: form.max_discount_cents,
										onChange: (e) => setForm({
											...form,
											max_discount_cents: e.target.value
										}),
										placeholder: "No cap"
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "grid grid-cols-1 gap-3 sm:grid-cols-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Visibility" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
											value: form.visibility,
											onValueChange: (v) => setForm({
												...form,
												visibility: v
											}),
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
													value: "visible",
													children: "Visible — shown to shoppers"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
													value: "hidden",
													children: "Hidden — code only"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
													value: "auto_apply",
													children: "Auto-apply"
												})
											] })]
										})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center gap-2 pt-6",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
												checked: form.active,
												onCheckedChange: (v) => setForm({
													...form,
													active: v
												})
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
												className: "!mt-0",
												children: "Enabled"
											})]
										})]
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsContent, {
								value: "conditions",
								className: "space-y-4 pt-4",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "grid grid-cols-1 gap-3 sm:grid-cols-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Minimum order value (INR)" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											type: "number",
											value: form.min_order_cents,
											onChange: (e) => setForm({
												...form,
												min_order_cents: e.target.value
											}),
											placeholder: "None"
										})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Maximum order value (INR)" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											type: "number",
											value: form.max_order_cents,
											onChange: (e) => setForm({
												...form,
												max_order_cents: e.target.value
											}),
											placeholder: "None"
										})] })]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "grid grid-cols-1 gap-3 sm:grid-cols-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center gap-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
												checked: form.first_order_only,
												onCheckedChange: (v) => setForm({
													...form,
													first_order_only: v
												})
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
												className: "!mt-0",
												children: "First order only"
											})]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center gap-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
												checked: form.login_required,
												onCheckedChange: (v) => setForm({
													...form,
													login_required: v
												})
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
												className: "!mt-0",
												children: "Logged-in users only"
											})]
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Customer type" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
										value: form.customer_type,
										onValueChange: (v) => setForm({
											...form,
											customer_type: v
										}),
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
												value: "any",
												children: "Any customer"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
												value: "new",
												children: "New customers only"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
												value: "existing",
												children: "Existing customers only"
											})
										] })]
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "rounded-lg border p-3",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-xs font-medium text-muted-foreground",
											children: "Applies to specific items (leave all empty to apply store-wide)"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "mt-3 space-y-3",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Specific products" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MultiSelect, {
													options: products.map((p) => ({
														id: p.id,
														label: p.name
													})),
													selected: form.eligible_product_ids,
													onChange: (ids) => setForm({
														...form,
														eligible_product_ids: ids
													}),
													placeholder: "All products"
												})] }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Specific categories" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MultiSelect, {
													options: categories.map((c) => ({
														id: c.id,
														label: c.name
													})),
													selected: form.eligible_category_ids,
													onChange: (ids) => setForm({
														...form,
														eligible_category_ids: ids
													}),
													placeholder: "All categories"
												})] }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Specific brands" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MultiSelect, {
													options: brands.map((b) => ({
														id: b.id,
														label: b.name
													})),
													selected: form.eligible_brand_ids,
													onChange: (ids) => setForm({
														...form,
														eligible_brand_ids: ids
													}),
													placeholder: "All brands"
												})] })
											]
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "rounded-lg border p-3",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-xs font-medium text-muted-foreground",
											children: "Exclude items (always wins over the above)"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "mt-3 space-y-3",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Exclude products" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MultiSelect, {
													options: products.map((p) => ({
														id: p.id,
														label: p.name
													})),
													selected: form.excluded_product_ids,
													onChange: (ids) => setForm({
														...form,
														excluded_product_ids: ids
													}),
													placeholder: "None excluded"
												})] }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Exclude categories" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MultiSelect, {
													options: categories.map((c) => ({
														id: c.id,
														label: c.name
													})),
													selected: form.excluded_category_ids,
													onChange: (ids) => setForm({
														...form,
														excluded_category_ids: ids
													}),
													placeholder: "None excluded"
												})] }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Exclude brands" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MultiSelect, {
													options: brands.map((b) => ({
														id: b.id,
														label: b.name
													})),
													selected: form.excluded_brand_ids,
													onChange: (ids) => setForm({
														...form,
														excluded_brand_ids: ids
													}),
													placeholder: "None excluded"
												})] })
											]
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
											checked: form.stackable,
											onCheckedChange: (v) => setForm({
												...form,
												stackable: v
											})
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
											className: "!mt-0",
											children: "Stackable with other coupons"
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "-mt-2 text-xs text-muted-foreground",
										children: "Checkout currently accepts one coupon per order regardless of this setting — it's here so stacking can be turned on later without any database changes."
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsContent, {
								value: "limits",
								className: "space-y-4 pt-4",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "grid grid-cols-1 gap-3 sm:grid-cols-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Valid from" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										type: "datetime-local",
										value: form.valid_from,
										onChange: (e) => setForm({
											...form,
											valid_from: e.target.value
										})
									})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Expires" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										type: "datetime-local",
										value: form.valid_until,
										onChange: (e) => setForm({
											...form,
											valid_until: e.target.value
										})
									})] })]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "grid grid-cols-1 gap-3 sm:grid-cols-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Total usage limit" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										type: "number",
										value: form.usage_limit,
										onChange: (e) => setForm({
											...form,
											usage_limit: e.target.value
										}),
										placeholder: "Unlimited"
									})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Limit per customer" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										type: "number",
										value: form.usage_limit_per_customer,
										onChange: (e) => setForm({
											...form,
											usage_limit_per_customer: e.target.value
										}),
										placeholder: "Unlimited"
									})] })]
								})]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "outline",
						onClick: () => setOpen(false),
						children: "Cancel"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						onClick: save,
						disabled: saving,
						children: saving ? "Saving…" : editing ? "Save changes" : "Create coupon"
					})] })
				]
			})
		})
	] });
}
//#endregion
export { AdminCoupons as component };

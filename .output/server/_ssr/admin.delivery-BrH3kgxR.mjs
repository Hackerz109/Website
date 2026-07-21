import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { c as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { t as Button } from "./button-BNPKdh9r.mjs";
import { t as supabase } from "./client-C6ZaJElq.mjs";
import { r as useQueryClient, t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { F as Pencil, H as MapPin, _ as Star, d as Trash2, j as Plus } from "../_libs/lucide-react.mjs";
import { t as Input } from "./input-fWD4AjO2.mjs";
import { t as Label } from "./label-RYLdB5Mm.mjs";
import { t as Textarea } from "./textarea-BMjH46cN.mjs";
import { t as Switch } from "./switch-B_mOGtgs.mjs";
import { t as Badge } from "./badge-BJLbp-XX.mjs";
import { a as DialogHeader, i as DialogFooter, n as DialogContent, o as DialogTitle, s as DialogTrigger, t as Dialog } from "./dialog-BrvgweL9.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { n as RadioGroupItem, t as RadioGroup } from "./radio-group-B9sPezFr.mjs";
import { r as getBrowserLocation, t as LeafletMap } from "./delivery-IvurY_5s.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.delivery-BrH3kgxR.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var FALLBACK_CENTER = {
	lat: 20.5937,
	lng: 78.9629
};
var ZONE_COLORS = [
	"#2454e5",
	"#16a34a",
	"#d97706",
	"#dc2626",
	"#7c3aed"
];
function AdminDelivery() {
	const qc = useQueryClient();
	const { data: locations } = useQuery({
		queryKey: ["admin-store-locations"],
		queryFn: async () => {
			const { data, error } = await supabase.from("store_locations").select("*").order("is_primary", { ascending: false });
			if (error) throw error;
			return data;
		}
	});
	const { data: zones } = useQuery({
		queryKey: ["admin-delivery-zones"],
		queryFn: async () => {
			const { data, error } = await supabase.from("delivery_zones").select("*").order("radius_km");
			if (error) throw error;
			return data;
		}
	});
	const { data: settings } = useQuery({
		queryKey: ["admin-delivery-settings"],
		queryFn: async () => {
			const { data, error } = await supabase.from("delivery_settings").select("*").eq("id", true).single();
			if (error) throw error;
			return data;
		}
	});
	const { data: tiers } = useQuery({
		queryKey: ["admin-rate-tiers"],
		queryFn: async () => {
			const { data, error } = await supabase.from("delivery_rate_tiers").select("*").order("min_km");
			if (error) throw error;
			return data;
		}
	});
	function invalidateAll() {
		qc.invalidateQueries({ queryKey: ["admin-store-locations"] });
		qc.invalidateQueries({ queryKey: ["admin-delivery-zones"] });
	}
	const locationById = new Map((locations ?? []).map((l) => [l.id, l]));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-2xl font-semibold tracking-tight",
				children: "Delivery & Pickup"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted-foreground",
				children: "Shop locations, delivery zones, and charges — all editable here, no code changes needed."
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-xl border p-5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-semibold",
					children: "Map overview"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-3",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LeafletMap, {
						center: locations?.find((l) => l.is_primary) ? {
							lat: locations.find((l) => l.is_primary).lat,
							lng: locations.find((l) => l.is_primary).lng
						} : FALLBACK_CENTER,
						zoom: 11,
						fitToContent: true,
						markers: (locations ?? []).map((l) => ({
							id: l.id,
							lat: l.lat,
							lng: l.lng,
							color: "#16a34a",
							label: l.name
						})),
						circles: (zones ?? []).map((z, i) => {
							const loc = locationById.get(z.store_location_id);
							return loc ? {
								id: z.id,
								lat: loc.lat,
								lng: loc.lng,
								radiusKm: z.radius_km,
								color: ZONE_COLORS[i % ZONE_COLORS.length],
								label: `${z.name} (${z.radius_km} km)`
							} : null;
						}).filter((c) => !!c),
						height: 320
					})
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-xl border p-5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-semibold",
						children: "Shop locations"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LocationDialog, { onSaved: invalidateAll })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-3 space-y-2",
					children: [(locations ?? []).map((l) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between gap-3 rounded-lg border p-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "min-w-0",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "flex items-center gap-1.5 text-sm font-medium",
								children: [
									l.name,
									" ",
									l.is_primary && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
										className: "bg-primary/10 text-primary hover:bg-primary/10",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Star, { className: "mr-1 h-3 w-3" }), "Primary"]
									}),
									!l.active && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
										variant: "secondary",
										children: "Inactive"
									})
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "truncate text-xs text-muted-foreground",
								children: l.address || `${l.lat}, ${l.lng}`
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-shrink-0 items-center gap-1",
							children: [
								!l.is_primary && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									size: "sm",
									variant: "ghost",
									onClick: () => setPrimary(l.id, invalidateAll),
									children: "Set primary"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
									checked: l.active,
									onCheckedChange: (v) => toggleLocationActive(l.id, v, invalidateAll)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LocationDialog, {
									existing: l,
									onSaved: invalidateAll,
									trigger: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
										size: "icon",
										variant: "ghost",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pencil, { className: "h-3.5 w-3.5" })
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									size: "icon",
									variant: "ghost",
									onClick: () => deleteLocation(l.id, invalidateAll),
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-3.5 w-3.5" })
								})
							]
						})]
					}, l.id)), (locations ?? []).length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground",
						children: "No shop location yet — add one to start configuring delivery zones."
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-xl border p-5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "font-semibold",
							children: "Delivery zones"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ZoneDialog, {
							locations: locations ?? [],
							onSaved: invalidateAll
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-xs text-muted-foreground",
						children: "Customers within any active zone's radius can choose Home Delivery. Outside all zones, only Store Pickup is offered."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-3 space-y-2",
						children: [(zones ?? []).map((z) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between gap-3 rounded-lg border p-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-sm font-medium",
								children: [
									z.name,
									" — ",
									z.radius_km,
									" km"
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-xs text-muted-foreground",
								children: ["from ", locationById.get(z.store_location_id)?.name ?? "unknown location"]
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-1",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
										checked: z.is_active,
										onCheckedChange: (v) => toggleZoneActive(z.id, v, invalidateAll)
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ZoneDialog, {
										locations: locations ?? [],
										existing: z,
										onSaved: invalidateAll,
										trigger: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
											size: "icon",
											variant: "ghost",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pencil, { className: "h-3.5 w-3.5" })
										})
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
										size: "icon",
										variant: "ghost",
										onClick: () => deleteZone(z.id, invalidateAll),
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-3.5 w-3.5" })
									})
								]
							})]
						}, z.id)), (zones ?? []).length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground",
							children: "No delivery zones yet — add one (e.g. \"5 km zone\") to enable Home Delivery."
						})]
					})
				]
			}),
			settings && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SettingsCard, {
				settings,
				tiers: tiers ?? []
			})
		]
	});
}
async function setPrimary(id, done) {
	await supabase.from("store_locations").update({ is_primary: false }).neq("id", id);
	const { error } = await supabase.from("store_locations").update({ is_primary: true }).eq("id", id);
	if (error) return toast.error(error.message);
	toast.success("Primary location updated");
	done();
}
async function toggleLocationActive(id, active, done) {
	const { error } = await supabase.from("store_locations").update({ active }).eq("id", id);
	if (error) return toast.error(error.message);
	done();
}
async function deleteLocation(id, done) {
	if (!confirm("Delete this location? Its delivery zones will be removed too.")) return;
	const { error } = await supabase.from("store_locations").delete().eq("id", id);
	if (error) return toast.error(error.message);
	toast.success("Location deleted");
	done();
}
async function toggleZoneActive(id, is_active, done) {
	const { error } = await supabase.from("delivery_zones").update({ is_active }).eq("id", id);
	if (error) return toast.error(error.message);
	done();
}
async function deleteZone(id, done) {
	if (!confirm("Delete this delivery zone?")) return;
	const { error } = await supabase.from("delivery_zones").delete().eq("id", id);
	if (error) return toast.error(error.message);
	toast.success("Zone deleted");
	done();
}
function LocationDialog({ existing, onSaved, trigger }) {
	const [open, setOpen] = (0, import_react.useState)(false);
	const [name, setName] = (0, import_react.useState)(existing?.name ?? "Main Store");
	const [address, setAddress] = (0, import_react.useState)(existing?.address ?? "");
	const [coords, setCoords] = (0, import_react.useState)({
		lat: existing?.lat ?? FALLBACK_CENTER.lat,
		lng: existing?.lng ?? FALLBACK_CENTER.lng
	});
	const [saving, setSaving] = (0, import_react.useState)(false);
	const [locating, setLocating] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		if (open && !existing) getBrowserLocation().then((loc) => loc && setCoords(loc));
	}, [open]);
	async function save() {
		setSaving(true);
		const payload = {
			name,
			address,
			lat: coords.lat,
			lng: coords.lng
		};
		const { error } = existing ? await supabase.from("store_locations").update(payload).eq("id", existing.id) : await supabase.from("store_locations").insert({
			...payload,
			is_primary: true
		});
		setSaving(false);
		if (error) return toast.error(error.message);
		toast.success("Location saved");
		setOpen(false);
		onSaved();
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Dialog, {
		open,
		onOpenChange: setOpen,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTrigger, {
			asChild: true,
			children: trigger ?? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
				size: "sm",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "mr-1.5 h-3.5 w-3.5" }), " Add location"]
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
			className: "max-h-[85vh] overflow-y-auto",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogTitle, { children: [existing ? "Edit" : "Add", " shop location"] }) }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Name" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							value: name,
							onChange: (e) => setName(e.target.value)
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Address (shown to customers choosing pickup)" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
							value: address,
							onChange: (e) => setAddress(e.target.value),
							rows: 2
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Pin the location on the map" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								type: "button",
								size: "sm",
								variant: "outline",
								disabled: locating,
								onClick: async () => {
									setLocating(true);
									const loc = await getBrowserLocation();
									setLocating(false);
									if (loc) setCoords(loc);
									else toast.error("Couldn't get your current location");
								},
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MapPin, { className: "mr-1.5 h-3.5 w-3.5" }),
									" ",
									locating ? "Locating…" : "Use my location"
								]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LeafletMap, {
							center: coords,
							markers: [{
								id: "loc",
								lat: coords.lat,
								lng: coords.lng,
								color: "#16a34a",
								draggable: true,
								onDragEnd: (lat, lng) => setCoords({
									lat,
									lng
								})
							}],
							onMapClick: (lat, lng) => setCoords({
								lat,
								lng
							}),
							height: 260
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-muted-foreground",
							children: "Drag the pin or tap the map to fine-tune."
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogFooter, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					className: "w-full",
					onClick: save,
					disabled: saving || !name.trim(),
					children: saving ? "Saving…" : "Save location"
				}) })
			]
		})]
	});
}
function ZoneDialog({ locations, existing, onSaved, trigger }) {
	const [open, setOpen] = (0, import_react.useState)(false);
	const [name, setName] = (0, import_react.useState)(existing?.name ?? "");
	const [radius, setRadius] = (0, import_react.useState)(String(existing?.radius_km ?? 5));
	const [locationId, setLocationId] = (0, import_react.useState)(existing?.store_location_id ?? "");
	const [saving, setSaving] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		if (!open) return;
		setName(existing?.name ?? "");
		setRadius(String(existing?.radius_km ?? 5));
		setLocationId(existing?.store_location_id ?? locations.find((l) => l.is_primary)?.id ?? locations[0]?.id ?? "");
	}, [
		open,
		existing,
		locations
	]);
	async function save() {
		if (!locationId) return toast.error("Add a shop location first");
		if (!name.trim()) return toast.error("Give the zone a name");
		const radiusKm = Number(radius);
		if (!(radiusKm > 0)) return toast.error("Radius must be greater than 0");
		setSaving(true);
		const payload = {
			name,
			radius_km: radiusKm,
			store_location_id: locationId
		};
		const { error } = existing ? await supabase.from("delivery_zones").update(payload).eq("id", existing.id) : await supabase.from("delivery_zones").insert(payload);
		setSaving(false);
		if (error) return toast.error(error.message);
		toast.success("Zone saved");
		setOpen(false);
		onSaved();
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Dialog, {
		open,
		onOpenChange: setOpen,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTrigger, {
			asChild: true,
			children: trigger ?? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
				size: "sm",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "mr-1.5 h-3.5 w-3.5" }), " Add zone"]
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogTitle, { children: [existing ? "Edit" : "Add", " delivery zone"] }) }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Zone name" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						value: name,
						onChange: (e) => setName(e.target.value),
						placeholder: "e.g. 5 km zone"
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Radius (km)" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						type: "number",
						min: .1,
						step: "0.1",
						value: radius,
						onChange: (e) => setRadius(e.target.value)
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "From shop location" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
						className: "mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm",
						value: locationId,
						onChange: (e) => setLocationId(e.target.value),
						children: locations.map((l) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: l.id,
							children: l.name
						}, l.id))
					})] })
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogFooter, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				className: "w-full",
				onClick: save,
				disabled: saving,
				children: saving ? "Saving…" : "Save zone"
			}) })
		] })]
	});
}
function SettingsCard({ settings, tiers }) {
	const qc = useQueryClient();
	const [chargeType, setChargeType] = (0, import_react.useState)(settings.charge_type);
	const [flatCharge, setFlatCharge] = (0, import_react.useState)(String(settings.flat_charge_cents / 100));
	const [freeDeliveryEnabled, setFreeDeliveryEnabled] = (0, import_react.useState)(settings.free_delivery_min_cents != null);
	const [freeDeliveryMin, setFreeDeliveryMin] = (0, import_react.useState)(String((settings.free_delivery_min_cents ?? 0) / 100));
	const [pickupCharge, setPickupCharge] = (0, import_react.useState)(String(settings.pickup_charge_cents / 100));
	const [deliveryEta, setDeliveryEta] = (0, import_react.useState)(settings.delivery_eta_text);
	const [pickupEta, setPickupEta] = (0, import_react.useState)(settings.pickup_eta_text);
	const [deliveryInstructions, setDeliveryInstructions] = (0, import_react.useState)(settings.delivery_instructions ?? "");
	const [pickupInstructions, setPickupInstructions] = (0, import_react.useState)(settings.pickup_instructions ?? "");
	const [pickupAddress, setPickupAddress] = (0, import_react.useState)(settings.pickup_address ?? "");
	const [tierRows, setTierRows] = (0, import_react.useState)(tiers.map((t) => ({
		id: t.id,
		min_km: String(t.min_km),
		max_km: t.max_km != null ? String(t.max_km) : "",
		charge_cents: String(t.charge_cents / 100)
	})));
	const [saving, setSaving] = (0, import_react.useState)(false);
	function addTierRow() {
		setTierRows((rows) => [...rows, {
			id: crypto.randomUUID(),
			min_km: "0",
			max_km: "",
			charge_cents: "0"
		}]);
	}
	function removeTierRow(id) {
		setTierRows((rows) => rows.filter((r) => r.id !== id));
	}
	function updateTierRow(id, patch) {
		setTierRows((rows) => rows.map((r) => r.id === id ? {
			...r,
			...patch
		} : r));
	}
	async function save() {
		setSaving(true);
		const { error: settingsErr } = await supabase.from("delivery_settings").update({
			charge_type: chargeType,
			flat_charge_cents: Math.round(Number(flatCharge) * 100),
			free_delivery_min_cents: freeDeliveryEnabled ? Math.round(Number(freeDeliveryMin) * 100) : null,
			pickup_charge_cents: Math.round(Number(pickupCharge) * 100),
			delivery_eta_text: deliveryEta,
			pickup_eta_text: pickupEta,
			delivery_instructions: deliveryInstructions || null,
			pickup_instructions: pickupInstructions || null,
			pickup_address: pickupAddress || null
		}).eq("id", true);
		await supabase.from("delivery_rate_tiers").delete().gte("min_km", 0);
		if (chargeType === "distance" && tierRows.length > 0) await supabase.from("delivery_rate_tiers").insert(tierRows.map((r, i) => ({
			min_km: Number(r.min_km) || 0,
			max_km: r.max_km.trim() === "" ? null : Number(r.max_km),
			charge_cents: Math.round((Number(r.charge_cents) || 0) * 100),
			sort_order: i
		})));
		setSaving(false);
		if (settingsErr) return toast.error(settingsErr.message);
		toast.success("Delivery settings saved");
		qc.invalidateQueries({ queryKey: ["admin-delivery-settings"] });
		qc.invalidateQueries({ queryKey: ["admin-rate-tiers"] });
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-xl border p-5 space-y-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "font-semibold",
				children: "Charges, timing & instructions"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Delivery charge type" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(RadioGroup, {
				value: chargeType,
				onValueChange: (v) => setChargeType(v),
				className: "mt-1.5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RadioGroupItem, {
						value: "flat",
						id: "ct-flat"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
						htmlFor: "ct-flat",
						className: "font-normal",
						children: "Flat rate"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RadioGroupItem, {
						value: "distance",
						id: "ct-distance"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
						htmlFor: "ct-distance",
						className: "font-normal",
						children: "Distance-based tiers"
					})]
				})]
			})] }),
			chargeType === "flat" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Flat delivery charge (₹)" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
				type: "number",
				min: 0,
				step: "0.01",
				value: flatCharge,
				onChange: (e) => setFlatCharge(e.target.value),
				className: "max-w-[160px]"
			})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Distance tiers (km → ₹)" }),
					tierRows.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								type: "number",
								placeholder: "Min km",
								value: r.min_km,
								onChange: (e) => updateTierRow(r.id, { min_km: e.target.value }),
								className: "w-24"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-xs text-muted-foreground",
								children: "to"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								type: "number",
								placeholder: "Max km (blank = ∞)",
								value: r.max_km,
								onChange: (e) => updateTierRow(r.id, { max_km: e.target.value }),
								className: "w-32"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-xs text-muted-foreground",
								children: "₹"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								type: "number",
								placeholder: "Charge",
								value: r.charge_cents,
								onChange: (e) => updateTierRow(r.id, { charge_cents: e.target.value }),
								className: "w-24"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								size: "icon",
								variant: "ghost",
								onClick: () => removeTierRow(r.id),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-3.5 w-3.5" })
							})
						]
					}, r.id)),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						size: "sm",
						variant: "outline",
						onClick: addTierRow,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "mr-1.5 h-3.5 w-3.5" }), " Add tier"]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between rounded-lg border p-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Free delivery above order value" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs text-muted-foreground",
					children: "Waives the delivery charge once the cart subtotal clears this amount."
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
					checked: freeDeliveryEnabled,
					onCheckedChange: setFreeDeliveryEnabled
				})]
			}),
			freeDeliveryEnabled && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
				type: "number",
				min: 0,
				step: "0.01",
				value: freeDeliveryMin,
				onChange: (e) => setFreeDeliveryMin(e.target.value),
				className: "max-w-[160px]",
				placeholder: "Order amount (₹)"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Pickup charge (₹, default 0)" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
				type: "number",
				min: 0,
				step: "0.01",
				value: pickupCharge,
				onChange: (e) => setPickupCharge(e.target.value),
				className: "max-w-[160px]"
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-3 sm:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Estimated delivery time" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					value: deliveryEta,
					onChange: (e) => setDeliveryEta(e.target.value),
					placeholder: "e.g. 2-4 business days"
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Estimated pickup time" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					value: pickupEta,
					onChange: (e) => setPickupEta(e.target.value),
					placeholder: "e.g. Ready within 24 hours"
				})] })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Delivery instructions (shown to customers)" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
				value: deliveryInstructions,
				onChange: (e) => setDeliveryInstructions(e.target.value),
				rows: 2
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Pickup instructions (shown to customers)" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
				value: pickupInstructions,
				onChange: (e) => setPickupInstructions(e.target.value),
				rows: 2
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Pickup address (if different from shop location)" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
				value: pickupAddress,
				onChange: (e) => setPickupAddress(e.target.value),
				rows: 2
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				onClick: save,
				disabled: saving,
				children: saving ? "Saving…" : "Save settings"
			})
		]
	});
}
//#endregion
export { AdminDelivery as component };

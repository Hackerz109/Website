import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Star, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { LeafletMap } from "@/components/LeafletMap";
import { supabase } from "@/integrations/supabase/client";
import { getBrowserLocation } from "@/lib/delivery";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/admin/delivery")({ component: AdminDelivery });

type StoreLocation = Database["public"]["Tables"]["store_locations"]["Row"];
type DeliveryZone = Database["public"]["Tables"]["delivery_zones"]["Row"];
type RateTier = Database["public"]["Tables"]["delivery_rate_tiers"]["Row"];
type Settings = Database["public"]["Tables"]["delivery_settings"]["Row"];

const FALLBACK_CENTER = { lat: 20.5937, lng: 78.9629 };
const ZONE_COLORS = ["#2454e5", "#16a34a", "#d97706", "#dc2626", "#7c3aed"];

function AdminDelivery() {
  const qc = useQueryClient();

  const { data: locations } = useQuery({
    queryKey: ["admin-store-locations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("store_locations").select("*").order("is_primary", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const { data: zones } = useQuery({
    queryKey: ["admin-delivery-zones"],
    queryFn: async () => {
      const { data, error } = await supabase.from("delivery_zones").select("*").order("radius_km");
      if (error) throw error;
      return data;
    },
  });
  const { data: settings } = useQuery({
    queryKey: ["admin-delivery-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("delivery_settings").select("*").eq("id", true).single();
      if (error) throw error;
      return data;
    },
  });
  const { data: tiers } = useQuery({
    queryKey: ["admin-rate-tiers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("delivery_rate_tiers").select("*").order("min_km");
      if (error) throw error;
      return data;
    },
  });

  function invalidateAll() {
    qc.invalidateQueries({ queryKey: ["admin-store-locations"] });
    qc.invalidateQueries({ queryKey: ["admin-delivery-zones"] });
  }

  const locationById = new Map((locations ?? []).map((l) => [l.id, l]));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Delivery & Pickup</h1>
        <p className="text-sm text-muted-foreground">Shop locations, delivery zones, and charges — all editable here, no code changes needed.</p>
      </div>

      {/* Overview map */}
      <div className="rounded-xl border p-5">
        <h2 className="font-semibold">Map overview</h2>
        <div className="mt-3">
          <LeafletMap
            center={locations?.find((l) => l.is_primary) ? { lat: locations.find((l) => l.is_primary)!.lat, lng: locations.find((l) => l.is_primary)!.lng } : FALLBACK_CENTER}
            zoom={11}
            fitToContent
            markers={(locations ?? []).map((l) => ({ id: l.id, lat: l.lat, lng: l.lng, color: "#16a34a", label: l.name }))}
            circles={(zones ?? []).map((z, i) => {
              const loc = locationById.get(z.store_location_id);
              return loc ? { id: z.id, lat: loc.lat, lng: loc.lng, radiusKm: z.radius_km, color: ZONE_COLORS[i % ZONE_COLORS.length], label: `${z.name} (${z.radius_km} km)` } : null;
            }).filter((c): c is NonNullable<typeof c> => !!c)}
            height={320}
          />
        </div>
      </div>

      {/* Store locations */}
      <div className="rounded-xl border p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Shop locations</h2>
          <LocationDialog onSaved={invalidateAll} />
        </div>
        <div className="mt-3 space-y-2">
          {(locations ?? []).map((l) => (
            <div key={l.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  {l.name} {l.is_primary && <Badge className="bg-primary/10 text-primary hover:bg-primary/10"><Star className="mr-1 h-3 w-3" />Primary</Badge>}
                  {!l.active && <Badge variant="secondary">Inactive</Badge>}
                </p>
                <p className="truncate text-xs text-muted-foreground">{l.address || `${l.lat}, ${l.lng}`}</p>
              </div>
              <div className="flex flex-shrink-0 items-center gap-1">
                {!l.is_primary && (
                  <Button size="sm" variant="ghost" onClick={() => setPrimary(l.id, invalidateAll)}>Set primary</Button>
                )}
                <Switch checked={l.active} onCheckedChange={(v) => toggleLocationActive(l.id, v, invalidateAll)} />
                <LocationDialog existing={l} onSaved={invalidateAll} trigger={<Button size="icon" variant="ghost"><Pencil className="h-3.5 w-3.5" /></Button>} />
                <Button size="icon" variant="ghost" onClick={() => deleteLocation(l.id, invalidateAll)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          ))}
          {(locations ?? []).length === 0 && (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No shop location yet — add one to start configuring delivery zones.
            </p>
          )}
        </div>
      </div>

      {/* Delivery zones */}
      <div className="rounded-xl border p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Delivery zones</h2>
          <ZoneDialog locations={locations ?? []} onSaved={invalidateAll} />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Customers within any active zone's radius can choose Home Delivery. Outside all zones, only Store Pickup is offered.
        </p>
        <div className="mt-3 space-y-2">
          {(zones ?? []).map((z) => (
            <div key={z.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">{z.name} — {z.radius_km} km</p>
                <p className="text-xs text-muted-foreground">from {locationById.get(z.store_location_id)?.name ?? "unknown location"}</p>
              </div>
              <div className="flex items-center gap-1">
                <Switch checked={z.is_active} onCheckedChange={(v) => toggleZoneActive(z.id, v, invalidateAll)} />
                <ZoneDialog locations={locations ?? []} existing={z} onSaved={invalidateAll} trigger={<Button size="icon" variant="ghost"><Pencil className="h-3.5 w-3.5" /></Button>} />
                <Button size="icon" variant="ghost" onClick={() => deleteZone(z.id, invalidateAll)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          ))}
          {(zones ?? []).length === 0 && (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No delivery zones yet — add one (e.g. "5 km zone") to enable Home Delivery.
            </p>
          )}
        </div>
      </div>

      {/* Charges & settings */}
      {settings && <SettingsCard settings={settings} tiers={tiers ?? []} />}
    </div>
  );
}

async function setPrimary(id: string, done: () => void) {
  await supabase.from("store_locations").update({ is_primary: false }).neq("id", id);
  const { error } = await supabase.from("store_locations").update({ is_primary: true }).eq("id", id);
  if (error) return toast.error(error.message);
  toast.success("Primary location updated");
  done();
}

async function toggleLocationActive(id: string, active: boolean, done: () => void) {
  const { error } = await supabase.from("store_locations").update({ active }).eq("id", id);
  if (error) return toast.error(error.message);
  done();
}

async function deleteLocation(id: string, done: () => void) {
  if (!confirm("Delete this location? Its delivery zones will be removed too.")) return;
  const { error } = await supabase.from("store_locations").delete().eq("id", id);
  if (error) return toast.error(error.message);
  toast.success("Location deleted");
  done();
}

async function toggleZoneActive(id: string, is_active: boolean, done: () => void) {
  const { error } = await supabase.from("delivery_zones").update({ is_active }).eq("id", id);
  if (error) return toast.error(error.message);
  done();
}

async function deleteZone(id: string, done: () => void) {
  if (!confirm("Delete this delivery zone?")) return;
  const { error } = await supabase.from("delivery_zones").delete().eq("id", id);
  if (error) return toast.error(error.message);
  toast.success("Zone deleted");
  done();
}

function LocationDialog({ existing, onSaved, trigger }: { existing?: StoreLocation; onSaved: () => void; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(existing?.name ?? "Main Store");
  const [address, setAddress] = useState(existing?.address ?? "");
  const [coords, setCoords] = useState({ lat: existing?.lat ?? FALLBACK_CENTER.lat, lng: existing?.lng ?? FALLBACK_CENTER.lng });
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (open && !existing) {
      // Convenience: prefill with the admin's current location when adding the first location.
      getBrowserLocation().then((loc) => loc && setCoords(loc));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function save() {
    setSaving(true);
    const payload = { name, address, lat: coords.lat, lng: coords.lng };
    const { error } = existing
      ? await supabase.from("store_locations").update(payload).eq("id", existing.id)
      : await supabase.from("store_locations").insert({ ...payload, is_primary: true });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Location saved");
    setOpen(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button size="sm"><Plus className="mr-1.5 h-3.5 w-3.5" /> Add location</Button>}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{existing ? "Edit" : "Add"} shop location</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Address (shown to customers choosing pickup)</Label>
            <Textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Pin the location on the map</Label>
            <Button type="button" size="sm" variant="outline" disabled={locating} onClick={async () => {
              setLocating(true);
              const loc = await getBrowserLocation();
              setLocating(false);
              if (loc) setCoords(loc); else toast.error("Couldn't get your current location");
            }}>
              <MapPin className="mr-1.5 h-3.5 w-3.5" /> {locating ? "Locating…" : "Use my location"}
            </Button>
          </div>
          <LeafletMap
            center={coords}
            markers={[{ id: "loc", lat: coords.lat, lng: coords.lng, color: "#16a34a", draggable: true, onDragEnd: (lat, lng) => setCoords({ lat, lng }) }]}
            onMapClick={(lat, lng) => setCoords({ lat, lng })}
            height={260}
          />
          <p className="text-xs text-muted-foreground">Drag the pin or tap the map to fine-tune.</p>
        </div>
        <DialogFooter>
          <Button className="w-full" onClick={save} disabled={saving || !name.trim()}>{saving ? "Saving…" : "Save location"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ZoneDialog({ locations, existing, onSaved, trigger }: { locations: StoreLocation[]; existing?: DeliveryZone; onSaved: () => void; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(existing?.name ?? "");
  const [radius, setRadius] = useState(String(existing?.radius_km ?? 5));
  const [locationId, setLocationId] = useState(existing?.store_location_id ?? "");
  const [saving, setSaving] = useState(false);

  // `locations` loads asynchronously and can still be [] on first mount, so we
  // can't rely on the useState initializer above (it only runs once). Sync it
  // here instead so a newly-added shop location is picked up automatically.
  useEffect(() => {
    if (!locationId && !existing && locations.length > 0) {
      setLocationId(locations.find((l) => l.is_primary)?.id ?? locations[0].id);
    }
  }, [locations, existing, locationId]);

  async function save() {
    if (!locationId) return toast.error("Add a shop location first");
    if (!name.trim()) return toast.error("Give the zone a name");
    const radiusKm = Number(radius);
    if (!(radiusKm > 0)) return toast.error("Radius must be greater than 0");
    setSaving(true);
    const payload = { name, radius_km: radiusKm, store_location_id: locationId };
    const { error } = existing
      ? await supabase.from("delivery_zones").update(payload).eq("id", existing.id)
      : await supabase.from("delivery_zones").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Zone saved");
    setOpen(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button size="sm"><Plus className="mr-1.5 h-3.5 w-3.5" /> Add zone</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{existing ? "Edit" : "Add"} delivery zone</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Zone name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 5 km zone" />
          </div>
          <div>
            <Label>Radius (km)</Label>
            <Input type="number" min={0.1} step="0.1" value={radius} onChange={(e) => setRadius(e.target.value)} />
          </div>
          <div>
            <Label>From shop location</Label>
            <select
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
            >
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button className="w-full" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save zone"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SettingsCard({ settings, tiers }: { settings: Settings; tiers: RateTier[] }) {
  const qc = useQueryClient();
  const [chargeType, setChargeType] = useState(settings.charge_type);
  const [flatCharge, setFlatCharge] = useState(String(settings.flat_charge_cents / 100));
  const [freeDeliveryEnabled, setFreeDeliveryEnabled] = useState(settings.free_delivery_min_cents != null);
  const [freeDeliveryMin, setFreeDeliveryMin] = useState(String((settings.free_delivery_min_cents ?? 0) / 100));
  const [pickupCharge, setPickupCharge] = useState(String(settings.pickup_charge_cents / 100));
  const [deliveryEta, setDeliveryEta] = useState(settings.delivery_eta_text);
  const [pickupEta, setPickupEta] = useState(settings.pickup_eta_text);
  const [deliveryInstructions, setDeliveryInstructions] = useState(settings.delivery_instructions ?? "");
  const [pickupInstructions, setPickupInstructions] = useState(settings.pickup_instructions ?? "");
  const [pickupAddress, setPickupAddress] = useState(settings.pickup_address ?? "");
  const [tierRows, setTierRows] = useState(tiers.map((t) => ({ id: t.id, min_km: String(t.min_km), max_km: t.max_km != null ? String(t.max_km) : "", charge_cents: String(t.charge_cents / 100) })));
  const [saving, setSaving] = useState(false);

  function addTierRow() {
    setTierRows((rows) => [...rows, { id: crypto.randomUUID(), min_km: "0", max_km: "", charge_cents: "0" }]);
  }
  function removeTierRow(id: string) {
    setTierRows((rows) => rows.filter((r) => r.id !== id));
  }
  function updateTierRow(id: string, patch: Partial<(typeof tierRows)[number]>) {
    setTierRows((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function save() {
    setSaving(true);
    const { error: settingsErr } = await supabase
      .from("delivery_settings")
      .update({
        charge_type: chargeType,
        flat_charge_cents: Math.round(Number(flatCharge) * 100),
        free_delivery_min_cents: freeDeliveryEnabled ? Math.round(Number(freeDeliveryMin) * 100) : null,
        pickup_charge_cents: Math.round(Number(pickupCharge) * 100),
        delivery_eta_text: deliveryEta,
        pickup_eta_text: pickupEta,
        delivery_instructions: deliveryInstructions || null,
        pickup_instructions: pickupInstructions || null,
        pickup_address: pickupAddress || null,
      })
      .eq("id", true);

    // Simple full-replace strategy for rate tiers — this is a small, admin-only settings list, not a high-volume table.
    await supabase.from("delivery_rate_tiers").delete().gte("min_km", 0);
    if (chargeType === "distance" && tierRows.length > 0) {
      await supabase.from("delivery_rate_tiers").insert(
        tierRows.map((r, i) => ({
          min_km: Number(r.min_km) || 0,
          max_km: r.max_km.trim() === "" ? null : Number(r.max_km),
          charge_cents: Math.round((Number(r.charge_cents) || 0) * 100),
          sort_order: i,
        })),
      );
    }

    setSaving(false);
    if (settingsErr) return toast.error(settingsErr.message);
    toast.success("Delivery settings saved");
    qc.invalidateQueries({ queryKey: ["admin-delivery-settings"] });
    qc.invalidateQueries({ queryKey: ["admin-rate-tiers"] });
  }

  return (
    <div className="rounded-xl border p-5 space-y-5">
      <h2 className="font-semibold">Charges, timing & instructions</h2>

      <div>
        <Label>Delivery charge type</Label>
        <RadioGroup value={chargeType} onValueChange={(v) => setChargeType(v as Settings["charge_type"])} className="mt-1.5">
          <div className="flex items-center gap-2">
            <RadioGroupItem value="flat" id="ct-flat" />
            <Label htmlFor="ct-flat" className="font-normal">Flat rate</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="distance" id="ct-distance" />
            <Label htmlFor="ct-distance" className="font-normal">Distance-based tiers</Label>
          </div>
        </RadioGroup>
      </div>

      {chargeType === "flat" ? (
        <div>
          <Label>Flat delivery charge (₹)</Label>
          <Input type="number" min={0} step="0.01" value={flatCharge} onChange={(e) => setFlatCharge(e.target.value)} className="max-w-[160px]" />
        </div>
      ) : (
        <div className="space-y-2">
          <Label>Distance tiers (km → ₹)</Label>
          {tierRows.map((r) => (
            <div key={r.id} className="flex items-center gap-2">
              <Input type="number" placeholder="Min km" value={r.min_km} onChange={(e) => updateTierRow(r.id, { min_km: e.target.value })} className="w-24" />
              <span className="text-xs text-muted-foreground">to</span>
              <Input type="number" placeholder="Max km (blank = ∞)" value={r.max_km} onChange={(e) => updateTierRow(r.id, { max_km: e.target.value })} className="w-32" />
              <span className="text-xs text-muted-foreground">₹</span>
              <Input type="number" placeholder="Charge" value={r.charge_cents} onChange={(e) => updateTierRow(r.id, { charge_cents: e.target.value })} className="w-24" />
              <Button size="icon" variant="ghost" onClick={() => removeTierRow(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={addTierRow}><Plus className="mr-1.5 h-3.5 w-3.5" /> Add tier</Button>
        </div>
      )}

      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <Label>Free delivery above order value</Label>
          <p className="text-xs text-muted-foreground">Waives the delivery charge once the cart subtotal clears this amount.</p>
        </div>
        <Switch checked={freeDeliveryEnabled} onCheckedChange={setFreeDeliveryEnabled} />
      </div>
      {freeDeliveryEnabled && (
        <Input type="number" min={0} step="0.01" value={freeDeliveryMin} onChange={(e) => setFreeDeliveryMin(e.target.value)} className="max-w-[160px]" placeholder="Order amount (₹)" />
      )}

      <div>
        <Label>Pickup charge (₹, default 0)</Label>
        <Input type="number" min={0} step="0.01" value={pickupCharge} onChange={(e) => setPickupCharge(e.target.value)} className="max-w-[160px]" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Estimated delivery time</Label>
          <Input value={deliveryEta} onChange={(e) => setDeliveryEta(e.target.value)} placeholder="e.g. 2-4 business days" />
        </div>
        <div>
          <Label>Estimated pickup time</Label>
          <Input value={pickupEta} onChange={(e) => setPickupEta(e.target.value)} placeholder="e.g. Ready within 24 hours" />
        </div>
      </div>

      <div>
        <Label>Delivery instructions (shown to customers)</Label>
        <Textarea value={deliveryInstructions} onChange={(e) => setDeliveryInstructions(e.target.value)} rows={2} />
      </div>
      <div>
        <Label>Pickup instructions (shown to customers)</Label>
        <Textarea value={pickupInstructions} onChange={(e) => setPickupInstructions(e.target.value)} rows={2} />
      </div>
      <div>
        <Label>Pickup address (if different from shop location)</Label>
        <Textarea value={pickupAddress} onChange={(e) => setPickupAddress(e.target.value)} rows={2} />
      </div>

      <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save settings"}</Button>
    </div>
  );
}

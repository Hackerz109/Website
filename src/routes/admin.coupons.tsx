import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Copy,
  Trash2,
  Pencil,
  Ticket,
  Percent,
  IndianRupee,
  Truck,
  Eye,
  EyeOff,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MultiSelect } from "@/components/MultiSelect";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/stores/cart";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/admin/coupons")({
  component: AdminCoupons,
  validateSearch: (search: Record<string, unknown>) => ({
    edit: typeof search.edit === "string" ? search.edit : undefined,
  }),
});

type Coupon = Database["public"]["Tables"]["coupons"]["Row"];
type DiscountType = Database["public"]["Enums"]["coupon_discount_type"];
type Visibility = Database["public"]["Enums"]["coupon_visibility"];
type CustomerType = Database["public"]["Enums"]["coupon_customer_type"];
type Stats = { usage_count: number; total_discount_cents: number; revenue_cents: number };

const emptyForm = {
  code: "",
  description: "",
  discount_type: "percentage" as DiscountType,
  discount_value: "",
  max_discount_cents: "",
  visibility: "visible" as Visibility,
  active: true,
  min_order_cents: "",
  max_order_cents: "",
  first_order_only: false,
  login_required: false,
  customer_type: "any" as CustomerType,
  eligible_product_ids: [] as string[],
  eligible_category_ids: [] as string[],
  eligible_brand_ids: [] as string[],
  excluded_product_ids: [] as string[],
  excluded_category_ids: [] as string[],
  excluded_brand_ids: [] as string[],
  stackable: false,
  valid_from: "",
  valid_until: "",
  usage_limit: "",
  usage_limit_per_customer: "",
};

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function toDatetimeLocal(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function statusOf(c: Coupon): "Active" | "Expired" | "Disabled" {
  if (!c.active) return "Disabled";
  if (c.valid_until && new Date(c.valid_until) < new Date()) return "Expired";
  return "Active";
}

function statusColor(s: string) {
  if (s === "Active") return "bg-green-100 text-green-700 hover:bg-green-100";
  if (s === "Expired") return "bg-amber-100 text-amber-700 hover:bg-amber-100";
  return "bg-secondary text-muted-foreground hover:bg-secondary";
}

function discountLabel(c: Coupon) {
  if (c.discount_type === "free_shipping") return "Free shipping";
  if (c.discount_type === "percentage") {
    const cap = c.max_discount_cents ? ` (up to ${formatMoney(c.max_discount_cents)})` : "";
    return `${c.discount_value}% off${cap}`;
  }
  return `${formatMoney(c.discount_value)} off`;
}

function discountIcon(type: DiscountType) {
  if (type === "percentage") return Percent;
  if (type === "free_shipping") return Truck;
  return IndianRupee;
}

function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [stats, setStats] = useState<Record<string, Stats>>({});
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [brands, setBrands] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const [couponsRes, statsRes, productsRes, categoriesRes, brandsRes] = await Promise.all([
      supabase.from("coupons").select("*").order("created_at", { ascending: false }),
      supabase.rpc("get_coupon_stats"),
      supabase.from("products").select("id, name").order("name"),
      supabase.from("categories").select("id, name").order("name"),
      supabase.from("brands").select("id, name").order("name"),
    ]);
    if (couponsRes.error) toast.error(couponsRes.error.message);
    setCoupons(couponsRes.data ?? []);
    const statsMap: Record<string, Stats> = {};
    for (const row of statsRes.data ?? []) {
      statsMap[row.coupon_id] = {
        usage_count: row.usage_count,
        total_discount_cents: row.total_discount_cents,
        revenue_cents: row.revenue_cents,
      };
    }
    setStats(statsMap);
    setProducts(productsRes.data ?? []);
    setCategories(categoriesRes.data ?? []);
    setBrands(brandsRes.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const { edit: editId } = Route.useSearch();
  const navigate = useNavigate();

  useEffect(() => {
    if (!editId || coupons.length === 0) return;
    const match = coupons.find((c) => c.id === editId);
    if (match) openEdit(match);
    navigate({ to: "/admin/coupons", search: {}, replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId, coupons]);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, code: generateCode() });
    setOpen(true);
  }

  function openEdit(c: Coupon) {
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
      usage_limit_per_customer: c.usage_limit_per_customer?.toString() ?? "",
    });
    setOpen(true);
  }

  function buildPayload() {
    const discount_value =
      form.discount_type === "fixed"
        ? Math.round(parseFloat(form.discount_value || "0") * 100)
        : Math.round(parseFloat(form.discount_value || "0"));
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
      usage_limit_per_customer: form.usage_limit_per_customer ? parseInt(form.usage_limit_per_customer, 10) : null,
    };
  }

  async function save() {
    if (!form.code.trim()) return toast.error("Coupon code is required");
    if (form.discount_type !== "free_shipping" && !form.discount_value) {
      return toast.error("Enter a discount value");
    }
    setSaving(true);
    const payload = buildPayload();
    const { error } = editing
      ? await supabase.from("coupons").update(payload).eq("id", editing.id)
      : await supabase.from("coupons").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Coupon updated" : "Coupon created");
    setOpen(false);
    load();
  }

  async function toggleActive(c: Coupon) {
    const { error } = await supabase.from("coupons").update({ active: !c.active }).eq("id", c.id);
    if (error) return toast.error(error.message);
    setCoupons((prev) => prev.map((x) => (x.id === c.id ? { ...x, active: !x.active } : x)));
  }

  async function duplicate(c: Coupon) {
    const { id, created_at, updated_at, ...rest } = c;
    const payload = { ...rest, code: `${c.code}-COPY`, active: false };
    const { error } = await supabase.from("coupons").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Coupon duplicated — review it before enabling.");
    load();
  }

  async function remove(c: Coupon) {
    if (!confirm(`Delete coupon "${c.code}"? This can't be undone.`)) return;
    const { error } = await supabase.from("coupons").delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success("Coupon deleted");
    setCoupons((prev) => prev.filter((x) => x.id !== c.id));
  }

  const rows = useMemo(
    () =>
      coupons.map((c) => ({
        coupon: c,
        status: statusOf(c),
        stats: stats[c.id] ?? { usage_count: 0, total_discount_cents: 0, revenue_cents: 0 },
      })),
    [coupons, stats],
  );

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Coupons</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create and track discount codes for your store.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-1.5 h-4 w-4" /> New coupon
        </Button>
      </div>

      {loading ? (
        <p className="mt-8 text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed p-16 text-center text-muted-foreground">
          <Ticket className="mx-auto h-8 w-8 opacity-40" />
          <p className="mt-3">No coupons yet. Create your first one to start offering discounts.</p>
        </div>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="mt-6 space-y-3 md:hidden">
            {rows.map(({ coupon: c, status, stats: s }) => {
              const Icon = discountIcon(c.discount_type);
              return (
                <div key={c.id} className="rounded-xl border p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="font-mono text-sm font-semibold">{c.code}</p>
                        <p className="text-xs text-muted-foreground">{discountLabel(c)}</p>
                      </div>
                    </div>
                    <Badge className={statusColor(status)} variant="secondary">{status}</Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 border-t pt-3 text-center text-xs">
                    <div>
                      <p className="font-semibold">{s.usage_count}</p>
                      <p className="text-muted-foreground">Used</p>
                    </div>
                    <div>
                      <p className="font-semibold">{formatMoney(s.total_discount_cents)}</p>
                      <p className="text-muted-foreground">Given</p>
                    </div>
                    <div>
                      <p className="font-semibold">{formatMoney(s.revenue_cents)}</p>
                      <p className="text-muted-foreground">Revenue</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t pt-3">
                    <div className="flex items-center gap-2">
                      <Switch checked={c.active} onCheckedChange={() => toggleActive(c)} />
                      <span className="text-xs text-muted-foreground">{c.active ? "Enabled" : "Disabled"}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => duplicate(c)}><Copy className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(c)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop: table */}
          <div className="mt-6 hidden overflow-x-auto rounded-xl border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Uses</TableHead>
                  <TableHead className="text-right">Discount given</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead>Valid</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ coupon: c, status, stats: s }) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold">{c.code}</span>
                        {c.visibility === "hidden" && <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
                        {c.visibility === "visible" && <Eye className="h-3.5 w-3.5 text-muted-foreground" />}
                        {c.visibility === "auto_apply" && <Zap className="h-3.5 w-3.5 text-muted-foreground" />}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{discountLabel(c)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch checked={c.active} onCheckedChange={() => toggleActive(c)} />
                        <Badge className={statusColor(status)} variant="secondary">{status}</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {s.usage_count}
                      {c.usage_limit ? ` / ${c.usage_limit}` : ""}
                    </TableCell>
                    <TableCell className="text-right text-sm">{formatMoney(s.total_discount_cents)}</TableCell>
                    <TableCell className="text-right text-sm">{formatMoney(s.revenue_cents)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.valid_from ? new Date(c.valid_from).toLocaleDateString() : "Any time"}
                      {" – "}
                      {c.valid_until ? new Date(c.valid_until).toLocaleDateString() : "No expiry"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => duplicate(c)}><Copy className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => remove(c)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit coupon" : "New coupon"}</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="basics">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basics">Basics</TabsTrigger>
              <TabsTrigger value="conditions">Conditions</TabsTrigger>
              <TabsTrigger value="limits">Limits &amp; dates</TabsTrigger>
            </TabsList>

            <TabsContent value="basics" className="space-y-4 pt-4">
              <div>
                <Label>Coupon code</Label>
                <div className="mt-1.5 flex gap-2">
                  <Input
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    placeholder="SUMMER20"
                    className="font-mono"
                  />
                  <Button type="button" variant="outline" onClick={() => setForm({ ...form, code: generateCode() })}>
                    Generate
                  </Button>
                </div>
              </div>
              <div>
                <Label>Internal description (optional)</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="What's this coupon for? Shown to shoppers if visible."
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label>Discount type</Label>
                  <Select value={form.discount_type} onValueChange={(v) => setForm({ ...form, discount_type: v as DiscountType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage</SelectItem>
                      <SelectItem value="fixed">Fixed amount</SelectItem>
                      <SelectItem value="free_shipping">Free shipping</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.discount_type !== "free_shipping" && (
                  <div>
                    <Label>{form.discount_type === "percentage" ? "Discount (%)" : "Discount amount (INR)"}</Label>
                    <Input
                      type="number"
                      value={form.discount_value}
                      onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                      placeholder={form.discount_type === "percentage" ? "10" : "200"}
                    />
                  </div>
                )}
              </div>
              {form.discount_type === "percentage" && (
                <div>
                  <Label>Maximum discount (INR, optional)</Label>
                  <Input
                    type="number"
                    value={form.max_discount_cents}
                    onChange={(e) => setForm({ ...form, max_discount_cents: e.target.value })}
                    placeholder="No cap"
                  />
                </div>
              )}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label>Visibility</Label>
                  <Select value={form.visibility} onValueChange={(v) => setForm({ ...form, visibility: v as Visibility })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="visible">Visible — shown to shoppers</SelectItem>
                      <SelectItem value="hidden">Hidden — code only</SelectItem>
                      <SelectItem value="auto_apply">Auto-apply</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
                  <Label className="!mt-0">Enabled</Label>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="conditions" className="space-y-4 pt-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label>Minimum order value (INR)</Label>
                  <Input type="number" value={form.min_order_cents} onChange={(e) => setForm({ ...form, min_order_cents: e.target.value })} placeholder="None" />
                </div>
                <div>
                  <Label>Maximum order value (INR)</Label>
                  <Input type="number" value={form.max_order_cents} onChange={(e) => setForm({ ...form, max_order_cents: e.target.value })} placeholder="None" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-2">
                  <Switch checked={form.first_order_only} onCheckedChange={(v) => setForm({ ...form, first_order_only: v })} />
                  <Label className="!mt-0">First order only</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.login_required} onCheckedChange={(v) => setForm({ ...form, login_required: v })} />
                  <Label className="!mt-0">Logged-in users only</Label>
                </div>
              </div>

              <div>
                <Label>Customer type</Label>
                <Select value={form.customer_type} onValueChange={(v) => setForm({ ...form, customer_type: v as CustomerType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any customer</SelectItem>
                    <SelectItem value="new">New customers only</SelectItem>
                    <SelectItem value="existing">Existing customers only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-lg border p-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Applies to specific items (leave all empty to apply store-wide)
                </p>
                <div className="mt-3 space-y-3">
                  <div>
                    <Label>Specific products</Label>
                    <MultiSelect
                      options={products.map((p) => ({ id: p.id, label: p.name }))}
                      selected={form.eligible_product_ids}
                      onChange={(ids) => setForm({ ...form, eligible_product_ids: ids })}
                      placeholder="All products"
                    />
                  </div>
                  <div>
                    <Label>Specific categories</Label>
                    <MultiSelect
                      options={categories.map((c) => ({ id: c.id, label: c.name }))}
                      selected={form.eligible_category_ids}
                      onChange={(ids) => setForm({ ...form, eligible_category_ids: ids })}
                      placeholder="All categories"
                    />
                  </div>
                  <div>
                    <Label>Specific brands</Label>
                    <MultiSelect
                      options={brands.map((b) => ({ id: b.id, label: b.name }))}
                      selected={form.eligible_brand_ids}
                      onChange={(ids) => setForm({ ...form, eligible_brand_ids: ids })}
                      placeholder="All brands"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-lg border p-3">
                <p className="text-xs font-medium text-muted-foreground">Exclude items (always wins over the above)</p>
                <div className="mt-3 space-y-3">
                  <div>
                    <Label>Exclude products</Label>
                    <MultiSelect
                      options={products.map((p) => ({ id: p.id, label: p.name }))}
                      selected={form.excluded_product_ids}
                      onChange={(ids) => setForm({ ...form, excluded_product_ids: ids })}
                      placeholder="None excluded"
                    />
                  </div>
                  <div>
                    <Label>Exclude categories</Label>
                    <MultiSelect
                      options={categories.map((c) => ({ id: c.id, label: c.name }))}
                      selected={form.excluded_category_ids}
                      onChange={(ids) => setForm({ ...form, excluded_category_ids: ids })}
                      placeholder="None excluded"
                    />
                  </div>
                  <div>
                    <Label>Exclude brands</Label>
                    <MultiSelect
                      options={brands.map((b) => ({ id: b.id, label: b.name }))}
                      selected={form.excluded_brand_ids}
                      onChange={(ids) => setForm({ ...form, excluded_brand_ids: ids })}
                      placeholder="None excluded"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch checked={form.stackable} onCheckedChange={(v) => setForm({ ...form, stackable: v })} />
                <Label className="!mt-0">Stackable with other coupons</Label>
              </div>
              <p className="-mt-2 text-xs text-muted-foreground">
                Checkout currently accepts one coupon per order regardless of this setting — it's here so
                stacking can be turned on later without any database changes.
              </p>
            </TabsContent>

            <TabsContent value="limits" className="space-y-4 pt-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label>Valid from</Label>
                  <Input type="datetime-local" value={form.valid_from} onChange={(e) => setForm({ ...form, valid_from: e.target.value })} />
                </div>
                <div>
                  <Label>Expires</Label>
                  <Input type="datetime-local" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label>Total usage limit</Label>
                  <Input type="number" value={form.usage_limit} onChange={(e) => setForm({ ...form, usage_limit: e.target.value })} placeholder="Unlimited" />
                </div>
                <div>
                  <Label>Limit per customer</Label>
                  <Input type="number" value={form.usage_limit_per_customer} onChange={(e) => setForm({ ...form, usage_limit_per_customer: e.target.value })} placeholder="Unlimited" />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : "Create coupon"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

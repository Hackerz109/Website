import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ChangeEvent } from "react";
import { Plus, Pencil, Trash2, Star, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { formatMoney } from "@/stores/cart";
import { TaxonomySelect } from "@/components/TaxonomySelect";
import { SmartSpecImporter } from "@/components/SmartSpecImporter";
import type { ParsedSpec } from "@/lib/parseSmartSpecifications";

type Product = Database["public"]["Tables"]["products"]["Row"];
type Variant = Database["public"]["Tables"]["product_variants"]["Row"];
type ProductImage = Database["public"]["Tables"]["product_images"]["Row"];

export const Route = createFileRoute("/admin/products")({
  component: AdminProducts,
  validateSearch: (search: Record<string, unknown>) => ({
    edit: typeof search.edit === "string" ? search.edit : undefined,
  }),
});

const empty = {
  name: "",
  slug: "",
  description: "",
  category: null as string | null,
  brand: null as string | null,
  price: "",
  mrp: "",
  sku: "",
  stock: "0",
  image_url: "",
  warranty: "",
  warranty_available: false,
  warranty_type: null as Database["public"]["Enums"]["warranty_type"] | null,
  warranty_duration: "",
  warranty_provider: "",
  warranty_service_method: null as Database["public"]["Enums"]["warranty_service_method"] | null,
  warranty_notes: "",
  specifications: [] as { key: string; value: string }[],
  active: true,
  featured: false,
};

const WARRANTY_TYPE_OPTIONS: { value: Database["public"]["Enums"]["warranty_type"]; label: string }[] = [
  { value: "manufacturer", label: "Manufacturer Warranty" },
  { value: "seller", label: "Seller Warranty" },
  { value: "extended", label: "Extended Warranty" },
];

const SERVICE_METHOD_OPTIONS: { value: Database["public"]["Enums"]["warranty_service_method"]; label: string }[] = [
  { value: "home_service", label: "Home Service" },
  { value: "authorized_service_center", label: "Authorized Service Center" },
  { value: "bring_to_store", label: "Bring to Store" },
  { value: "carry_in_service", label: "Carry-in Service" },
  { value: "on_site_service", label: "On-site Service" },
];

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function pathFromPublicUrl(url: string) {
  const marker = "/object/public/product-images/";
  const idx = url.indexOf(marker);
  return idx >= 0 ? url.slice(idx + marker.length) : null;
}

function AdminProducts() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const { data: products } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_variants(price_cents, stock), categories(name), brands(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { edit: editId } = Route.useSearch();
  const navigate = useNavigate();

  useEffect(() => {
    if (!editId || !products) return;
    const match = products.find((p) => p.id === editId);
    if (match) openEdit(match);
    navigate({ to: "/admin/products", search: {}, replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId, products]);

  function priceDisplay(p: Product & { product_variants?: { price_cents: number; stock: number }[] }) {
    const variants = p.product_variants ?? [];
    if (variants.length === 0) return formatMoney(p.price_cents, p.currency);
    const prices = variants.map((v) => v.price_cents);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return min === max ? formatMoney(min, p.currency) : `${formatMoney(min, p.currency)}–${formatMoney(max, p.currency)}`;
  }

  function stockDisplay(p: Product & { product_variants?: { price_cents: number; stock: number }[] }) {
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
  function openEdit(p: Product) {
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
      specifications: Array.isArray(p.specifications)
        ? (p.specifications as { key: string; value: string }[])
        : [],
      active: p.active,
      featured: p.featured,
    });
    setOpen(true);
  }

  async function save() {
    const price_cents = Math.round(parseFloat(form.price || "0") * 100);
    const stock = parseInt(form.stock || "0", 10);
    if (!form.name || isNaN(price_cents)) return toast.error("Name and price required");

    let mrp_cents: number | null = null;
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
      featured: form.featured,
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

  async function del(p: Product) {
    if (!confirm(`Delete "${p.name}"? This also removes its variants and images.`)) return;
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    invalidateStoreFront();
  }

  async function toggleActive(p: Product) {
    const { error } = await supabase.from("products").update({ active: !p.active }).eq("id", p.id);
    if (error) return toast.error(error.message);
    invalidateStoreFront();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" /> Add product
        </Button>
      </div>

      {/* Mobile: card list */}
      <div className="space-y-3 md:hidden">
        {(products ?? []).map((p) => (
          <div key={p.id} className="rounded-xl border p-4">
            <div className="flex items-start gap-3">
              <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-secondary/60">
                {p.image_url && <img src={p.image_url} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1 font-medium">
                  <span className="truncate">{p.name}</span>
                  {p.featured && <Star className="h-3 w-3 flex-shrink-0 fill-current text-amber-500" />}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  /{p.slug}{p.categories?.name ? ` · ${p.categories.name}` : ""}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <span className="font-medium">{priceDisplay(p)}</span>
                  <span className={stockDisplay(p) <= 3 ? "text-amber-600" : "text-muted-foreground"}>
                    {stockDisplay(p)} in stock
                    {(p.product_variants?.length ?? 0) > 0 && ` (${p.product_variants!.length} variants)`}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between border-t pt-3">
              <div className="flex items-center gap-2">
                <Switch checked={p.active} onCheckedChange={() => toggleActive(p)} />
                <span className="text-xs text-muted-foreground">{p.active ? "Active" : "Hidden"}</span>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => openEdit(p)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => del(p)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
        {(products ?? []).length === 0 && (
          <div className="rounded-xl border py-12 text-center text-sm text-muted-foreground">
            No products yet — tap "Add product" to create your first one.
          </div>
        )}
      </div>

      {/* Desktop: table */}
      <div className="hidden rounded-xl border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(products ?? []).map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 overflow-hidden rounded bg-secondary/60">
                      {p.image_url && <img src={p.image_url} alt="" className="h-full w-full object-cover" />}
                    </div>
                    <div>
                      <p className="flex items-center gap-1 font-medium">
                        {p.name}
                        {p.featured && <Star className="h-3 w-3 fill-current text-amber-500" />}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        /{p.slug}{p.categories?.name ? ` · ${p.categories.name}` : ""}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{priceDisplay(p)}</TableCell>
                <TableCell>
                  <span className={stockDisplay(p) <= 3 ? "text-amber-600" : ""}>{stockDisplay(p)}</span>
                  {(p.product_variants?.length ?? 0) > 0 && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({p.product_variants!.length} variant{p.product_variants!.length !== 1 ? "s" : ""})
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <Switch checked={p.active} onCheckedChange={() => toggleActive(p)} />
                </TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(p)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => del(p)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {(products ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                  No products yet — click "Add product" to create your first one.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit product" : "Add product"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Slug (URL)</Label>
              <Input
                value={form.slug}
                placeholder={form.name ? slugify(form.name) : "product-slug"}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TaxonomySelect
                table="categories"
                label="Category"
                value={form.category}
                onChange={(id) => setForm({ ...form, category: id })}
              />
              <TaxonomySelect
                table="brands"
                label="Brand"
                value={form.brand}
                onChange={(id) => setForm({ ...form, brand: id })}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label>Price (INR)</Label>
                <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div>
                <Label>Stock</Label>
                <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label>MRP (INR)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Optional"
                  value={form.mrp}
                  onChange={(e) => setForm({ ...form, mrp: e.target.value })}
                />
                <p className="mt-1 text-xs text-muted-foreground">Shown struck-through if higher than price.</p>
              </div>
              <div>
                <Label>SKU</Label>
                <Input
                  placeholder="Optional"
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                />
              </div>
            </div>
            <p className="-mt-2 text-xs text-muted-foreground">
              Price, MRP, stock & SKU above are used only if this product has no variants (see below).
            </p>
            <div className="rounded-xl border border-border p-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.warranty_available}
                  onCheckedChange={(v) => setForm({ ...form, warranty_available: v })}
                />
                <Label>Warranty available</Label>
              </div>
              {!form.warranty_available ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  The product page will show "No Warranty".
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label>Warranty type</Label>
                      <Select
                        value={form.warranty_type ?? undefined}
                        onValueChange={(v) =>
                          setForm({ ...form, warranty_type: v as Database["public"]["Enums"]["warranty_type"] })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {WARRANTY_TYPE_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Warranty duration</Label>
                      <Input
                        placeholder="e.g. 1 Year"
                        value={form.warranty_duration}
                        onChange={(e) => setForm({ ...form, warranty_duration: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label>Warranty provider</Label>
                      <Input
                        placeholder="e.g. SummerCool"
                        value={form.warranty_provider}
                        onChange={(e) => setForm({ ...form, warranty_provider: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Service method</Label>
                      <Select
                        value={form.warranty_service_method ?? undefined}
                        onValueChange={(v) =>
                          setForm({
                            ...form,
                            warranty_service_method: v as Database["public"]["Enums"]["warranty_service_method"],
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select service method" />
                        </SelectTrigger>
                        <SelectContent>
                          {SERVICE_METHOD_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Warranty notes</Label>
                    <Textarea
                      placeholder="e.g. Original purchase invoice required."
                      value={form.warranty_notes}
                      onChange={(e) => setForm({ ...form, warranty_notes: e.target.value })}
                      rows={2}
                    />
                  </div>
                </div>
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                Legacy free-text warranty note (only shown if the fields above are left off):
              </p>
              <Textarea
                className="mt-1"
                placeholder="e.g. 1 year manufacturer warranty. No returns on used items."
                value={form.warranty}
                onChange={(e) => setForm({ ...form, warranty: e.target.value })}
                rows={2}
              />
            </div>
            <SpecificationsEditor
              specs={form.specifications}
              onChange={(specs) => setForm({ ...form, specifications: specs })}
            />
            <div>
              <Label>Fallback image URL</Label>
              <Input value={form.image_url} placeholder="https://…" onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
              <p className="mt-1 text-xs text-muted-foreground">Used only if no images are uploaded below.</p>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
              <Label>Active (visible in store)</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.featured} onCheckedChange={(v) => setForm({ ...form, featured: v })} />
              <Label>Featured</Label>
            </div>

            <div className="border-t pt-4">
              {editing ? (
                <>
                  <VariantsEditor product={editing} qc={qc} invalidateStoreFront={invalidateStoreFront} />
                  <div className="mt-6">
                    <ImagesEditor product={editing} qc={qc} invalidateStoreFront={invalidateStoreFront} />
                  </div>
                </>
              ) : (
                <p className="rounded-lg bg-secondary/50 p-3 text-sm text-muted-foreground">
                  Save the product first, then variants and images can be added here.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Close</Button>
            <Button onClick={save} disabled={saving}>Save details</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function VariantsEditor({
  product,
  qc,
  invalidateStoreFront,
}: {
  product: Product;
  qc: ReturnType<typeof useQueryClient>;
  invalidateStoreFront: () => void;
}) {
  const { data: variants } = useQuery({
    queryKey: ["admin-variants", product.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_variants")
        .select("*")
        .eq("product_id", product.id)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const [drafts, setDrafts] = useState<Record<string, { name: string; price: string; stock: string; sku: string }>>({});

  useEffect(() => {
    if (!variants) return;
    const next: typeof drafts = {};
    for (const v of variants) {
      next[v.id] = {
        name: v.name,
        price: (v.price_cents / 100).toString(),
        stock: v.stock.toString(),
        sku: v.sku ?? "",
      };
    }
    setDrafts(next);
  }, [variants]);

  function refresh() {
    qc.invalidateQueries({ queryKey: ["admin-variants", product.id] });
    invalidateStoreFront();
  }

  async function addVariant() {
    const isFirstVariant = (variants?.length ?? 0) === 0;

    if (isFirstVariant) {
      // Adding the first variant switches the product to variant-based
      // pricing entirely, which would otherwise hide the price/stock the
      // admin already set on the product itself. Carry that over as a
      // "Standard" option instead of losing it.
      const { error: seedError } = await supabase.from("product_variants").insert({
        product_id: product.id,
        name: "Standard",
        price_cents: product.price_cents,
        stock: product.stock,
        sort_order: 0,
      });
      if (seedError) return toast.error(seedError.message);
    }

    const { error } = await supabase.from("product_variants").insert({
      product_id: product.id,
      name: "New variant",
      price_cents: product.price_cents,
      stock: 0,
      sort_order: isFirstVariant ? 1 : variants?.length ?? 0,
    });
    if (error) return toast.error(error.message);
    if (isFirstVariant) {
      toast.success("Added \"Standard\" (your existing price & stock) plus a new variant to edit");
    }
    refresh();
  }

  async function saveVariant(v: Variant) {
    const d = drafts[v.id];
    if (!d) return;
    const price_cents = Math.round(parseFloat(d.price || "0") * 100);
    const stock = parseInt(d.stock || "0", 10);
    if (!d.name || isNaN(price_cents)) return toast.error("Variant name and price required");
    const { error } = await supabase
      .from("product_variants")
      .update({ name: d.name, price_cents, stock, sku: d.sku || null })
      .eq("id", v.id);
    if (error) return toast.error(error.message);
    toast.success("Variant saved");
    refresh();
  }

  async function deleteVariant(v: Variant) {
    if (!confirm(`Delete variant "${v.name}"?`)) return;
    const { error } = await supabase.from("product_variants").delete().eq("id", v.id);
    if (error) return toast.error(error.message);
    refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <Label>Variants</Label>
        <Button size="sm" variant="outline" onClick={addVariant}>
          <Plus className="mr-1 h-3 w-3" /> Add variant
        </Button>
      </div>
      {(!variants || variants.length === 0) && (
        <p className="mt-2 text-xs text-muted-foreground">
          No variants — the product's own price & stock will be used.
        </p>
      )}
      <div className="mt-2 space-y-2">
        {(variants ?? []).map((v) => {
          const d = drafts[v.id] ?? { name: "", price: "", stock: "", sku: "" };
          return (
            <div key={v.id} className="rounded-lg border p-3">
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Variant name (e.g. 1.5 sq.mm)"
                  value={d.name}
                  onChange={(e) => setDrafts({ ...drafts, [v.id]: { ...d, name: e.target.value } })}
                  className="col-span-2"
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Price"
                  value={d.price}
                  onChange={(e) => setDrafts({ ...drafts, [v.id]: { ...d, price: e.target.value } })}
                />
                <Input
                  type="number"
                  placeholder="Stock"
                  value={d.stock}
                  onChange={(e) => setDrafts({ ...drafts, [v.id]: { ...d, stock: e.target.value } })}
                />
                <Input
                  placeholder="SKU (optional)"
                  value={d.sku}
                  onChange={(e) => setDrafts({ ...drafts, [v.id]: { ...d, sku: e.target.value } })}
                  className="col-span-2"
                />
              </div>
              <div className="mt-2 flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => deleteVariant(v)}>
                  <Trash2 className="mr-1 h-3 w-3" /> Delete
                </Button>
                <Button size="sm" onClick={() => saveVariant(v)}>Save</Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ImagesEditor({
  product,
  qc,
  invalidateStoreFront,
}: {
  product: Product;
  qc: ReturnType<typeof useQueryClient>;
  invalidateStoreFront: () => void;
}) {
  const [uploading, setUploading] = useState(false);

  const { data: images } = useQuery({
    queryKey: ["admin-images", product.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_images")
        .select("*")
        .eq("product_id", product.id)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  function refresh() {
    qc.invalidateQueries({ queryKey: ["admin-images", product.id] });
    invalidateStoreFront();
  }

  async function handleFiles(e: ChangeEvent<HTMLInputElement>) {
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
        sort_order: startCount + i,
      });
      if (insErr) toast.error(insErr.message);
    }
    setUploading(false);
    toast.success("Images uploaded");
    refresh();
  }

  async function setPrimary(img: ProductImage) {
    await supabase.from("product_images").update({ is_primary: false }).eq("product_id", product.id).neq("id", img.id);
    const { error } = await supabase.from("product_images").update({ is_primary: true }).eq("id", img.id);
    if (error) return toast.error(error.message);
    refresh();
  }

  async function deleteImage(img: ProductImage) {
    if (!confirm("Delete this image?")) return;
    const path = pathFromPublicUrl(img.url);
    if (path) await supabase.storage.from("product-images").remove([path]);
    const { error } = await supabase.from("product_images").delete().eq("id", img.id);
    if (error) return toast.error(error.message);
    if (img.is_primary) {
      const remaining = (images ?? []).filter((i) => i.id !== img.id);
      if (remaining.length > 0) {
        await supabase.from("product_images").update({ is_primary: true }).eq("id", remaining[0].id);
      }
    }
    refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <Label>Images</Label>
        <label>
          <input type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} disabled={uploading} />
          <span className="inline-flex cursor-pointer items-center rounded-md border px-3 py-1.5 text-sm hover:bg-secondary/50">
            {uploading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Upload className="mr-1 h-3 w-3" />}
            {uploading ? "Uploading…" : "Upload images"}
          </span>
        </label>
      </div>
      {(!images || images.length === 0) && (
        <p className="mt-2 text-xs text-muted-foreground">
          No images uploaded — the fallback image URL above will be used.
        </p>
      )}
      <div className="mt-2 grid grid-cols-3 gap-2">
        {(images ?? []).map((img) => (
          <div key={img.id} className="relative overflow-hidden rounded-lg border">
            <img src={img.url} alt="" className="aspect-square w-full object-cover" />
            {img.is_primary && (
              <div className="absolute left-1 top-1 rounded bg-foreground/90 px-1.5 py-0.5 text-[10px] font-medium text-background">
                Primary
              </div>
            )}
            <div className="flex divide-x border-t bg-background">
              <button
                type="button"
                disabled={img.is_primary}
                onClick={() => setPrimary(img)}
                className="flex-1 py-1 text-[11px] disabled:text-muted-foreground hover:bg-secondary/50"
              >
                <Star className="mx-auto h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => deleteImage(img)}
                className="flex-1 py-1 text-[11px] hover:bg-secondary/50"
              >
                <Trash2 className="mx-auto h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SpecificationsEditor({
  specs,
  onChange,
}: {
  specs: { key: string; value: string }[];
  onChange: (specs: { key: string; value: string }[]) => void;
}) {
  function update(i: number, field: "key" | "value", val: string) {
    const next = specs.map((s, idx) => (idx === i ? { ...s, [field]: val } : s));
    onChange(next);
  }
  function add() {
    onChange([...specs, { key: "", value: "" }]);
  }
  function remove(i: number) {
    onChange(specs.filter((_, idx) => idx !== i));
  }

  function handleSmartImport(imported: ParsedSpec[]) {
    // Merge on key (case-insensitive): update the value if the spec already
    // exists, otherwise append it as a new row.
    const next = [...specs];
    for (const { key, value } of imported) {
      const existingIndex = next.findIndex((s) => s.key.trim().toLowerCase() === key.trim().toLowerCase());
      if (existingIndex >= 0) {
        next[existingIndex] = { key: next[existingIndex].key, value };
      } else {
        next.push({ key, value });
      }
    }
    onChange(next);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <Label>Specifications</Label>
        <div className="flex gap-2">
          <SmartSpecImporter onImport={handleSmartImport} />
          <Button type="button" size="sm" variant="outline" onClick={add}>
            <Plus className="mr-1 h-3 w-3" /> Add row
          </Button>
        </div>
      </div>
      {specs.length === 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          e.g. Voltage — 220V, Material — Copper, Wattage — 60W. Or paste a spec sheet with{" "}
          <span className="font-medium text-foreground">Smart import</span> above.
        </p>
      )}
      <div className="mt-2 space-y-2">
        {specs.map((s, i) => (
          <div key={i} className="flex gap-2">
            <Input
              placeholder="Spec name (e.g. Voltage)"
              value={s.key}
              onChange={(e) => update(i, "key", e.target.value)}
              className="flex-1"
            />
            <Input
              placeholder="Value (e.g. 220V)"
              value={s.value}
              onChange={(e) => update(i, "value", e.target.value)}
              className="flex-1"
            />
            <Button type="button" size="icon" variant="ghost" className="flex-shrink-0" onClick={() => remove(i)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

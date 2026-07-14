import { createFileRoute } from "@tanstack/react-router";
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

type Product = Database["public"]["Tables"]["products"]["Row"];
type Variant = Database["public"]["Tables"]["product_variants"]["Row"];
type ProductImage = Database["public"]["Tables"]["product_images"]["Row"];

export const Route = createFileRoute("/admin/products")({ component: AdminProducts });

const empty = {
  name: "",
  slug: "",
  description: "",
  category: "",
  brand: "",
  price: "",
  stock: "0",
  image_url: "",
  active: true,
  featured: false,
};

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
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

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
      category: p.category ?? "",
      brand: p.brand ?? "",
      price: (p.price_cents / 100).toString(),
      stock: p.stock.toString(),
      image_url: p.image_url ?? "",
      active: p.active,
      featured: p.featured,
    });
    setOpen(true);
  }

  async function save() {
    const price_cents = Math.round(parseFloat(form.price || "0") * 100);
    const stock = parseInt(form.stock || "0", 10);
    if (!form.name || isNaN(price_cents)) return toast.error("Name and price required");
    setSaving(true);
    const payload = {
      name: form.name,
      slug: form.slug || slugify(form.name),
      description: form.description || null,
      category: form.category || null,
      brand: form.brand || null,
      price_cents,
      stock,
      image_url: form.image_url || null,
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" /> Add product
        </Button>
      </div>

      <div className="rounded-xl border">
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
                        /{p.slug}{p.category ? ` · ${p.category}` : ""}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{formatMoney(p.price_cents, p.currency)}</TableCell>
                <TableCell>
                  <span className={p.stock <= 3 ? "text-amber-600" : ""}>{p.stock}</span>
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Input value={form.category} placeholder="e.g. Cables" onChange={(e) => setForm({ ...form, category: e.target.value })} />
              </div>
              <div>
                <Label>Brand</Label>
                <Input value={form.brand} placeholder="e.g. Acme" onChange={(e) => setForm({ ...form, brand: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Price (INR)</Label>
                <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div>
                <Label>Stock</Label>
                <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
              </div>
            </div>
            <p className="-mt-2 text-xs text-muted-foreground">
              Price & stock above are used only if this product has no variants (see below).
            </p>
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
    const { error } = await supabase.from("product_variants").insert({
      product_id: product.id,
      name: "New variant",
      price_cents: product.price_cents,
      stock: 0,
      sort_order: variants?.length ?? 0,
    });
    if (error) return toast.error(error.message);
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

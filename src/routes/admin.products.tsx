import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ChangeEvent } from "react";
import { Plus, Pencil, Trash2, Star, Upload, Loader2, Copy, Layers, ChevronUp, ChevronDown } from "lucide-react";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { Drawer, DrawerContent, DrawerHeader, DrawerFooter, DrawerTitle } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { formatMoney } from "@/stores/cart";
import { TaxonomySelect } from "@/components/TaxonomySelect";
import { SmartSpecImporter } from "@/components/SmartSpecImporter";
import type { ParsedSpec } from "@/lib/parseSmartSpecifications";
import { applyTier, describeTierDiscount, tierRangeLabel, type BulkPricingTier } from "@/lib/bulkPricing";

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
  stock_unlimited: false,
  show_stock_count: true,
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

// Finds a free "<base>-copy", "<base>-copy-2", "<base>-copy-3"... slug in one
// round trip, since slugs are unique and duplicating the same product twice
// would otherwise collide.
async function getUniqueCopySlug(baseSlug: string): Promise<string> {
  const { data } = await supabase.from("products").select("slug").ilike("slug", `${baseSlug}-copy%`);
  const existing = new Set((data ?? []).map((d) => d.slug));
  if (!existing.has(`${baseSlug}-copy`)) return `${baseSlug}-copy`;
  let n = 2;
  while (existing.has(`${baseSlug}-copy-${n}`)) n++;
  return `${baseSlug}-copy-${n}`;
}

function pathFromPublicUrl(url: string) {
  const marker = "/object/public/product-images/";
  const idx = url.indexOf(marker);
  return idx >= 0 ? url.slice(idx + marker.length) : null;
}

const MAX_IMAGE_MB = 10;
const MAX_IMAGE_BYTES = MAX_IMAGE_MB * 1024 * 1024;
// Raster types the browser can safely decode via <img>/canvas and that
// standardizeProductImage can re-encode to JPEG. Deliberately excludes
// image/svg+xml — an SVG is XML, not pixels, and some contexts (direct
// navigation to the storage URL, an <object>/<iframe> embed) will run
// any script it contains rather than just display it.
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
// A file below this doesn't mean it's genuinely that size — this is a
// decompression-bomb guard, not a dimension check. Something claiming to
// be, say, a 40000x40000 PNG can be a tiny file on disk yet blow up to
// gigabytes of raw pixels the moment a <canvas> decodes it, hanging or
// crashing the admin's own browser tab during upload.
const MAX_IMAGE_SIDE_PX = 8000;

// Shared by the product-level and per-variant uploaders so a stray huge
// file or an accidental non-image can't hang image processing or get
// uploaded with the wrong content type.
function validateImageFiles(files: File[]): string | null {
  for (const f of files) {
    if (!ALLOWED_IMAGE_TYPES.has(f.type)) return `"${f.name}" isn't a supported image type (JPEG, PNG, WebP, or GIF).`;
    if (f.size > MAX_IMAGE_BYTES) return `"${f.name}" is over ${MAX_IMAGE_MB}MB.`;
  }
  return null;
}

function AdminProducts() {
  const qc = useQueryClient();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  const { data: products } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_images(url, is_primary, variant_id), product_variants(price_cents, stock, stock_unlimited), categories(name), brands(name), bulk_pricing_tiers(min_qty)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Same precedence the storefront's ProductCard uses: the shared gallery's
  // primary (or first) photo, then a variant's own photo, then the legacy
  // "Fallback image URL" field. The list query only pulled `image_url`
  // before, so every product with photos uploaded through the Photos tab
  // (the normal way now) rendered no thumbnail at all here, even though
  // customers see one fine on the storefront.
  function adminThumbnail(p: Product & { product_images?: { url: string; is_primary: boolean; variant_id?: string | null }[] }) {
    const allImages = p.product_images ?? [];
    const sharedImages = allImages.filter((i) => !i.variant_id);
    const variantImages = allImages.filter((i) => i.variant_id);
    return sharedImages.find((i) => i.is_primary)?.url
      ?? sharedImages[0]?.url
      ?? variantImages.find((i) => i.is_primary)?.url
      ?? variantImages[0]?.url
      ?? p.image_url
      ?? null;
  }

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

  type ProductWithVariants = Product & { product_variants?: { price_cents: number; stock: number; stock_unlimited: boolean }[] };

  // `compact` drops the " in stock" suffix for the table column, which
  // already has a "Stock" header — the mobile card list keeps the
  // suffix since it's shown inline next to the price with no header.
  function stockLabel(p: ProductWithVariants, compact = false) {
    const variants = p.product_variants ?? [];
    const suffix = compact ? "" : " in stock";
    if (variants.length === 0) {
      return p.stock_unlimited ? "Unlimited" : `${p.stock}${suffix}`;
    }
    if (variants.every((v) => v.stock_unlimited)) return "Unlimited";
    const limited = variants.filter((v) => !v.stock_unlimited);
    const sum = limited.reduce((s, v) => s + v.stock, 0);
    // Some (but not all) variants are unlimited — the number is a floor,
    // not the whole picture, so flag that with a "+".
    const plus = limited.length < variants.length ? "+" : "";
    return `${sum}${plus}${suffix}`;
  }

  function isLowStock(p: ProductWithVariants) {
    const variants = p.product_variants ?? [];
    if (variants.length === 0) return !p.stock_unlimited && p.stock <= 3;
    if (variants.every((v) => v.stock_unlimited)) return false;
    const limited = variants.filter((v) => !v.stock_unlimited);
    return limited.reduce((s, v) => s + v.stock, 0) <= 3;
  }

  function invalidateStoreFront() {
    qc.invalidateQueries({ queryKey: ["admin-products"] });
    qc.invalidateQueries({ queryKey: ["products", "public"] });
    qc.invalidateQueries({ queryKey: ["product"] });
  }

  function hasBulkPricing(p: Product & { bulk_pricing_tiers?: { min_qty: number }[] }) {
    return (p.bulk_pricing_tiers?.length ?? 0) > 0;
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
      stock_unlimited: p.stock_unlimited,
      show_stock_count: p.show_stock_count,
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
      stock_unlimited: form.stock_unlimited,
      show_stock_count: form.show_stock_count,
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

  async function duplicate(p: Product) {
    setDuplicatingId(p.id);
    try {
      const newSlug = await getUniqueCopySlug(p.slug);

      const { data: newProduct, error: prodErr } = await supabase
        .from("products")
        .insert({
          name: `Copy of ${p.name}`,
          slug: newSlug,
          description: p.description,
          category_id: p.category_id,
          brand_id: p.brand_id,
          price_cents: p.price_cents,
          mrp_cents: p.mrp_cents,
          currency: p.currency,
          sku: p.sku,
          stock: p.stock,
          stock_unlimited: p.stock_unlimited,
          show_stock_count: p.show_stock_count,
          image_url: p.image_url,
          warranty: p.warranty,
          warranty_available: p.warranty_available,
          warranty_type: p.warranty_type,
          warranty_duration: p.warranty_duration,
          warranty_provider: p.warranty_provider,
          warranty_service_method: p.warranty_service_method,
          warranty_notes: p.warranty_notes,
          specifications: p.specifications,
          // Starts hidden so the copy can't go live on the storefront
          // before it's been reviewed/renamed — flip "Active" once ready.
          active: false,
          featured: false,
        })
        .select()
        .single();
      if (prodErr || !newProduct) {
        toast.error(prodErr?.message ?? "Couldn't duplicate product");
        return;
      }

      const [{ data: variants }, { data: images }, { data: bulkTiers }] = await Promise.all([
        supabase.from("product_variants").select("*").eq("product_id", p.id).order("sort_order", { ascending: true }),
        supabase.from("product_images").select("*").eq("product_id", p.id).order("sort_order", { ascending: true }),
        supabase.from("bulk_pricing_tiers").select("*").eq("product_id", p.id),
      ]);

      // Insert variants one at a time (rather than a single bulk insert) so
      // each new id can be captured and mapped back to its source variant —
      // that mapping is what lets the image-copy step below point each
      // variant-specific image at the right *new* variant.
      const variantIdMap = new Map<string, string>();
      for (const v of variants ?? []) {
        const { data: newVariant, error: vErr } = await supabase
          .from("product_variants")
          .insert({
            product_id: newProduct.id,
            name: v.name,
            price_cents: v.price_cents,
            mrp_cents: v.mrp_cents,
            stock: v.stock,
            sku: v.sku,
            specifications: v.specifications,
            sort_order: v.sort_order,
          })
          .select()
          .single();
        if (vErr || !newVariant) {
          toast.error(`Variant "${v.name}" failed to copy: ${vErr?.message ?? "unknown error"}`);
          continue;
        }
        variantIdMap.set(v.id, newVariant.id);
      }

      if (images && images.length > 0) {
        // Reuses the same storage URL rather than re-uploading the file —
        // the image itself doesn't change, so both products can safely
        // point at the same object in the product-images bucket.
        const imageRows = images.map((img) => ({
          product_id: newProduct.id,
          variant_id: img.variant_id ? variantIdMap.get(img.variant_id) ?? null : null,
          url: img.url,
          is_primary: img.is_primary,
          sort_order: img.sort_order,
        }));
        const { error: imgErr } = await supabase.from("product_images").insert(imageRows);
        if (imgErr) toast.error(`Images failed to copy: ${imgErr.message}`);
      }

      if (bulkTiers && bulkTiers.length > 0) {
        const tierRows = bulkTiers
          // Drop any variant-scoped tier whose source variant failed to
          // copy above — it has nowhere valid to attach, and silently
          // reattaching it to the whole product would be wrong.
          .filter((t) => !t.variant_id || variantIdMap.has(t.variant_id))
          .map((t) => ({
            product_id: newProduct.id,
            variant_id: t.variant_id ? variantIdMap.get(t.variant_id)! : null,
            min_qty: t.min_qty,
            discount_type: t.discount_type,
            discount_value: t.discount_value,
            active: t.active,
          }));
        if (tierRows.length > 0) {
          const { error: tierErr } = await supabase.from("bulk_pricing_tiers").insert(tierRows);
          if (tierErr) toast.error(`Bulk pricing tiers failed to copy: ${tierErr.message}`);
        }
      }

      toast.success("Product duplicated — review and save");
      invalidateStoreFront();
      openEdit(newProduct);
    } finally {
      setDuplicatingId(null);
    }
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
        {(products ?? []).map((p) => {
          const thumb = adminThumbnail(p);
          return (
          <div key={p.id} className="rounded-xl border p-4">
            <div className="flex items-start gap-3">
              <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-secondary/60">
                {thumb ? (
                  <img src={thumb} alt="" className="h-full w-full object-contain" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[9px] font-medium text-muted-foreground">No image</div>
                )}
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
                  <span className={isLowStock(p) ? "text-amber-600" : "text-muted-foreground"}>
                    {stockLabel(p)}
                    {(p.product_variants?.length ?? 0) > 0 && ` (${p.product_variants!.length} variants)`}
                  </span>
                  {hasBulkPricing(p) && (
                    <Badge variant="secondary" className="gap-1 font-normal">
                      <Layers className="h-3 w-3" /> Bulk pricing
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between border-t pt-3">
              <div className="flex items-center gap-2">
                <Switch checked={p.active} onCheckedChange={() => toggleActive(p)} />
                <span className="text-xs text-muted-foreground">{p.active ? "Active" : "Hidden"}</span>
              </div>
              <div className="flex gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9"
                  disabled={duplicatingId === p.id}
                  onClick={() => duplicate(p)}
                >
                  {duplicatingId === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                </Button>
                <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => openEdit(p)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => del(p)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          );
        })}
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
            {(products ?? []).map((p) => {
              const thumb = adminThumbnail(p);
              return (
              <TableRow key={p.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 overflow-hidden rounded bg-secondary/60">
                      {thumb ? (
                        <img src={thumb} alt="" className="h-full w-full object-contain" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[8px] font-medium text-muted-foreground">No image</div>
                      )}
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
                <TableCell>
                  {priceDisplay(p)}
                  {hasBulkPricing(p) && (
                    <Badge variant="secondary" className="ml-2 gap-1 font-normal">
                      <Layers className="h-3 w-3" /> Bulk
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <span className={isLowStock(p) ? "text-amber-600" : ""}>{stockLabel(p, true)}</span>
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
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={duplicatingId === p.id}
                    onClick={() => duplicate(p)}
                    title="Duplicate"
                  >
                    {duplicatingId === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => openEdit(p)} title="Edit">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => del(p)} title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
              );
            })}
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

      {(() => {
        const formBody = (
          <Tabs defaultValue="details" className="w-full">
            <div className="sticky top-0 z-10 -mx-1 overflow-x-auto bg-background px-1 pb-2">
              <TabsList className="h-10 w-max">
                <TabsTrigger value="details" className="px-4 py-2">Details</TabsTrigger>
                <TabsTrigger value="warranty" className="px-4 py-2">Warranty</TabsTrigger>
                <TabsTrigger value="specs" className="px-4 py-2">Specs</TabsTrigger>
                <TabsTrigger value="variants" className="px-4 py-2">Variants</TabsTrigger>
                <TabsTrigger value="images" className="px-4 py-2">Photos</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="details" className="space-y-4">
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
                <Input type="number" inputMode="decimal" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div>
                <Label>Stock</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={form.stock}
                  disabled={form.stock_unlimited}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                />
                <div className="mt-1.5 flex items-center gap-2">
                  <Switch
                    checked={form.stock_unlimited}
                    onCheckedChange={(v) => setForm({ ...form, stock_unlimited: v })}
                  />
                  <Label className="text-xs font-normal text-muted-foreground">Unlimited stock (never shows sold out)</Label>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label>MRP (INR)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
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
              Price, MRP, stock & SKU above are used only if this product has no variants — see the Variants tab.
            </p>
            <div className="rounded-xl border border-border p-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.show_stock_count}
                  onCheckedChange={(v) => setForm({ ...form, show_stock_count: v })}
                />
                <Label>Show stock count to customers</Label>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {form.show_stock_count
                  ? 'On — the product page shows the exact number left, e.g. "7 in stock."'
                  : "Off — customers just see In stock / Sold out, no number. Applies across all variants."}
              </p>
            </div>
            <div>
              <Label>Fallback image URL</Label>
              <Input value={form.image_url} placeholder="https://…" onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
              <p className="mt-1 text-xs text-muted-foreground">Used only if no images are uploaded in the Photos tab.</p>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
              <Label>Active (visible in store)</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.featured} onCheckedChange={(v) => setForm({ ...form, featured: v })} />
              <Label>Featured</Label>
            </div>
            </TabsContent>

            <TabsContent value="warranty" className="space-y-4">
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
            </TabsContent>

            <TabsContent value="specs" className="space-y-4">
            <SpecificationsEditor
              specs={form.specifications}
              onChange={(specs) => setForm({ ...form, specifications: specs })}
            />
            <p className="text-xs text-muted-foreground">
              These are the product's own specs. If this product has variants, each variant can override just the specs that differ — set those from the Variants tab.
            </p>
            </TabsContent>

            <TabsContent value="variants" className="space-y-4">
              {editing ? (
                <VariantsEditor product={editing} qc={qc} invalidateStoreFront={invalidateStoreFront} />
              ) : (
                <p className="rounded-lg bg-secondary/50 p-3 text-sm text-muted-foreground">
                  Save the product first, then variants can be added here.
                </p>
              )}
            </TabsContent>

            <TabsContent value="images" className="space-y-4">
              {editing ? (
                <ImagesEditor product={editing} qc={qc} invalidateStoreFront={invalidateStoreFront} />
              ) : (
                <p className="rounded-lg bg-secondary/50 p-3 text-sm text-muted-foreground">
                  Save the product first, then photos can be added here.
                </p>
              )}
            </TabsContent>
          </Tabs>
        );
        return isMobile ? (
          <Drawer open={open} onOpenChange={setOpen}>
            <DrawerContent className="flex max-h-[92vh] flex-col">
              <DrawerHeader className="border-b text-left">
                <DrawerTitle>{editing ? "Edit product" : "Add product"}</DrawerTitle>
              </DrawerHeader>
              <div className="flex-1 overflow-y-auto px-4 py-4">{formBody}</div>
              <DrawerFooter className="flex-row justify-end gap-2 border-t">
                <Button variant="ghost" onClick={() => setOpen(false)}>Close</Button>
                <Button onClick={save} disabled={saving}>Save details</Button>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        ) : (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
              <DialogHeader className="border-b px-6 py-4">
                <DialogTitle>{editing ? "Edit product" : "Add product"}</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto px-6 py-4">{formBody}</div>
              <DialogFooter className="border-t px-6 py-4">
                <Button variant="ghost" onClick={() => setOpen(false)}>Close</Button>
                <Button onClick={save} disabled={saving}>Save details</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        );
      })()}
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

  const [drafts, setDrafts] = useState<Record<string, { name: string; price: string; mrp: string; stock: string; stock_unlimited: boolean; sku: string; specifications: { key: string; value: string }[] }>>({});
  // Which variant's card is expanded — only one at a time, so editing a
  // product with several variants doesn't turn into one huge scroll of
  // fields all shown at once.
  const [openId, setOpenId] = useState<string | undefined>(undefined);
  // Which variant is mid-reorder — disables both arrows on it briefly so a
  // fast double-tap can't fire two overlapping swaps.
  const [reorderingId, setReorderingId] = useState<string | null>(null);

  useEffect(() => {
    if (!variants) return;
    const next: typeof drafts = {};
    for (const v of variants) {
      next[v.id] = {
        name: v.name,
        price: (v.price_cents / 100).toString(),
        mrp: v.mrp_cents ? (v.mrp_cents / 100).toString() : "",
        stock: v.stock.toString(),
        stock_unlimited: v.stock_unlimited,
        sku: v.sku ?? "",
        specifications: Array.isArray(v.specifications) ? (v.specifications as { key: string; value: string }[]) : [],
      };
    }
    setDrafts(next);
  }, [variants]);

  function refresh() {
    qc.invalidateQueries({ queryKey: ["admin-variants", product.id] });
    // Prefix match — also catches every ["admin-bulk-tiers", product.id, *]
    // entry, since deleting/adding a variant can change which bulk-tier
    // ladder is even in scope (see the "Standard" migration above).
    qc.invalidateQueries({ queryKey: ["admin-bulk-tiers", product.id] });
    invalidateStoreFront();
  }

  async function addVariant() {
    const isFirstVariant = (variants?.length ?? 0) === 0;

    if (isFirstVariant) {
      // Adding the first variant switches the product to variant-based
      // pricing entirely, which would otherwise hide the price/stock the
      // admin already set on the product itself. Carry that over as a
      // "Standard" option instead of losing it.
      const { data: seeded, error: seedError } = await supabase
        .from("product_variants")
        .insert({
          product_id: product.id,
          name: "Standard",
          price_cents: product.price_cents,
          mrp_cents: product.mrp_cents,
          stock: product.stock,
          stock_unlimited: product.stock_unlimited,
          specifications: product.specifications,
          sort_order: 0,
        })
        .select("id")
        .single();
      if (seedError) return toast.error(seedError.message);

      // Same reasoning for bulk pricing: once this product has variants,
      // resolve_bulk_unit_price_cents() only matches a line's own variant
      // — any product-level tiers (variant_id NULL) would otherwise stop
      // applying to every order from this point on. Move them onto the
      // new "Standard" variant instead of leaving them stranded.
      const { data: productTiers } = await supabase
        .from("bulk_pricing_tiers")
        .select("*")
        .eq("product_id", product.id)
        .is("variant_id", null);
      if (productTiers && productTiers.length > 0 && seeded) {
        const { error: moveErr } = await supabase
          .from("bulk_pricing_tiers")
          .update({ variant_id: seeded.id })
          .eq("product_id", product.id)
          .is("variant_id", null);
        if (moveErr) toast.error(`Bulk pricing tiers couldn't be moved to "Standard": ${moveErr.message}`);
        else toast.success(`Moved ${productTiers.length} bulk pricing tier${productTiers.length > 1 ? "s" : ""} onto "Standard"`);
      }
    }

    const { data: newVariant, error } = await supabase
      .from("product_variants")
      .insert({
        product_id: product.id,
        name: "New variant",
        price_cents: product.price_cents,
        stock: 0,
        sort_order: isFirstVariant ? 1 : variants?.length ?? 0,
      })
      .select("id")
      .single();
    if (error) return toast.error(error.message);
    if (isFirstVariant) {
      toast.success("Added \"Standard\" (your existing price & stock) plus a new variant to edit");
    }
    if (newVariant) setOpenId(newVariant.id);
    refresh();
  }

  async function saveVariant(v: Variant) {
    const d = drafts[v.id];
    if (!d) return;
    const price_cents = Math.round(parseFloat(d.price || "0") * 100);
    const stock = parseInt(d.stock || "0", 10);
    if (!d.name || isNaN(price_cents)) return toast.error("Variant name and price required");

    let mrp_cents: number | null = null;
    if (d.mrp.trim()) {
      mrp_cents = Math.round(parseFloat(d.mrp) * 100);
      if (isNaN(mrp_cents)) return toast.error("Variant MRP must be a number");
      if (mrp_cents < price_cents) return toast.error("Variant MRP can't be lower than the price");
    }

    const cleanSpecs = d.specifications.filter((s) => s.key.trim() || s.value.trim());

    const { error } = await supabase
      .from("product_variants")
      .update({ name: d.name, price_cents, mrp_cents, stock, stock_unlimited: d.stock_unlimited, sku: d.sku || null, specifications: cleanSpecs })
      .eq("id", v.id);
    if (error) return toast.error(error.message);
    toast.success("Variant saved");
    refresh();
  }

  async function deleteVariant(v: Variant) {
    if (!confirm(`Delete variant "${v.name}"? This also removes any images added just for it.`)) return;
    // Cascade takes care of the product_images rows themselves, but not the
    // underlying storage files — Postgres can't reach into Supabase Storage,
    // so clean those up here first.
    const { data: imgs } = await supabase.from("product_images").select("url").eq("variant_id", v.id);
    const paths = (imgs ?? []).map((i) => pathFromPublicUrl(i.url)).filter((p): p is string => !!p);
    if (paths.length > 0) await supabase.storage.from("product-images").remove(paths);
    const { error } = await supabase.from("product_variants").delete().eq("id", v.id);
    if (error) return toast.error(error.message);
    refresh();
  }

  async function moveVariant(v: Variant, direction: -1 | 1) {
    if (!variants) return;
    const idx = variants.findIndex((x) => x.id === v.id);
    const swapIdx = idx + direction;
    if (idx === -1 || swapIdx < 0 || swapIdx >= variants.length) return;

    const reordered = [...variants];
    [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];

    setReorderingId(v.id);
    // Re-number everyone sequentially from the new order, rather than just
    // swapping the two touched rows' sort_order values — this self-heals
    // any duplicate/gapped sort_order left over from older data instead of
    // assuming the existing values were already clean.
    for (let i = 0; i < reordered.length; i++) {
      if (reordered[i].sort_order === i) continue;
      const { error } = await supabase.from("product_variants").update({ sort_order: i }).eq("id", reordered[i].id);
      if (error) {
        toast.error(error.message);
        break;
      }
    }
    setReorderingId(null);
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
        <>
          <p className="mt-2 text-xs text-muted-foreground">
            No variants — the product's own price & stock will be used.
          </p>
          <div className="mt-3">
            <BulkPricingEditor
              product={product}
              variantId={null}
              basePriceCents={product.price_cents}
              currency={product.currency}
              qc={qc}
              invalidateStoreFront={invalidateStoreFront}
            />
          </div>
        </>
      )}
      {variants && variants.length > 0 && (
        <Accordion
          type="single"
          collapsible
          value={openId}
          onValueChange={(v) => setOpenId(v || undefined)}
          className="mt-2"
        >
          {variants.map((v, idx) => {
            const d = drafts[v.id] ?? { name: "", price: "", mrp: "", stock: "", stock_unlimited: false, sku: "", specifications: [] };
            const priceLabel = d.price ? formatMoney(Math.round(parseFloat(d.price) * 100 || 0), product.currency) : "—";
            const stockText = d.stock_unlimited ? "Unlimited" : `${d.stock || 0} in stock`;
            const isReordering = reorderingId !== null;
            return (
              <AccordionItem key={v.id} value={v.id} className="mb-2 rounded-lg border">
                <AccordionPrimitive.Header className="flex items-stretch">
                  <div className="flex flex-shrink-0 flex-col justify-center gap-0.5 border-r px-1.5 py-1">
                    <button
                      type="button"
                      disabled={idx === 0 || isReordering}
                      onClick={(e) => {
                        e.stopPropagation();
                        moveVariant(v, -1);
                      }}
                      className="flex h-6 w-7 items-center justify-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-25 disabled:hover:bg-transparent"
                      aria-label={`Move ${v.name || "variant"} up`}
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === variants.length - 1 || isReordering}
                      onClick={(e) => {
                        e.stopPropagation();
                        moveVariant(v, 1);
                      }}
                      className="flex h-6 w-7 items-center justify-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-25 disabled:hover:bg-transparent"
                      aria-label={`Move ${v.name || "variant"} down`}
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <AccordionPrimitive.Trigger className="flex flex-1 cursor-pointer items-center justify-between gap-2 px-3 py-3 text-left text-sm font-medium transition-all hover:no-underline [&[data-state=open]>svg]:rotate-180">
                    <div className="flex min-w-0 flex-1 items-center justify-between gap-2 pr-1">
                      <span className="min-w-0 truncate font-medium">{d.name || "Untitled variant"}</span>
                      <span className="flex-shrink-0 text-xs text-muted-foreground">
                        {priceLabel} · {stockText}
                      </span>
                    </div>
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
                  </AccordionPrimitive.Trigger>
                </AccordionPrimitive.Header>
                <AccordionContent>
                  <div className="space-y-4 px-3 pb-1">
                    <div>
                      <Label className="text-xs font-semibold text-muted-foreground">Name & pricing</Label>
                      <div className="mt-1.5 grid grid-cols-2 gap-x-2 gap-y-3">
                        <div className="col-span-2">
                          <Label className="text-xs font-normal text-muted-foreground">Variant name</Label>
                          <Input
                            placeholder="e.g. 1.5 sq.mm"
                            value={d.name}
                            onChange={(e) => setDrafts({ ...drafts, [v.id]: { ...d, name: e.target.value } })}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-normal text-muted-foreground">Price</Label>
                          <Input
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            placeholder="0.00"
                            value={d.price}
                            onChange={(e) => setDrafts({ ...drafts, [v.id]: { ...d, price: e.target.value } })}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-normal text-muted-foreground">MRP (optional)</Label>
                          <Input
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            placeholder="0.00"
                            value={d.mrp}
                            onChange={(e) => setDrafts({ ...drafts, [v.id]: { ...d, mrp: e.target.value } })}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-normal text-muted-foreground">Stock</Label>
                          <Input
                            type="number"
                            inputMode="numeric"
                            placeholder="0"
                            value={d.stock}
                            disabled={d.stock_unlimited}
                            onChange={(e) => setDrafts({ ...drafts, [v.id]: { ...d, stock: e.target.value } })}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-normal text-muted-foreground">SKU (optional)</Label>
                          <Input
                            placeholder="Optional"
                            value={d.sku}
                            onChange={(e) => setDrafts({ ...drafts, [v.id]: { ...d, sku: e.target.value } })}
                            className="mt-1"
                          />
                        </div>
                        <div className="col-span-2 flex items-center gap-2 pt-1">
                          <Switch
                            checked={d.stock_unlimited}
                            onCheckedChange={(checked) => setDrafts({ ...drafts, [v.id]: { ...d, stock_unlimited: checked } })}
                          />
                          <Label className="text-xs font-normal text-muted-foreground">Unlimited stock (never shows sold out)</Label>
                        </div>
                      </div>
                    </div>

                    <VariantImagesEditor
                      productId={product.id}
                      variantId={v.id}
                      qc={qc}
                      invalidateStoreFront={invalidateStoreFront}
                    />

                    <div className="rounded-md bg-secondary/30 p-2">
                      <p className="text-xs font-medium text-muted-foreground">Specifications</p>
                      <SpecificationsEditor
                        specs={d.specifications}
                        onChange={(specs) => setDrafts({ ...drafts, [v.id]: { ...d, specifications: specs } })}
                      />
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Only for specs that differ from the product's own — anything not listed here still shows the product's value.
                      </p>
                    </div>

                    <BulkPricingEditor
                      product={product}
                      variantId={v.id}
                      basePriceCents={v.price_cents}
                      currency={product.currency}
                      qc={qc}
                      invalidateStoreFront={invalidateStoreFront}
                      compact
                    />

                    <div className="flex justify-end gap-2 border-t pt-3">
                      <Button size="sm" variant="ghost" onClick={() => deleteVariant(v)}>
                        <Trash2 className="mr-1 h-3 w-3" /> Delete
                      </Button>
                      <Button size="sm" onClick={() => saveVariant(v)}>Save</Button>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
}

type BulkTierDraft = { min_qty: string; discount_type: BulkDiscountType; discount_value: string; active: boolean };
type BulkDiscountType = Database["public"]["Enums"]["bulk_discount_type"];

// "Buy more, save more" tiers, scoped to one pricing entity at a time:
// either a single variant (variantId set — each variant manages its own
// ladder, since variants on one product can sit at very different price
// points) or the product itself (variantId null, only meaningful while the
// product has no variants). See the resolve_bulk_unit_price_cents comment
// in the migration for how the server keeps this scoping airtight.
function BulkPricingEditor({
  product,
  variantId,
  basePriceCents,
  currency,
  qc,
  invalidateStoreFront,
  compact,
}: {
  product: Product;
  variantId: string | null;
  basePriceCents: number;
  currency: string;
  qc: ReturnType<typeof useQueryClient>;
  invalidateStoreFront: () => void;
  compact?: boolean;
}) {
  const queryKey = ["admin-bulk-tiers", product.id, variantId ?? "base"];
  const { data: tiers } = useQuery({
    queryKey,
    queryFn: async () => {
      let q = supabase.from("bulk_pricing_tiers").select("*").eq("product_id", product.id);
      q = variantId ? q.eq("variant_id", variantId) : q.is("variant_id", null);
      const { data, error } = await q.order("min_qty", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Collapsed by default when nested in a variant card (compact) unless it
  // already has tiers set, so a product with many variants doesn't turn
  // into a wall of empty forms — but never collapsed for the product-level
  // editor, which already lives behind its own dialog section.
  const [open, setOpen] = useState(!compact);
  useEffect(() => {
    if (compact && tiers && tiers.length > 0) setOpen(true);
  }, [compact, tiers]);

  const [drafts, setDrafts] = useState<Record<string, BulkTierDraft>>({});

  useEffect(() => {
    if (!tiers) return;
    const next: typeof drafts = {};
    for (const t of tiers) {
      next[t.id] = {
        min_qty: t.min_qty.toString(),
        discount_type: t.discount_type,
        discount_value: t.discount_type === "percentage" ? t.discount_value.toString() : (t.discount_value / 100).toString(),
        active: t.active,
      };
    }
    setDrafts(next);
  }, [tiers]);

  function refresh() {
    qc.invalidateQueries({ queryKey });
    invalidateStoreFront();
  }

  async function addTier() {
    // Guess a sensible next threshold rather than leaving it at 0 — each
    // step roughly doubles off the last tier, starting at 5.
    const last = tiers && tiers.length > 0 ? tiers[tiers.length - 1].min_qty : Math.max(2, 2);
    const nextMinQty = tiers && tiers.length > 0 ? last * 2 : 5;
    const { error } = await supabase.from("bulk_pricing_tiers").insert({
      product_id: product.id,
      variant_id: variantId,
      min_qty: nextMinQty,
      discount_type: "percentage",
      discount_value: 5,
      active: true,
    });
    if (error) return toast.error(error.message);
    setOpen(true);
    refresh();
  }

  function draftToValue(d: BulkTierDraft): { min_qty: number; discount_value: number } | null {
    const min_qty = parseInt(d.min_qty || "0", 10);
    if (!Number.isFinite(min_qty) || min_qty < 2) {
      toast.error("Minimum quantity must be 2 or more");
      return null;
    }
    if (d.discount_type === "percentage") {
      const pct = parseInt(d.discount_value || "0", 10);
      if (!Number.isFinite(pct) || pct < 1 || pct > 100) {
        toast.error("Percentage off must be between 1 and 100");
        return null;
      }
      return { min_qty, discount_value: pct };
    }
    const rupees = parseFloat(d.discount_value || "0");
    if (!Number.isFinite(rupees) || rupees < 0) {
      toast.error(d.discount_type === "flat_amount" ? "Amount off must be a number" : "Fixed price must be a number");
      return null;
    }
    return { min_qty, discount_value: Math.round(rupees * 100) };
  }

  async function saveTier(id: string) {
    const d = drafts[id];
    if (!d) return;
    const parsed = draftToValue(d);
    if (!parsed) return;

    const duplicateMinQty = (tiers ?? []).some((t) => t.id !== id && t.min_qty === parsed.min_qty);
    if (duplicateMinQty) return toast.error(`Another tier already starts at ${parsed.min_qty} units`);

    const { error } = await supabase
      .from("bulk_pricing_tiers")
      .update({
        min_qty: parsed.min_qty,
        discount_type: d.discount_type,
        discount_value: parsed.discount_value,
        active: d.active,
      })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Bulk pricing tier saved");
    refresh();
  }

  async function deleteTier(t: BulkPricingTier) {
    if (!confirm(`Delete the ${t.min_qty}+ unit tier?`)) return;
    const { error } = await supabase.from("bulk_pricing_tiers").delete().eq("id", t.id);
    if (error) return toast.error(error.message);
    refresh();
  }

  const tierCount = tiers?.length ?? 0;

  return (
    <div className={compact ? "mt-2 rounded-md bg-secondary/30 p-2" : undefined}>
      <div className="flex items-center justify-between">
        {compact ? (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"
          >
            <Layers className="h-3.5 w-3.5" />
            Bulk pricing{tierCount > 0 ? ` (${tierCount})` : ""}
            <span className="text-muted-foreground/70">{open ? "▲" : "▼"}</span>
          </button>
        ) : (
          <Label className="flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5" /> Bulk pricing
          </Label>
        )}
        {open && (
          <Button size="sm" variant="outline" onClick={addTier}>
            <Plus className="mr-1 h-3 w-3" /> Add tier
          </Button>
        )}
      </div>
      {open && (
        <>
          {tierCount === 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              No bulk tiers — everyone pays the regular price no matter the quantity. Add a tier to offer a lower per-unit price at a minimum quantity.
            </p>
          )}
          <div className="mt-2 space-y-2">
            {(tiers ?? []).map((t) => {
              const d = drafts[t.id] ?? { min_qty: "", discount_type: "percentage" as BulkDiscountType, discount_value: "", active: true };
              const previewTier: BulkPricingTier = {
                ...t,
                min_qty: parseInt(d.min_qty || "0", 10) || t.min_qty,
                discount_type: d.discount_type,
                discount_value: d.discount_type === "percentage"
                  ? parseInt(d.discount_value || "0", 10) || 0
                  : Math.round(parseFloat(d.discount_value || "0") * 100) || 0,
              };
              const previewPrice = applyTier(basePriceCents, previewTier);
              return (
                <div key={t.id} className="rounded-lg border bg-background p-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs font-normal text-muted-foreground">Buy at least</Label>
                      <div className="mt-1 flex items-center gap-1.5">
                        <Input
                          type="number"
                          inputMode="numeric"
                          min={2}
                          value={d.min_qty}
                          onChange={(e) => setDrafts({ ...drafts, [t.id]: { ...d, min_qty: e.target.value } })}
                        />
                        <span className="text-xs text-muted-foreground">units</span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs font-normal text-muted-foreground">Discount type</Label>
                      <Select
                        value={d.discount_type}
                        onValueChange={(v: BulkDiscountType) => setDrafts({ ...drafts, [t.id]: { ...d, discount_type: v, discount_value: "" } })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">% off</SelectItem>
                          <SelectItem value="flat_amount">₹ off per unit</SelectItem>
                          <SelectItem value="fixed_price">Fixed price per unit</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs font-normal text-muted-foreground">
                        {d.discount_type === "percentage" ? "Percent off (1–100)" : d.discount_type === "flat_amount" ? "Amount off per unit (₹)" : "Price per unit (₹)"}
                      </Label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        step={d.discount_type === "percentage" ? 1 : 0.01}
                        value={d.discount_value}
                        onChange={(e) => setDrafts({ ...drafts, [t.id]: { ...d, discount_value: e.target.value } })}
                        className="mt-1"
                      />
                    </div>
                    <div className="col-span-2 flex items-center gap-2">
                      <Switch
                        checked={d.active}
                        onCheckedChange={(checked) => setDrafts({ ...drafts, [t.id]: { ...d, active: checked } })}
                      />
                      <Label className="text-xs font-normal text-muted-foreground">Active</Label>
                    </div>
                  </div>
                  {basePriceCents > 0 && (
                    <p className="mt-2 rounded-md bg-secondary/30 px-2 py-1.5 text-xs text-muted-foreground">
                      Preview: <span className="font-medium text-foreground">{formatMoney(previewPrice, currency)}/unit</span>{" "}
                      ({describeTierDiscount({ discount_type: previewTier.discount_type, discount_value: previewTier.discount_value }, currency)} of {formatMoney(basePriceCents, currency)})
                    </p>
                  )}
                  <div className="mt-2 flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => deleteTier(t)}>
                      <Trash2 className="mr-1 h-3 w-3" /> Delete
                    </Button>
                    <Button size="sm" onClick={() => saveTier(t.id)}>Save</Button>
                  </div>
                </div>
              );
            })}
          </div>
          {tiers && tiers.length > 1 && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              Ladder preview: {[...tiers].sort((a, b) => a.min_qty - b.min_qty).map((t) => tierRangeLabel(t, tiers)).join(" · ")} units
            </p>
          )}
        </>
      )}
    </div>
  );
}

// A compact image manager scoped to one variant, mounted inside its card in
// VariantsEditor. "Primary" here is scoped to this variant's own gallery
// only (which of ITS photos leads when this variant is selected) — it's a
// separate concept from the shared editor's "Primary", which controls the
// storefront grid/card thumbnail and is scoped to the shared gallery only.
// Neither ever touches the other's primary flag; see setPrimary() in both
// editors, and the variant_id-aware filtering in ProductCard/SearchBar,
// which prefers the shared gallery for grid thumbnails and only falls
// back to a variant's own photo when the product has no shared images.
function VariantImagesEditor({
  productId,
  variantId,
  qc,
  invalidateStoreFront,
}: {
  productId: string;
  variantId: string;
  qc: ReturnType<typeof useQueryClient>;
  invalidateStoreFront: () => void;
}) {
  const [uploading, setUploading] = useState(false);

  const { data: images } = useQuery({
    queryKey: ["admin-variant-images", variantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_images")
        .select("*")
        .eq("variant_id", variantId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  function refresh() {
    qc.invalidateQueries({ queryKey: ["admin-variant-images", variantId] });
    invalidateStoreFront();
  }

  async function handleFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    const validationError = validateImageFiles(files);
    if (validationError) return toast.error(validationError);
    setUploading(true);
    const startCount = images?.length ?? 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      let uploadBlob: Blob;
      try {
        uploadBlob = await standardizeProductImage(file);
      } catch (err) {
        // Falling back to uploading the original file here used to defeat
        // the whole point of standardizeProductImage: a file the browser
        // can't genuinely decode as an image (mislabeled MIME type, a
        // corrupt file, a decompression bomb) would silently go up as-is
        // instead of being rejected. Skip it and tell the admin why.
        console.error("Image processing failed", err);
        toast.error(`"${file.name}" couldn't be processed as an image and was skipped.`);
        continue;
      }
      const cleanName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_").replace(/\.[a-zA-Z0-9]+$/, "") + ".jpg";
      const path = `${productId}/variants/${variantId}/${crypto.randomUUID()}-${cleanName}`;
      const { error: upErr } = await supabase.storage
        .from("product-images")
        .upload(path, uploadBlob, { contentType: "image/jpeg" });
      if (upErr) {
        toast.error(`Upload failed: ${upErr.message}`);
        continue;
      }
      const { data: pub } = supabase.storage.from("product-images").getPublicUrl(path);
      const { error: insErr } = await supabase.from("product_images").insert({
        product_id: productId,
        variant_id: variantId,
        url: pub.publicUrl,
        is_primary: startCount === 0 && i === 0,
        sort_order: startCount + i,
      });
      if (insErr) toast.error(insErr.message);
    }
    setUploading(false);
    toast.success("Variant image uploaded");
    refresh();
  }

  async function setPrimary(img: ProductImage) {
    // Scoped to this variant's own images only — .eq("variant_id", ...),
    // never .eq("product_id", ...) alone, so this can't clear the shared
    // gallery's primary or another variant's.
    await supabase.from("product_images").update({ is_primary: false }).eq("variant_id", variantId).neq("id", img.id);
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
    <div className="mt-2 rounded-md bg-secondary/30 p-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">Images for this variant</p>
        <label>
          <input type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} disabled={uploading} />
          <span className="inline-flex cursor-pointer items-center rounded-md border bg-background px-2 py-1 text-[11px] hover:bg-secondary/50">
            {uploading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Upload className="mr-1 h-3 w-3" />}
            {uploading ? "Uploading…" : "Add image"}
          </span>
        </label>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        {(!images || images.length === 0)
          ? "None yet — this variant will show the shared images below on its own."
          : "Tap the star to set this variant's primary. The shared images below still show, added after these."}
      </p>
      {images && images.length > 0 && (
        <div className="mt-2 grid grid-cols-3 gap-2">
          {images.map((img) => (
            <div key={img.id} className="relative overflow-hidden rounded-lg border">
              <img src={img.url} alt="" className="aspect-square w-full object-cover" />
              {img.is_primary && (
                <div className="absolute left-1 top-1 rounded bg-foreground/90 px-1 py-px text-[8px] font-medium text-background">
                  Primary
                </div>
              )}
              <div className="flex divide-x border-t bg-background">
                <button
                  type="button"
                  disabled={img.is_primary}
                  onClick={() => setPrimary(img)}
                  aria-label="Set as primary for this variant"
                  className="flex-1 py-1 text-[11px] disabled:text-muted-foreground hover:bg-secondary/50"
                >
                  <Star className="mx-auto h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => deleteImage(img)}
                  aria-label="Delete image"
                  className="flex-1 py-1 text-[11px] hover:bg-secondary/50"
                >
                  <Trash2 className="mx-auto h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

// Auto-crops baked-in white padding around the product and re-renders it at a
// consistent high resolution, keeping the product's own aspect ratio. This is
// what fixes images looking "smaller than the frame" and blurry after upload —
// without forcing every photo into a square, which either crops parts of a
// tall/wide product away or pads it with white bars. The display frame on the
// product page adapts to each photo's real shape instead.
async function standardizeProductImage(file: File, maxSide = 1600): Promise<Blob> {
  const img = await loadImageElement(file);
  const srcW = img.naturalWidth;
  const srcH = img.naturalHeight;
  if (srcW > MAX_IMAGE_SIDE_PX || srcH > MAX_IMAGE_SIDE_PX) {
    throw new Error(`Image is ${srcW}×${srcH}px — over the ${MAX_IMAGE_SIDE_PX}px limit per side.`);
  }

  // Scan a small downscaled copy to find the actual product's bounding box
  // (ignoring white/transparent background padding baked into the source photo)
  const scanMax = 320;
  const scanScale = Math.min(1, scanMax / Math.max(srcW, srcH));
  const scanW = Math.max(1, Math.round(srcW * scanScale));
  const scanH = Math.max(1, Math.round(srcH * scanScale));
  const scanCanvas = document.createElement("canvas");
  scanCanvas.width = scanW;
  scanCanvas.height = scanH;
  const sctx = scanCanvas.getContext("2d")!;
  sctx.drawImage(img, 0, 0, scanW, scanH);
  const { data } = sctx.getImageData(0, 0, scanW, scanH);

  // Calibrate against this image's actual background instead of assuming
  // pure white. A flat "brighter than 240 = background" cutoff was the bug:
  // your catalog is mostly white/light plastic (switches, MCBs, fittings),
  // and a light-colored part of the product — like a mounting clip — can
  // easily read brighter than 240 too, especially under even studio
  // lighting. It was getting misclassified as background and trimmed away
  // along with the real background, cutting off part of the product.
  //
  // Fix: sample a thin band along all four edges (background in virtually
  // every product photo) to find how bright *this specific photo's*
  // background actually is, then only call a pixel "background" if it's
  // close to that — not just "bright in general". A product's surface,
  // even a white one, is a lit 3D shape and almost always reads at least
  // a little darker somewhere than a flat, evenly-lit background sheet, so
  // this reliably tells them apart in a way a fixed number can't.
  const edgeBand = Math.max(1, Math.round(Math.min(scanW, scanH) * 0.03));
  const edgeBrightness: number[] = [];
  for (let y = 0; y < scanH; y++) {
    for (let x = 0; x < scanW; x++) {
      const onEdge = x < edgeBand || x >= scanW - edgeBand || y < edgeBand || y >= scanH - edgeBand;
      if (!onEdge) continue;
      const idx = (y * scanW + x) * 4;
      if (data[idx + 3] < 15) continue; // transparent, not useful for calibration
      edgeBrightness.push((data[idx] + data[idx + 1] + data[idx + 2]) / 3);
    }
  }
  edgeBrightness.sort((a, b) => a - b);
  // 90th percentile, not the average or the max — robust against a corner
  // of the product occasionally touching the frame edge, while still
  // reflecting the true (bright) background tone rather than getting
  // dragged down by it.
  const sampledBackground = edgeBrightness.length > 0
    ? edgeBrightness[Math.floor(edgeBrightness.length * 0.9)]
    : 255;
  // Stay close to the sampled background (small margin, so real product
  // pixels that are merely "light" still count as product) but never trust
  // a reading below 235 — if the edges themselves are that dark, this
  // isn't a clean white-background photo, so fall back to the original
  // conservative cutoff rather than calibrating too aggressively.
  const WHITE_THRESHOLD = Math.max(235, sampledBackground - 8);

  let minX = scanW, minY = scanH, maxX = -1, maxY = -1;
  for (let y = 0; y < scanH; y++) {
    for (let x = 0; x < scanW; x++) {
      const idx = (y * scanW + x) * 4;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2], a = data[idx + 3];
      const isBackground = a < 15 || (r > WHITE_THRESHOLD && g > WHITE_THRESHOLD && b > WHITE_THRESHOLD);
      if (!isBackground) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // Fallback if nothing was detected (e.g. a blank/solid image), or if
  // what got detected is implausibly small — a product photo where the
  // "product" is under 12% of the frame is more likely a missed detection
  // than a real tiny product, so play it safe and skip cropping rather
  // than risk trimming most of the actual photo away.
  const detectedArea = Math.max(0, maxX - minX + 1) * Math.max(0, maxY - minY + 1);
  if (maxX < 0 || maxY < 0 || detectedArea < scanW * scanH * 0.12) {
    minX = 0; minY = 0; maxX = scanW - 1; maxY = scanH - 1;
  }

  const pad = 0.09; // was 6% — a bit more breathing room as a safety margin
  const boxW = maxX - minX + 1;
  const boxH = maxY - minY + 1;
  const padX = boxW * pad;
  const padY = boxH * pad;

  const cropX = Math.max(0, (minX - padX) / scanScale);
  const cropY = Math.max(0, (minY - padY) / scanScale);
  const cropRight = Math.min(srcW, (maxX + 1 + padX) / scanScale);
  const cropBottom = Math.min(srcH, (maxY + 1 + padY) / scanScale);
  const cropW = cropRight - cropX;
  const cropH = cropBottom - cropY;

  // Scale so the longer side reaches maxSide, keeping the trimmed crop's own
  // aspect ratio intact — no forced square, no cropping beyond the whitespace
  // trim above, so the full product is always preserved.
  const outScale = maxSide / Math.max(cropW, cropH);
  const outW = Math.max(1, Math.round(cropW * outScale));
  const outH = Math.max(1, Math.round(cropH * outScale));

  const outCanvas = document.createElement("canvas");
  outCanvas.width = outW;
  outCanvas.height = outH;
  const octx = outCanvas.getContext("2d")!;
  octx.imageSmoothingEnabled = true;
  octx.imageSmoothingQuality = "high";
  octx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, outW, outH);

  return await new Promise<Blob>((resolve, reject) => {
    outCanvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not process image"))),
      "image/jpeg",
      0.92
    );
  });
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
        .is("variant_id", null)
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
    const validationError = validateImageFiles(files);
    if (validationError) return toast.error(validationError);
    setUploading(true);
    const startCount = images?.length ?? 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      let uploadBlob: Blob;
      try {
        uploadBlob = await standardizeProductImage(file);
      } catch (err) {
        // See the matching comment in the variant uploader above: never
        // fall back to uploading the raw original on processing failure.
        console.error("Image processing failed", err);
        toast.error(`"${file.name}" couldn't be processed as an image and was skipped.`);
        continue;
      }
      const cleanName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_").replace(/\.[a-zA-Z0-9]+$/, "") + ".jpg";
      const path = `${product.id}/${crypto.randomUUID()}-${cleanName}`;
      const { error: upErr } = await supabase.storage
        .from("product-images")
        .upload(path, uploadBlob, { contentType: "image/jpeg" });
      if (upErr) {
        toast.error(`Upload failed: ${upErr.message}`);
        continue;
      }
      const { data: pub } = supabase.storage.from("product-images").getPublicUrl(path);
      const { error: insErr } = await supabase.from("product_images").insert({
        product_id: product.id,
        variant_id: null,
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
    // Scoped to the shared gallery only — .is("variant_id", null), never a
    // bare .eq("product_id", ...) — so this can't clear a variant's own
    // primary flag (variant images can be primary too now, scoped to their
    // own gallery; see setPrimary() in VariantImagesEditor).
    await supabase.from("product_images").update({ is_primary: false }).eq("product_id", product.id).is("variant_id", null).neq("id", img.id);
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
        <div>
          <Label>Shared images</Label>
          <p className="text-xs text-muted-foreground">Star one as primary to set the thumbnail shown on the collection page, category pages, and search. Also shown on every variant's own page, added after that variant's own images.</p>
        </div>
        <label>
          <input type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} disabled={uploading} />
          <span className="inline-flex flex-shrink-0 cursor-pointer items-center rounded-md border px-3 py-1.5 text-sm hover:bg-secondary/50">
            {uploading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Upload className="mr-1 h-3 w-3" />}
            {uploading ? "Uploading…" : "Upload images"}
          </span>
        </label>
      </div>
      {(!images || images.length === 0) && (
        <p className="mt-2 text-xs text-muted-foreground">
          No shared images uploaded yet — the collection/search thumbnail will fall back to one of this product's variant images, or the fallback image URL above if it has none.
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

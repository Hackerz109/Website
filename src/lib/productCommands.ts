/**
 * Safe predefined functions for the AI Product Console.
 *
 * Gemini (src/lib/aiConsole.server.ts) only ever produces a CommandIntent —
 * a plain data object. Everything in this file is what actually reads and
 * writes the database, using the normal browser `supabase` client, so every
 * write is still enforced by the existing "admin update products" /
 * "admin update product_variants" RLS policies. There is no path from raw
 * AI output to a database call — only from AI output, through the scoring
 * in productMatch.ts, into one of the typed rows below, which the admin
 * then has to explicitly confirm in the UI before applyXChange() runs.
 */
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/stores/cart";
import type { CommandIntent } from "./aiConsole.server";
import { scoreProduct, hasAnyFilterCriteria, MIN_MATCH_SCORE, norm, looselyContains, type ProductFilter } from "./productMatch";

// ---------------------------------------------------------------------------
// Data fetching + line building
// ---------------------------------------------------------------------------

type ProductRow = {
  id: string;
  name: string;
  description: string | null;
  category_id: string | null;
  price_cents: number;
  mrp_cents: number | null;
  stock: number;
  currency: string;
  active: boolean;
  specifications: unknown;
  categories: { name: string } | null;
  brands: { name: string } | null;
  product_variants: { id: string; name: string; price_cents: number; mrp_cents: number | null; stock: number }[];
};

export type MatchLine = {
  productId: string;
  productName: string;
  productDescription: string | null;
  categoryId: string | null;
  categoryName: string | null;
  brandName: string | null;
  variantId: string | null;
  variantName: string | null;
  displayName: string;
  priceCents: number;
  mrpCents: number | null;
  stock: number;
  currency: string;
  active: boolean;
  score: number;
};

const CATALOG_SAFETY_CAP = 2000;

async function fetchAllLines(): Promise<{ lines: (raw: ProductRow) => MatchLine[]; rows: ProductRow[] } | { error: string }> {
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, name, description, category_id, price_cents, mrp_cents, stock, currency, active, specifications, categories(name), brands(name), product_variants(id, name, price_cents, mrp_cents, stock)",
    )
    .order("name", { ascending: true })
    .limit(CATALOG_SAFETY_CAP);

  if (error) return { error: error.message };

  const rows = (data ?? []) as unknown as ProductRow[];
  return { rows, lines: (raw) => toLines(raw) };
}

function toLines(p: ProductRow): MatchLine[] {
  const brandName = p.brands?.name ?? null;
  const categoryName = p.categories?.name ?? null;
  const base = {
    productId: p.id,
    productName: p.name,
    productDescription: p.description,
    categoryId: p.category_id,
    categoryName,
    brandName,
    currency: p.currency,
    active: p.active,
  };

  if (p.product_variants.length === 0) {
    return [
      {
        ...base,
        variantId: null,
        variantName: null,
        displayName: p.name,
        priceCents: p.price_cents,
        mrpCents: p.mrp_cents,
        stock: p.stock,
        score: 0,
      },
    ];
  }

  return p.product_variants.map((v) => ({
    ...base,
    variantId: v.id,
    variantName: v.name,
    displayName: `${p.name} — ${v.name}`,
    priceCents: v.price_cents,
    mrpCents: v.mrp_cents,
    stock: v.stock,
    score: 0,
  }));
}

/** Scores + filters every line against a filter. This is the one function
 * that stands in for a fuzzy "searchProduct()" — brand/category/size text
 * all come from Gemini's extracted filter, but the matching itself is plain
 * string/number comparison in productMatch.ts. */
async function searchProductLines(filter: ProductFilter): Promise<{ lines: MatchLine[] } | { error: string }> {
  const fetched = await fetchAllLines();
  if ("error" in fetched) return fetched;

  const requireMatch = hasAnyFilterCriteria(filter);
  let scored: MatchLine[] = [];

  for (const row of fetched.rows) {
    for (const line of toLines(row)) {
      const score = scoreProduct(
        {
          id: line.productId,
          name: line.variantName ? `${line.productName} ${line.variantName}` : line.productName,
          description: line.productDescription,
          brandName: line.brandName,
          categoryName: line.categoryName,
          specifications: row.specifications,
        },
        filter,
      );
      if (score === null) continue;
      if (requireMatch && score < MIN_MATCH_SCORE) continue;
      scored.push({ ...line, score });
    }
  }

  scored.sort((a, b) => b.score - a.score || a.displayName.localeCompare(b.displayName));
  scored = discriminateVariants(scored, filter);

  // Fallback: if every filter field was given a fair shot and still matched
  // nothing, don't give up outright — try a plain, unscored substring search
  // for the raw terms across every product's name/description/variant name.
  // This is what saves a command like "update Singham" when "Singham" turns
  // out to be part of a product's own title rather than a brand or category
  // this shop has formally set up — scoreProduct() already does its best,
  // but a total dead end is worse than a low-confidence list to double-check.
  if (requireMatch && scored.length === 0) {
    const terms = collectFilterTerms(filter);
    if (terms.length > 0) {
      const seen = new Set<string>();
      for (const row of fetched.rows) {
        for (const line of toLines(row)) {
          const key = line.variantId ? `${line.productId}:${line.variantId}` : line.productId;
          if (seen.has(key)) continue;
          const text = `${line.productName} ${line.variantName ?? ""} ${line.productDescription ?? ""}`.toLowerCase();
          if (terms.some((t) => text.includes(t.toLowerCase()))) {
            scored.push({ ...line, score: 0 });
            seen.add(key);
          }
        }
      }
      scored.sort((a, b) => a.displayName.localeCompare(b.displayName));
    }
  }

  return { lines: scored };
}

function collectFilterTerms(filter: ProductFilter): string[] {
  const terms: string[] = [];
  if (filter.brand) terms.push(filter.brand);
  if (filter.category) terms.push(filter.category);
  if (filter.name_hint) terms.push(filter.name_hint);
  if (filter.keywords) terms.push(...filter.keywords);
  return terms.filter((t) => t.trim().length > 0);
}

/** Brand/category/size all hard-exclude a non-matching product in
 * scoreProduct(), but keywords/name_hint only ever add a soft score bonus —
 * on purpose, since most keywords ("copper", "FR") describe the whole
 * product and apply equally to every one of its variants. But when a word
 * like a color ("white") only shows up in SOME sibling variants' own names
 * and not others, that's the admin picking one specific variant, not
 * describing the product family — so this narrows a product's variant
 * lines down to just the ones that word actually matches, dropping the
 * rest. If a word matches all siblings equally (or none of them), nothing
 * changes here. */
function discriminateVariants(lines: MatchLine[], filter: ProductFilter): MatchLine[] {
  const words = [
    ...(filter.keywords ?? []),
    ...(filter.name_hint ? norm(filter.name_hint).split(" ") : []),
  ]
    .map((w) => w.trim())
    .filter(Boolean);
  if (words.length === 0) return [...lines];

  const byProduct = new Map<string, MatchLine[]>();
  for (const l of lines) {
    if (!l.variantId) continue;
    const arr = byProduct.get(l.productId) ?? [];
    arr.push(l);
    byProduct.set(l.productId, arr);
  }

  const exclude = new Set<string>();
  for (const siblings of byProduct.values()) {
    if (siblings.length < 2) continue;
    for (const word of words) {
      const matching = siblings.filter((s) => looselyContains(s.variantName ?? "", word));
      if (matching.length > 0 && matching.length < siblings.length) {
        const keep = new Set(matching.map((m) => m.variantId));
        for (const s of siblings) if (!keep.has(s.variantId)) exclude.add(`${s.productId}:${s.variantId}`);
      }
    }
  }
  if (exclude.size === 0) return [...lines];
  return lines.filter((l) => !(l.variantId && exclude.has(`${l.productId}:${l.variantId}`)));
}

// ---------------------------------------------------------------------------
// Value computation
// ---------------------------------------------------------------------------

export function computeNewPriceCents(oldCents: number, intent: CommandIntent): number {
  if (intent.action === "set_price") {
    return Math.max(0, Math.round((intent.price_value ?? 0) * 100));
  }
  const magnitude = Math.abs(intent.price_value ?? 0);
  const deltaCents = intent.price_mode === "percent" ? Math.round(oldCents * (magnitude / 100)) : Math.round(magnitude * 100);
  const signed = intent.price_direction === "decrease" ? -deltaCents : deltaCents;
  return Math.max(0, oldCents + signed);
}

export function computeNewStock(oldStock: number, intent: CommandIntent): number {
  if (intent.action === "set_stock") {
    return Math.max(0, Math.round(intent.stock_value ?? 0));
  }
  const magnitude = Math.round(Math.abs(intent.stock_value ?? 0));
  const signed = intent.stock_direction === "decrease" ? -magnitude : magnitude;
  return Math.max(0, oldStock + signed);
}

// ---------------------------------------------------------------------------
// Preview types
// ---------------------------------------------------------------------------

export type PriceRow = { productId: string; variantId: string | null; displayName: string; currency: string; oldCents: number; newCents: number };
export type StockRow = { productId: string; variantId: string | null; displayName: string; oldStock: number; newStock: number };
export type DescriptionRow = { productId: string; displayName: string; oldDescription: string; newDescription: string };
export type CategoryRow = { productId: string; displayName: string; oldCategoryName: string | null };
export type SearchRow = { productId: string; variantId: string | null; displayName: string; currency: string; priceCents: number; stock: number; active: boolean };

export type ConsolePreview =
  | { kind: "price"; intent: CommandIntent; rows: PriceRow[] }
  | { kind: "stock"; intent: CommandIntent; rows: StockRow[] }
  | { kind: "description"; intent: CommandIntent; rows: DescriptionRow[]; newDescription: string }
  | { kind: "category"; intent: CommandIntent; rows: CategoryRow[]; newCategoryId: string; newCategoryName: string }
  | { kind: "search"; rows: SearchRow[]; totalMatched: number }
  | { kind: "low_stock"; rows: SearchRow[]; threshold: number; totalMatched: number }
  | { kind: "empty"; message: string }
  | { kind: "clarification"; message: string };

/** The chat UI only ever stores a preview message after already branching
 * away "empty"/"clarification" results into plain text messages — this
 * type reflects that, so components rendering a stored preview don't need
 * to re-guard against kinds that can't actually reach them. */
export type ActionableConsolePreview = Exclude<ConsolePreview, { kind: "empty" } | { kind: "clarification" }>;

const MAX_PREVIEW_ROWS = 25;

// ---------------------------------------------------------------------------
// Preview builders — one per action. These are read-only: no writes happen
// until the admin confirms and one of the applyXChange() functions below runs.
// ---------------------------------------------------------------------------

export async function buildPreview(intent: CommandIntent): Promise<ConsolePreview> {
  if (intent.action === "unclear") {
    return { kind: "clarification", message: intent.clarification || "Could you rephrase that command?" };
  }

  if (intent.action === "low_stock") {
    const result = await searchProductLines(intent.filter);
    if ("error" in result) return { kind: "empty", message: `Couldn't load products: ${result.error}` };
    const threshold = intent.stock_threshold ?? 10;
    const rows = result.lines
      .filter((l) => l.stock < threshold)
      .sort((a, b) => a.stock - b.stock)
      .map(toSearchRow);
    if (rows.length === 0) return { kind: "empty", message: `No products found with stock below ${threshold}.` };
    return { kind: "low_stock", rows: rows.slice(0, MAX_PREVIEW_ROWS), threshold, totalMatched: rows.length };
  }

  if (intent.action === "search") {
    const result = await searchProductLines(intent.filter);
    if ("error" in result) return { kind: "empty", message: `Couldn't load products: ${result.error}` };
    if (result.lines.length === 0) return { kind: "empty", message: "No products matched that." };
    return { kind: "search", rows: result.lines.slice(0, MAX_PREVIEW_ROWS).map(toSearchRow), totalMatched: result.lines.length };
  }

  if (intent.action === "set_price" || intent.action === "adjust_price") {
    if (intent.price_value === null || intent.price_value === undefined) {
      return { kind: "clarification", message: "What price or amount should I apply? Try again with a number, e.g. \"increase Havells wire prices by ₹50\"." };
    }
    const result = await searchProductLines(intent.filter);
    if ("error" in result) return { kind: "empty", message: `Couldn't load products: ${result.error}` };
    if (result.lines.length === 0) return { kind: "empty", message: "No products matched that — try naming the brand or product more specifically." };
    const rows: PriceRow[] = result.lines.map((l) => ({
      productId: l.productId,
      variantId: l.variantId,
      displayName: l.displayName,
      currency: l.currency,
      oldCents: l.priceCents,
      newCents: computeNewPriceCents(l.priceCents, intent),
    }));
    return { kind: "price", intent, rows };
  }

  if (intent.action === "set_stock" || intent.action === "adjust_stock") {
    if (intent.stock_value === null || intent.stock_value === undefined) {
      return { kind: "clarification", message: "How many units? Try again with a number, e.g. \"add 20 rolls of Havells 1.5mm wire to stock\"." };
    }
    const result = await searchProductLines(intent.filter);
    if ("error" in result) return { kind: "empty", message: `Couldn't load products: ${result.error}` };
    if (result.lines.length === 0) return { kind: "empty", message: "No products matched that — try naming the brand or product more specifically." };
    const rows: StockRow[] = result.lines.map((l) => ({
      productId: l.productId,
      variantId: l.variantId,
      displayName: l.displayName,
      oldStock: l.stock,
      newStock: computeNewStock(l.stock, intent),
    }));
    return { kind: "stock", intent, rows };
  }

  if (intent.action === "update_description") {
    if (!intent.new_description?.trim()) {
      return { kind: "clarification", message: "What should the new description say?" };
    }
    const result = await searchProductLines(intent.filter);
    if ("error" in result) return { kind: "empty", message: `Couldn't load products: ${result.error}` };
    // Description is a product-level field — dedupe variant lines down to
    // their parent product so a 3-variant product doesn't show 3 rows.
    const byProduct = new Map<string, MatchLine>();
    for (const l of result.lines) if (!byProduct.has(l.productId)) byProduct.set(l.productId, l);
    if (byProduct.size === 0) return { kind: "empty", message: "No products matched that — try naming the product more specifically." };
    const rows: DescriptionRow[] = Array.from(byProduct.values()).map((l) => ({
      productId: l.productId,
      displayName: l.productName,
      oldDescription: l.productDescription ?? "(none)",
      newDescription: intent.new_description!.trim(),
    }));
    return { kind: "description", intent, rows, newDescription: intent.new_description.trim() };
  }

  if (intent.action === "update_category") {
    if (!intent.new_category?.trim()) {
      return { kind: "clarification", message: "Which category should these move to?" };
    }
    const category = await findCategory(intent.new_category.trim());
    if (!category) {
      const names = await listCategoryNames();
      return {
        kind: "clarification",
        message: `No category matching "${intent.new_category}". Existing categories: ${names.join(", ") || "(none yet)"}. Add it first under Categories & Brands, then try again.`,
      };
    }
    const result = await searchProductLines(intent.filter);
    if ("error" in result) return { kind: "empty", message: `Couldn't load products: ${result.error}` };
    const byProduct = new Map<string, MatchLine>();
    for (const l of result.lines) if (!byProduct.has(l.productId)) byProduct.set(l.productId, l);
    if (byProduct.size === 0) return { kind: "empty", message: "No products matched that — try naming the brand or product more specifically." };
    const rows: CategoryRow[] = Array.from(byProduct.values()).map((l) => ({
      productId: l.productId,
      displayName: l.productName,
      oldCategoryName: l.categoryName,
    }));
    return { kind: "category", intent, rows, newCategoryId: category.id, newCategoryName: category.name };
  }

  return { kind: "clarification", message: "I didn't understand that command — try rephrasing it." };
}

function toSearchRow(l: MatchLine): SearchRow {
  return { productId: l.productId, variantId: l.variantId, displayName: l.displayName, currency: l.currency, priceCents: l.priceCents, stock: l.stock, active: l.active };
}

async function findCategory(name: string): Promise<{ id: string; name: string } | null> {
  const { data } = await supabase.from("categories").select("id, name");
  if (!data) return null;
  const norm = (s: string) => s.toLowerCase().trim();
  const target = norm(name);
  const exact = data.find((c) => norm(c.name) === target);
  if (exact) return exact;
  const partial = data.find((c) => norm(c.name).includes(target) || target.includes(norm(c.name)));
  return partial ?? null;
}

async function listCategoryNames(): Promise<string[]> {
  const { data } = await supabase.from("categories").select("name").order("name");
  return (data ?? []).map((c) => c.name);
}

// ---------------------------------------------------------------------------
// Apply — the only functions that write to the database, and only ever
// called after the admin taps Confirm on a preview built above. RLS ("admin
// update products/product_variants") is the real enforcement; this is just
// the app-level plumbing.
// ---------------------------------------------------------------------------

async function runUpdates<T>(rows: T[], fn: (row: T) => Promise<{ error: { message: string } | null }>): Promise<{ ok: number; failed: number; firstError?: string }> {
  const results = await Promise.all(rows.map((r) => fn(r)));
  let ok = 0;
  let failed = 0;
  let firstError: string | undefined;
  for (const r of results) {
    if (r.error) {
      failed++;
      if (!firstError) firstError = r.error.message;
    } else ok++;
  }
  return { ok, failed, firstError };
}

export async function applyPriceRows(rows: PriceRow[]) {
  return runUpdates(rows, async (row) => {
    if (row.variantId) {
      return supabase.from("product_variants").update({ price_cents: row.newCents }).eq("id", row.variantId);
    }
    return supabase.from("products").update({ price_cents: row.newCents }).eq("id", row.productId);
  });
}

export async function applyStockRows(rows: StockRow[]) {
  return runUpdates(rows, async (row) => {
    if (row.variantId) {
      return supabase.from("product_variants").update({ stock: row.newStock }).eq("id", row.variantId);
    }
    return supabase.from("products").update({ stock: row.newStock }).eq("id", row.productId);
  });
}

export async function applyDescriptionRows(rows: DescriptionRow[]) {
  return runUpdates(rows, async (row) => supabase.from("products").update({ description: row.newDescription }).eq("id", row.productId));
}

export async function applyCategoryRows(rows: CategoryRow[], newCategoryId: string) {
  return runUpdates(rows, async (row) => supabase.from("products").update({ category_id: newCategoryId }).eq("id", row.productId));
}

// ---------------------------------------------------------------------------
// Display helpers shared with the UI
// ---------------------------------------------------------------------------

export { formatMoney };

export function priceSummary(rows: PriceRow[]) {
  const count = rows.length;
  if (count === 0) return { count, oldAvgCents: 0, newAvgCents: 0, currency: "INR" };
  const oldAvgCents = Math.round(rows.reduce((s, r) => s + r.oldCents, 0) / count);
  const newAvgCents = Math.round(rows.reduce((s, r) => s + r.newCents, 0) / count);
  return { count, oldAvgCents, newAvgCents, currency: rows[0].currency };
}

export function stockSummary(rows: StockRow[]) {
  const count = rows.length;
  const oldTotal = rows.reduce((s, r) => s + r.oldStock, 0);
  const newTotal = rows.reduce((s, r) => s + r.newStock, 0);
  return { count, oldTotal, newTotal };
}

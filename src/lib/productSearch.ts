import { supabase } from "@/integrations/supabase/client";

/** Shared select so the header preview and the full results page return identically-shaped products. */
export const PRODUCT_SEARCH_SELECT =
  "*, product_images(url, is_primary, variant_id), product_variants(id, name, sku, price_cents, stock, stock_unlimited), categories(name, slug), brands(name)";

export function sanitizeSearchQuery(q: string) {
  // Strip characters that would break a PostgREST filter string if this
  // term is ever combined into an .eq()/.in() elsewhere.
  return q.replace(/[%,()]/g, " ").trim();
}

/**
 * Runs the fuzzy, word-order-independent product search RPC (see
 * migration 20260813120000) and returns matching products ids with their
 * relevance score (0-1, best first). A word can match by plain substring,
 * typo-tolerant trigram similarity, or — for long words that don't already
 * match well — by trying every way of splitting it in two and scoring the
 * halves separately, which is what lets a glued/typo'd brand name like
 * "anchornpemta" still find "Anchor Penta". Every word in the query has to
 * match *somewhere* on the product (name, description, SKU, category,
 * brand, variant names/SKUs, spec key/values) — so "Havells wire 1mm"
 * finds a product literally named "1mm Havells Wire".
 */
export async function rankedProducts(term: string): Promise<{ id: string; rank: number }[]> {
  const clean = sanitizeSearchQuery(term);
  if (clean.length < 2) return [];
  const { data, error } = await supabase.rpc("search_products_ranked", { p_query: clean });
  if (error) throw error;
  return data ?? [];
}

/** Convenience wrapper for callers that only need the ordered ids. */
export async function rankedProductIds(term: string): Promise<string[]> {
  return (await rankedProducts(term)).map((r) => r.id);
}

/**
 * Re-sorts fetched rows to match a previously-computed id ranking —
 * needed because `.in("id", ids)` does not preserve the order of `ids`.
 */
export function sortByRank<T extends { id: string }>(rows: T[], rankedIds: string[]): T[] {
  const rankIndex = new Map(rankedIds.map((id, i) => [id, i]));
  return [...rows].sort((a, b) => (rankIndex.get(a.id) ?? 0) - (rankIndex.get(b.id) ?? 0));
}

/**
 * Which of a product's own variants are worth showing as a "↳ variant"
 * sub-result — any variant whose own name/SKU contains at least one word
 * from the search (e.g. searching "Havells wire 1mm" highlights the
 * "1mm" variant specifically, out of several gauge options).
 */
export function matchingVariants<V extends { name: string; sku: string | null }>(
  term: string,
  variants: V[],
): V[] {
  const words = sanitizeSearchQuery(term).toLowerCase().split(/\s+/).filter((w) => w.length > 1);
  if (words.length === 0) return [];
  return variants.filter((v) => {
    const text = `${v.name} ${v.sku ?? ""}`.toLowerCase();
    return words.some((w) => text.includes(w));
  });
}

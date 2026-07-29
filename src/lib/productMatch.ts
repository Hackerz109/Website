/**
 * Fuzzy product matching for the AI Product Console.
 *
 * This is plain, deterministic TypeScript — no AI involved. Gemini only
 * ever extracts a filter like { brand: "Havells", size_text: "1mm" };
 * everything here is regular string/number matching against the real
 * product catalog, so it's inspectable and won't hallucinate a product
 * into existence.
 */
import type { CommandFilter } from "./aiConsole.server";

// Re-declared locally (not imported) so this file has zero dependency on
// any .server.ts module and can safely be imported from client components.
export type ProductFilter = CommandFilter;

export type SizeToken = { value: number; unit: string };

// ---------------------------------------------------------------------------
// Unit normalization
// ---------------------------------------------------------------------------

// Ordered longest/most-specific first so e.g. "sq mm" and "mm2" don't get
// swallowed by the plainer "mm" alternative, and "kw"/"kilowatt" don't get
// swallowed by "w"/"watt".
const UNIT_ALTERNATION =
  "sq\\.?\\s*mm\\.?|sqmm|mm2|mm\u00B2|mm|cm|kilowatts?|kw|watts?|w|metres?|meters?|m|feet|foot|ft|inches?|inch|in|amperes?|amps?|amp|a|volts?|v|litres?|liters?|l|kilograms?|kg|grams?|g|hp|rpm|hz";

const SIZE_TOKEN_RE = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(${UNIT_ALTERNATION})\\b`, "gi");

function canonicalUnit(raw: string): string {
  const u = raw.toLowerCase().replace(/\s+/g, "").replace(/\.+$/, "");
  if (/^(sq\.?mm\.?|sqmm|mm2|mm\u00B2)$/.test(u)) return "sqmm";
  if (u === "mm") return "mm";
  if (u === "cm") return "cm";
  if (/^(kilowatts?|kw)$/.test(u)) return "kw";
  if (/^(watts?|w)$/.test(u)) return "w";
  if (/^(metres?|meters?|m)$/.test(u)) return "m";
  if (/^(feet|foot|ft)$/.test(u)) return "ft";
  if (/^(inches?|inch|in)$/.test(u)) return "in";
  if (/^(amperes?|amps?|amp|a)$/.test(u)) return "a";
  if (/^(volts?|v)$/.test(u)) return "v";
  if (/^(litres?|liters?|l)$/.test(u)) return "l";
  if (/^(kilograms?|kg)$/.test(u)) return "kg";
  if (/^(grams?|g)$/.test(u)) return "g";
  if (u === "hp") return "hp";
  if (u === "rpm") return "rpm";
  if (u === "hz") return "hz";
  return u;
}

// Domain quirk: shop staff routinely say "1mm wire" meaning the "1 sq mm"
// cross-sectional rating, not a linear millimeter. Treat these two
// canonical units as interchangeable when scoring a size match (with a
// slightly lower confidence than a same-unit exact match).
const EQUIVALENT_UNITS: Record<string, string[]> = {
  mm: ["mm", "sqmm"],
  sqmm: ["mm", "sqmm"],
};

export function extractSizeTokens(text: string): SizeToken[] {
  const tokens: SizeToken[] = [];
  const re = new RegExp(SIZE_TOKEN_RE);
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const value = parseFloat(match[1]);
    if (!Number.isFinite(value)) continue;
    tokens.push({ value, unit: canonicalUnit(match[2]) });
  }
  return tokens;
}

export type SizeMatchResult = "exact" | "equivalent" | "none";

/** Compares one requested size token against every size token found in a
 * product's text. "exact" = same number + same canonical unit. "equivalent"
 * = same number, unit in the same equivalence group (e.g. mm vs sqmm). */
export function bestSizeMatch(requested: SizeToken, candidateTokens: SizeToken[]): SizeMatchResult {
  let best: SizeMatchResult = "none";
  for (const t of candidateTokens) {
    if (Math.abs(t.value - requested.value) > 0.001) continue;
    if (t.unit === requested.unit) return "exact";
    if (EQUIVALENT_UNITS[requested.unit]?.includes(t.unit)) best = "equivalent";
  }
  return best;
}

// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------

function norm(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

/** True if `needle` reads as the same brand/category word as `haystack`
 * (handles plurals and partial containment either direction), e.g.
 * norm("wire") vs norm("wires"), or "Havells" vs "havells lifeline". */
function looselyContains(haystack: string, needle: string): boolean {
  const h = norm(haystack);
  const n = norm(needle);
  if (!n) return false;
  if (h.includes(n) || n.includes(h)) return true;
  // strip a trailing "s" from either side for a crude singular/plural match
  const hSing = h.replace(/s\b/g, "");
  const nSing = n.replace(/s\b/g, "");
  return hSing.includes(nSing) || nSing.includes(hSing);
}

// ---------------------------------------------------------------------------
// Candidate scoring
// ---------------------------------------------------------------------------

export type MatchableProduct = {
  id: string;
  name: string;
  description: string | null;
  brandName: string | null;
  categoryName: string | null;
  specifications: unknown;
};

export type ScoredMatch = {
  productId: string;
  score: number;
  /** false when the filter had a brand/category/size that this candidate
   * failed to satisfy — such candidates are dropped before scoring is even
   * relevant, kept here mainly for debugging/testing. */
  passed: boolean;
};

function specsAsText(specifications: unknown): string {
  if (!Array.isArray(specifications)) return "";
  return specifications
    .map((s) => (s && typeof s === "object" ? `${(s as { key?: string }).key ?? ""} ${(s as { value?: string }).value ?? ""}` : ""))
    .join(" ");
}

/** Scores one product against a filter. Returns null if the product fails a
 * hard requirement (brand/category/size explicitly requested but absent),
 * so the caller can drop it outright rather than returning a low-confidence
 * false positive on something like a price/stock bulk update. */
export function scoreProduct(product: MatchableProduct, filter: ProductFilter): number | null {
  const searchableText = `${product.name} ${product.description ?? ""} ${specsAsText(product.specifications)}`;
  let score = 0;

  if (filter.brand) {
    if (!product.brandName || !looselyContains(product.brandName, filter.brand)) return null;
    score += 3;
  }

  if (filter.category) {
    const matchesCategoryName = !!product.categoryName && looselyContains(product.categoryName, filter.category);
    const matchesText = looselyContains(searchableText, filter.category);
    if (!matchesCategoryName && !matchesText) return null;
    score += matchesCategoryName ? 2 : 1;
  }

  if (filter.size_text) {
    const requestedTokens = extractSizeTokens(filter.size_text);
    if (requestedTokens.length > 0) {
      const candidateTokens = extractSizeTokens(searchableText);
      if (candidateTokens.length > 0) {
        // Only ever compare the first requested size token — commands
        // reference one size at a time in practice.
        const result = bestSizeMatch(requestedTokens[0], candidateTokens);
        if (result === "none") return null;
        score += result === "exact" ? 4 : 3;
      }
      // If the product has no extractable size tokens at all, don't hard
      // -exclude it (the size might live somewhere unparsed) — it just
      // won't get the size-match score boost, so exact matches outrank it.
    }
  }

  if (filter.keywords && filter.keywords.length > 0) {
    for (const kw of filter.keywords) {
      if (looselyContains(searchableText, kw)) score += 1;
    }
  }

  if (filter.name_hint) {
    const hintWords = norm(filter.name_hint).split(" ").filter(Boolean);
    const nameWords = new Set(norm(product.name).split(" ").filter(Boolean));
    const overlap = hintWords.filter((w) => nameWords.has(w)).length;
    if (hintWords.length > 0) score += (overlap / hintWords.length) * 3;
  }

  // If literally no filter field was provided, treat everything as an equal,
  // minimal match (e.g. a bare "show low stock" query has no product-level
  // filter at all — that's handled by the low_stock action, not this
  // scorer, but keep this safe rather than returning null for every row).
  return score;
}

/** Minimum score to be considered a real match rather than noise, when at
 * least one filter field was actually specified. Tuned low on purpose —
 * the confirm-before-apply preview is the real safety net, not this cutoff. */
export const MIN_MATCH_SCORE = 1;

export function hasAnyFilterCriteria(filter: ProductFilter): boolean {
  return !!(filter.brand || filter.category || filter.size_text || filter.name_hint || (filter.keywords && filter.keywords.length > 0));
}

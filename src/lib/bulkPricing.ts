import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/stores/cart";
import type { Database } from "@/integrations/supabase/types";

export type BulkDiscountType = Database["public"]["Enums"]["bulk_discount_type"];
export type BulkPricingTier = Database["public"]["Tables"]["bulk_pricing_tiers"]["Row"];

/**
 * Fetches active bulk pricing tiers for a set of products in one round
 * trip, grouped by product_id and sorted ascending by min_qty (the order
 * they should be listed in a "buy more, save more" table). Safe to call
 * with an empty array. RLS only ever returns active tiers here (this
 * queries as the storefront would) — see the migration for why that's
 * safe to leave public: it's catalog pricing, not a secret code.
 */
export async function fetchBulkTiers(productIds: string[]): Promise<Record<string, BulkPricingTier[]>> {
  const ids = [...new Set(productIds)].filter(Boolean);
  if (ids.length === 0) return {};
  const { data, error } = await supabase
    .from("bulk_pricing_tiers")
    .select("*")
    .in("product_id", ids)
    .eq("active", true)
    .order("min_qty", { ascending: true });
  if (error || !data) return {};
  const grouped: Record<string, BulkPricingTier[]> = {};
  for (const t of data) {
    (grouped[t.product_id] ??= []).push(t);
  }
  return grouped;
}

/**
 * Picks the tier a given quantity qualifies for — the highest min_qty it
 * still clears. Mirrors resolve_bulk_unit_price_cents() in the database
 * exactly, so the preview shown here never drifts from what checkout will
 * actually charge. Tiers don't need to be sorted going in.
 */
export function bestTierFor(tiers: BulkPricingTier[], qty: number): BulkPricingTier | null {
  let best: BulkPricingTier | null = null;
  for (const t of tiers) {
    if (!t.active || t.min_qty > qty) continue;
    if (!best || t.min_qty > best.min_qty) best = t;
  }
  return best;
}

/** The next tier a shopper hasn't unlocked yet, and how many more units get them there. */
export function nextTierHint(tiers: BulkPricingTier[], qty: number): { tier: BulkPricingTier; unitsNeeded: number } | null {
  let next: BulkPricingTier | null = null;
  for (const t of tiers) {
    if (!t.active || t.min_qty <= qty) continue;
    if (!next || t.min_qty < next.min_qty) next = t;
  }
  return next ? { tier: next, unitsNeeded: next.min_qty - qty } : null;
}

/** Applies one tier's discount to a catalog unit price. Mirrors the SQL function's clamping rules. */
export function applyTier(basePriceCents: number, tier: BulkPricingTier | null): number {
  if (!tier || basePriceCents <= 0) return Math.max(0, basePriceCents);
  let price: number;
  if (tier.discount_type === "percentage") {
    price = basePriceCents - Math.floor((basePriceCents * Math.min(tier.discount_value, 100)) / 100);
  } else if (tier.discount_type === "flat_amount") {
    price = basePriceCents - tier.discount_value;
  } else {
    price = tier.discount_value; // fixed_price
  }
  price = Math.max(0, price);
  if (tier.discount_type !== "fixed_price") price = Math.min(price, basePriceCents);
  return price;
}

/** The unit price a given quantity actually pays — the one number everything else derives from. */
export function tierUnitPriceCents(basePriceCents: number, tiers: BulkPricingTier[], qty: number): number {
  return applyTier(basePriceCents, bestTierFor(tiers, qty));
}

/** Short label for a tier's discount, e.g. "10% off", "₹20 off/unit", "₹450 each". */
export function describeTierDiscount(tier: Pick<BulkPricingTier, "discount_type" | "discount_value">, currency = "INR"): string {
  if (tier.discount_type === "percentage") return `${tier.discount_value}% off`;
  if (tier.discount_type === "flat_amount") return `${formatMoney(tier.discount_value, currency)} off/unit`;
  return `${formatMoney(tier.discount_value, currency)} each`;
}

/** "Buy 5+" / "Buy 5-9" style range label for a tier within its ladder. */
export function tierRangeLabel(tier: BulkPricingTier, allTiers: BulkPricingTier[]): string {
  const above = allTiers
    .filter((t) => t.active && t.min_qty > tier.min_qty)
    .sort((a, b) => a.min_qty - b.min_qty)[0];
  return above ? `${tier.min_qty}–${above.min_qty - 1}` : `${tier.min_qty}+`;
}

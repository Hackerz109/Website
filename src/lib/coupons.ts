import { supabase } from "@/integrations/supabase/client";
import type { CartItem } from "@/stores/cart";

export interface CouponValidationResult {
  valid: boolean;
  message: string;
  coupon_id?: string;
  code?: string;
  discount_type?: "percentage" | "fixed" | "free_shipping";
  discount_cents?: number;
  free_shipping?: boolean;
  stackable?: boolean;
}

export interface VisibleCoupon {
  code: string;
  description: string | null;
  discount_type: "percentage" | "fixed" | "free_shipping";
  discount_value: number;
  max_discount_cents: number | null;
  min_order_cents: number | null;
  visibility: "visible" | "hidden" | "auto_apply";
}

/**
 * Maps cart lines into the shape validate_coupon() expects, carrying each
 * item's real category/brand so category- and brand-restricted coupons can
 * actually match.
 */
function toValidationItems(items: CartItem[]) {
  return items.map((i) => ({
    product_id: i.id,
    category_id: i.category_id,
    brand_id: i.brand_id,
    line_total_cents: i.price_cents * i.quantity,
  }));
}

/** Runs the real, authoritative check server-side — never trust a client-side total. */
export async function validateCoupon(
  code: string,
  userId: string | null,
  items: CartItem[],
): Promise<CouponValidationResult> {
  const { data, error } = await supabase.rpc("validate_coupon", {
    p_code: code,
    p_user_id: userId,
    p_items: toValidationItems(items),
  });
  if (error) {
    return { valid: false, message: "Couldn't check that coupon right now — please try again." };
  }
  return data as unknown as CouponValidationResult;
}

/** Coupons that should be proactively surfaced (visible + auto-apply), for suggestions. */
export async function fetchVisibleCoupons(): Promise<VisibleCoupon[]> {
  const { data, error } = await supabase.rpc("get_visible_coupons");
  if (error || !data) return [];
  return data as unknown as VisibleCoupon[];
}

/** Only the visible coupons that actually apply to this specific product — for product pages. */
export async function fetchOffersForProduct(
  productId: string,
  categoryId: string | null,
  brandId: string | null,
  userId: string | null,
): Promise<VisibleCoupon[]> {
  const { data, error } = await supabase.rpc("get_offers_for_product", {
    p_product_id: productId,
    p_category_id: categoryId,
    p_brand_id: brandId,
    p_user_id: userId,
  });
  if (error || !data) return [];
  return data as unknown as VisibleCoupon[];
}

/** Only the visible coupons that apply to at least one item in the cart — for checkout suggestions. */
export async function fetchOffersForCart(items: CartItem[], userId: string | null): Promise<VisibleCoupon[]> {
  const { data, error } = await supabase.rpc("get_offers_for_cart", {
    p_items: toValidationItems(items),
    p_user_id: userId,
  });
  if (error || !data) return [];
  return data as unknown as VisibleCoupon[];
}

/**
 * Store-wide coupons the given shopper genuinely qualifies for right now —
 * a first-order coupon disappears the moment they have an order, a
 * logged-in-only coupon is hidden from guests, usage-limited coupons drop
 * off once they're used up, and so on. Powers the site-wide highlight
 * widget (not scoped to any one product or cart).
 */
export async function fetchEligibleCoupons(userId: string | null): Promise<VisibleCoupon[]> {
  const { data, error } = await supabase.rpc("get_eligible_coupons", { p_user_id: userId });
  if (error || !data) return [];
  return data as unknown as VisibleCoupon[];
}

export function describeCoupon(c: Pick<VisibleCoupon, "discount_type" | "discount_value" | "max_discount_cents">) {
  if (c.discount_type === "free_shipping") return "Free shipping";
  if (c.discount_type === "percentage") {
    const cap = c.max_discount_cents ? ` (up to ₹${(c.max_discount_cents / 100).toFixed(0)})` : "";
    return `${c.discount_value}% off${cap}`;
  }
  return `₹${(c.discount_value / 100).toFixed(0)} off`;
}

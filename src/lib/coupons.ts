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
 * Cart items carry product/category/brand info directly where available.
 * Category/brand aren't stored on the cart line today, so this maps what
 * we have — the validate_coupon() function treats missing ids as "doesn't
 * match category/brand-specific rules", which is the safe default.
 */
function toValidationItems(items: CartItem[]) {
  return items.map((i) => ({
    product_id: i.id,
    category_id: null,
    brand_id: null,
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

export function describeCoupon(c: Pick<VisibleCoupon, "discount_type" | "discount_value" | "max_discount_cents">) {
  if (c.discount_type === "free_shipping") return "Free shipping";
  if (c.discount_type === "percentage") {
    const cap = c.max_discount_cents ? ` (up to ₹${(c.max_discount_cents / 100).toFixed(0)})` : "";
    return `${c.discount_value}% off${cap}`;
  }
  return `₹${(c.discount_value / 100).toFixed(0)} off`;
}

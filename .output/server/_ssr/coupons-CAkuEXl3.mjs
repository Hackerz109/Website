import { t as supabase } from "./client-C6ZaJElq.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/coupons-CAkuEXl3.js
/**
* Maps cart lines into the shape validate_coupon() expects, carrying each
* item's real category/brand so category- and brand-restricted coupons can
* actually match.
*/
function toValidationItems(items) {
	return items.map((i) => ({
		product_id: i.id,
		category_id: i.category_id,
		brand_id: i.brand_id,
		line_total_cents: i.price_cents * i.quantity
	}));
}
/** Runs the real, authoritative check server-side — never trust a client-side total. */
async function validateCoupon(code, userId, items) {
	const { data, error } = await supabase.rpc("validate_coupon", {
		p_code: code,
		p_user_id: userId,
		p_items: toValidationItems(items)
	});
	if (error) return {
		valid: false,
		message: "Couldn't check that coupon right now — please try again."
	};
	return data;
}
/** Only the visible coupons that actually apply to this specific product — for product pages. */
async function fetchOffersForProduct(productId, categoryId, brandId, userId) {
	const { data, error } = await supabase.rpc("get_offers_for_product", {
		p_product_id: productId,
		p_category_id: categoryId,
		p_brand_id: brandId,
		p_user_id: userId
	});
	if (error || !data) return [];
	return data;
}
/** Only the visible coupons that apply to at least one item in the cart — for checkout suggestions. */
async function fetchOffersForCart(items, userId) {
	const { data, error } = await supabase.rpc("get_offers_for_cart", {
		p_items: toValidationItems(items),
		p_user_id: userId
	});
	if (error || !data) return [];
	return data;
}
/**
* Store-wide coupons the given shopper genuinely qualifies for right now —
* a first-order coupon disappears the moment they have an order, a
* logged-in-only coupon is hidden from guests, usage-limited coupons drop
* off once they're used up, and so on. Powers the site-wide highlight
* widget (not scoped to any one product or cart).
*/
async function fetchEligibleCoupons(userId) {
	const { data, error } = await supabase.rpc("get_eligible_coupons", { p_user_id: userId });
	if (error || !data) return [];
	return data;
}
function describeCoupon(c) {
	if (c.discount_type === "free_shipping") return "Free shipping";
	if (c.discount_type === "percentage") {
		const cap = c.max_discount_cents ? ` (up to ₹${(c.max_discount_cents / 100).toFixed(0)})` : "";
		return `${c.discount_value}% off${cap}`;
	}
	return `₹${(c.discount_value / 100).toFixed(0)} off`;
}
//#endregion
export { validateCoupon as a, fetchOffersForProduct as i, fetchEligibleCoupons as n, fetchOffersForCart as r, describeCoupon as t };

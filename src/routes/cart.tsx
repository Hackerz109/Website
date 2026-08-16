import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Trash2, Ticket, X, Check, MapPin, Store, Truck, LocateFixed, Wallet, Home, Building2, PencilLine, CreditCard, Banknote, Layers } from "lucide-react";
import { toast } from "sonner";
import { StoreHeader } from "@/components/StoreHeader";
import { StoreFooter } from "@/components/StoreFooter";
import { QuantityInput } from "@/components/QuantityInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Combobox } from "@/components/ui/combobox";
import { INDIAN_STATES } from "@/lib/indianStates";
import { INDIAN_CITIES } from "@/lib/indianCities";
import { LeafletMap } from "@/components/LeafletMap";
import { useCart, formatMoney, qtyCap, type CartItem } from "@/stores/cart";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchBulkTiers,
  tiersForLine,
  tierUnitPriceCents,
  bestTierFor,
  nextTierHint,
  describeTierDiscount,
  type BulkPricingTier,
} from "@/lib/bulkPricing";
import { useAuth } from "@/hooks/useAuth";
import { payForOrder } from "@/lib/razorpay";
import { validateCoupon, fetchOffersForCart, describeCoupon, type CouponValidationResult, type VisibleCoupon } from "@/lib/coupons";
import {
  getBrowserLocation,
  forwardGeocode,
  lookupPincode,
  getDeliveryInfo,
  calculateDeliveryCharge,
  type DeliveryInfo,
  type DeliveryChargeResult,
} from "@/lib/delivery";
import { fetchWalletTransactions, sumBalance, redeemWalletForOrder } from "@/lib/wallet";
import { PhoneVerifyDialog } from "@/components/PhoneVerifyDialog";
import { PhoneInput } from "@/components/PhoneInput";
import { PHONE_VERIFICATION_ENABLED } from "@/lib/phoneVerification";
import { isValidPhone } from "@/lib/phone";
import { fetchMyAddresses, type UserAddress } from "@/lib/profile";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/cart")({ component: CartPage });

type FulfillmentType = Database["public"]["Enums"]["fulfillment_type"];

// Default map center before we know anything — swapped out the moment we
// have a shop location or a customer location to show instead.
const FALLBACK_CENTER = { lat: 20.5937, lng: 78.9629 }; // India, roughly

function CartPage() {
  const items = useCart((s) => s.items);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const clear = useCart((s) => s.clear);
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [phoneDialogOpen, setPhoneDialogOpen] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [placing, setPlacing] = useState(false);

  const [couponInput, setCouponInput] = useState("");
  const [applying, setApplying] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidationResult | null>(null);
  const [suggested, setSuggested] = useState<VisibleCoupon[]>([]);
  const [autoApplyChecked, setAutoApplyChecked] = useState(false);

  // ---- Delivery / pickup -------------------------------------------------
  const [deliveryInfo, setDeliveryInfo] = useState<DeliveryInfo | null>(null);
  const [fulfillment, setFulfillment] = useState<FulfillmentType>("delivery");
  // Only ever meaningful when fulfillment === "pickup" — Cash on Pickup
  // doesn't exist for home delivery. Switching back to Home Delivery
  // resets this to "online" (see the fulfillment toggle below) so a stray
  // cash selection can never silently carry over to a delivery order.
  const [paymentMethod, setPaymentMethod] = useState<"online" | "cash_on_pickup">("online");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [pincode, setPincode] = useState("");
  // `coords` is now ONLY ever set by an explicit shopper action — "use my
  // location", tapping the map, or dragging the pin. Typing an address never
  // touches it, and setting it never touches the address fields either: the
  // two are fully independent, by design. See `addressCoords` below for how
  // we still detect delivery eligibility for shoppers who never touch the map.
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  // A coordinate resolved in the background from the *typed* address, purely
  // to check "do we deliver here" and compute the charge when the shopper
  // hasn't dropped a pin. Never shown as a map marker and never written back
  // into the address fields — it only ever feeds `effectiveCoords` below,
  // and is cleared the instant a manual pin (`coords`) exists, since a
  // manually-placed pin is strictly more trustworthy than a guess.
  const [addressCoords, setAddressCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [addressChecking, setAddressChecking] = useState(false);
  const [addressCheckFailed, setAddressCheckFailed] = useState(false);
  // True when the address→coordinates match wasn't exact (fell back to a
  // looser city/pincode-level match) — used only to soften the "Deliverable"
  // wording and nudge toward dropping a precise pin, since (unlike before)
  // there's no visible pin on this path to put an uncertainty ring around.
  const [addressApprox, setAddressApprox] = useState(false);
  const [quote, setQuote] = useState<DeliveryChargeResult | null>(null);
  const [checkingQuote, setCheckingQuote] = useState(false);
  const [deliveryBlocked, setDeliveryBlocked] = useState(false);
  // Remembers the last city/state values we filled in *for* the shopper
  // (from a pincode lookup) so that if they edit City or State by hand
  // afterward, a later pincode-effect re-run doesn't stomp their edit back
  // to whatever the pincode says — it only autofills a field while it still
  // holds exactly what we last put there (or is empty).
  const pincodeAutofilledRef = useRef<{ city: string; state: string }>({ city: "", state: "" });

  // The coordinate actually used for eligibility/charge/order storage: a
  // manually-placed pin always wins; lacking one, we fall back to the
  // silent background guess from the typed address.
  const effectiveCoords = coords ?? addressCoords;
  // "Full address" always means all four fields — map location never
  // substitutes for this, whether or not a pin has been dropped.
  const hasFullAddress =
    addressLine1.trim().length > 0 && city.trim().length > 0 && stateName.trim().length > 0 && /^\d{6}$/.test(pincode.trim());

  // ---- Saved addresses ----------------------------------------------------
  const [savedAddresses, setSavedAddresses] = useState<UserAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setSavedAddresses([]);
      return;
    }
    fetchMyAddresses(user.id)
      .then(setSavedAddresses)
      .catch(() => setSavedAddresses([]));
  }, [user]);

  // ---- Wallet -------------------------------------------------------------
  const [walletBalance, setWalletBalance] = useState(0);
  const [useWallet, setUseWallet] = useState(false);
  const [walletAmountInput, setWalletAmountInput] = useState("");

  // Bulk ("buy more, save more") tiers for every product currently in the
  // cart, keyed by product id. Re-fetched whenever the *set* of products in
  // the cart changes — not on every quantity tick, since the tiers
  // themselves don't depend on quantity, only which price they resolve to.
  const [bulkTiersByProduct, setBulkTiersByProduct] = useState<Record<string, BulkPricingTier[]>>({});
  useEffect(() => {
    if (items.length === 0) {
      setBulkTiersByProduct({});
      return;
    }
    fetchBulkTiers(items.map((i) => i.id)).then(setBulkTiersByProduct);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.map((i) => i.id).sort().join(",")]);

  // What a line actually pays per unit right now, given its quantity. This
  // is only ever a preview — checkout re-derives the same number
  // server-side from resolve_bulk_unit_price_cents(), which is the number
  // that's actually charged — but computing it the same way here means the
  // preview the shopper sees matches what they'll be charged.
  function effectiveUnitPrice(i: CartItem) {
    const tiers = tiersForLine(bulkTiersByProduct[i.id] ?? [], i.variantId ?? null);
    return tierUnitPriceCents(i.price_cents, tiers, i.quantity);
  }

  // Cart items with their price_cents swapped for the bulk-tiered price —
  // this is what should flow into coupon validation, delivery-charge
  // thresholds, and the order total, so every downstream number (coupon
  // eligibility, free-shipping threshold, total_cents) is consistent with
  // what the server will land on, instead of the coupon math being based
  // on pre-discount totals while the subtotal shown is post-discount.
  const pricedItems: CartItem[] = items.map((i) => ({ ...i, price_cents: effectiveUnitPrice(i) }));

  const subtotal = pricedItems.reduce((s, i) => s + i.price_cents * i.quantity, 0);
  const bulkSavings = items.reduce((s, i) => s + (i.price_cents - effectiveUnitPrice(i)) * i.quantity, 0);
  const discount = appliedCoupon?.valid ? appliedCoupon.discount_cents ?? 0 : 0;

  useEffect(() => {
    getDeliveryInfo().then(setDeliveryInfo);
  }, []);

  useEffect(() => {
    if (!user) {
      setWalletBalance(0);
      return;
    }
    fetchWalletTransactions(user.id).then((tx) => setWalletBalance(sumBalance(tx))).catch(() => setWalletBalance(0));
  }, [user]);

  // Re-quote delivery charge whenever the effective coordinate — a manual
  // pin, or lacking one, the background address-derived guess — or the
  // subtotal changes.
  useEffect(() => {
    if (fulfillment !== "delivery" || !effectiveCoords) {
      setQuote(null);
      setDeliveryBlocked(false);
      return;
    }
    setCheckingQuote(true);
    calculateDeliveryCharge(effectiveCoords.lat, effectiveCoords.lng, subtotal)
      .then((res) => {
        setQuote(res);
        // Just flag it — don't force the shopper onto pickup or lock them out
        // of the Home Delivery tab. They might want to try a different
        // address, or decide to switch to pickup themselves.
        setDeliveryBlocked(!res.eligible);
      })
      .finally(() => setCheckingQuote(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveCoords?.lat, effectiveCoords?.lng, subtotal, fulfillment]);

  useEffect(() => {
    if (items.length === 0) {
      setSuggested([]);
      return;
    }
    fetchOffersForCart(pricedItems, user?.id ?? null).then(setSuggested);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.map((i) => `${i.id}:${i.quantity}`).join(","), user?.id]);

  useEffect(() => {
    if (autoApplyChecked || appliedCoupon?.valid || items.length === 0) return;
    const autoCoupons = suggested.filter((c) => c.visibility === "auto_apply");
    if (autoCoupons.length === 0) return;
    setAutoApplyChecked(true);
    (async () => {
      for (const c of autoCoupons) {
        const result = await validateCoupon(c.code, pricedItems);
        if (result.valid) {
          setAppliedCoupon(result);
          toast.success(`"${c.code}" applied automatically — ${result.message}`);
          break;
        }
      }
    })();
  }, [suggested, items, user, autoApplyChecked, appliedCoupon]);

  async function applyCoupon(code?: string) {
    const target = (code ?? couponInput).trim();
    if (!target) return toast.error("Enter a coupon code");
    setApplying(true);
    const result = await validateCoupon(target, pricedItems);
    setApplying(false);
    if (!result.valid) {
      toast.error(result.message);
      return;
    }
    setAppliedCoupon(result);
    setCouponInput(target);
    toast.success(result.message);
  }

  function removeCoupon() {
    setAppliedCoupon(null);
    setCouponInput("");
  }

  const suggestedForCart = suggested.filter(
    (c) => c.visibility === "visible" && (!c.min_order_cents || subtotal >= c.min_order_cents),
  );

  async function useMyLocation() {
    setLocating(true);
    const loc = await getBrowserLocation();
    setLocating(false);
    if (!loc) {
      toast("Couldn't get your location — you can still enter your address below.", { icon: "📍" });
      return;
    }
    setCoords({ lat: loc.lat, lng: loc.lng });
    setLocationAccuracy(loc.accuracy);
    setDeliveryBlocked(false);
    setAddressCheckFailed(false);
    setAddressApprox(false);
    setAddressCoords(null);
    // Deliberately does NOT touch the address fields — the pin and the
    // typed address are independent. Full address is still required below,
    // regardless of whether a pin is set.
    toast("Location pin set — don't forget to fill in your full address below too.", { icon: "📍" });
    // Anything much wider than a house-sized fix is worth flagging — the
    // pin is still draggable, so this is just steering the shopper to
    // double-check rather than blocking anything.
    if (loc.accuracy > 100) {
      toast(`Your location may be off by about ${Math.round(loc.accuracy)}m — drag the pin on the map to fine-tune it.`, { icon: "📍" });
    }
  }

  function applySavedAddress(addr: UserAddress) {
    setSelectedAddressId(addr.id);
    if (addr.full_name) setName(addr.full_name);
    if (addr.phone) setPhone(addr.phone);
    setAddressLine1(addr.line1);
    setAddressLine2(addr.line2 ?? "");
    setCity(addr.city);
    setStateName(addr.state);
    setPincode(addr.pincode);
    setAddressCheckFailed(false);
    setAddressApprox(false);
    setLocationAccuracy(null);
    if (addr.lat != null && addr.lng != null) {
      // This saved address already carries its own pin (set deliberately,
      // once, back when it was saved) — use it as-is.
      setCoords({ lat: addr.lat, lng: addr.lng });
      setAddressCoords(null);
      setDeliveryBlocked(false);
    } else {
      // Older saved address with no pin — leave the map untouched. The
      // background eligibility check below picks this address up on its
      // own since coords is null; the shopper never has to touch the map.
      setCoords(null);
    }
  }

  function useNewAddress() {
    setSelectedAddressId(null);
    setAddressLine1("");
    setAddressLine2("");
    setCity("");
    setStateName("");
    setPincode("");
    setCoords(null);
    setAddressCoords(null);
    setAddressCheckFailed(false);
    setAddressApprox(false);
  }

  // Once saved addresses load, default to the shopper's default address (or
  // their only one) so checkout starts pre-filled instead of blank.
  useEffect(() => {
    if (selectedAddressId || savedAddresses.length === 0 || fulfillment !== "delivery") return;
    const def = savedAddresses.find((a) => a.is_default) ?? savedAddresses[0];
    applySavedAddress(def);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedAddresses, fulfillment]);

  const typedAddress = [addressLine1, city, stateName, pincode].filter((s) => s.trim()).join(", ");
  // A complete 6-digit Indian PIN code is precise enough to check on its
  // own — city/address-line text being short shouldn't hold that up.
  const hasCompletePincode = /^\d{6}$/.test(pincode.trim());
  // Judged from the address/locality text ALONE (not the pincode digits),
  // with a low bar — plenty of real Indian locality names ("Loni", "Katra",
  // "Sadar") are under 8 characters, and gating on total typed length meant
  // those shoppers never got past "keep typing" no matter how much (or how
  // little, since there wasn't more to type) they typed. Excluding pincode
  // from this count also stops a half-typed, not-yet-valid pincode from
  // counting toward it on its own. The 900ms typing pause in the debounce
  // effect below is what actually limits how often this fires, so a low
  // character bar here is safe rather than reason to keep it high.
  const typedLocalityText = [addressLine1, city, stateName].filter((s) => s.trim()).join(", ");
  const readyToCheck = hasCompletePincode || typedLocalityText.trim().length >= 3;

  // Resolves the typed address to coordinates purely to answer "do we
  // deliver here" in the background — this NEVER sets `coords` and never
  // moves anything on the map. Only ever runs while the shopper hasn't
  // dropped a pin themselves (see the effect below); the moment they do,
  // their pin takes over completely.
  async function checkAddressEligibility(opts: { silent: boolean }) {
    if (!typedAddress) return;
    setAddressChecking(true);
    const result = await forwardGeocode(
      // Only pass the pincode once it's a complete, valid 6-digit code —
      // a partial one ("12") can't match anything as a postal code and
      // would just add noise to the query.
      { line1: addressLine1, city, state: stateName, pincode: hasCompletePincode ? pincode : "" },
      shopLocation ? { lat: shopLocation.lat, lng: shopLocation.lng } : undefined,
    );
    setAddressChecking(false);
    if (!result) {
      setAddressCheckFailed(true);
      setAddressApprox(false);
      setAddressCoords(null);
      if (!opts.silent) {
        toast.error("Couldn't verify that address automatically — drop a pin on the map above to confirm your location.");
      }
      return;
    }
    setAddressCheckFailed(false);
    // forwardGeocode falls back to looser and looser matches (dropping the
    // house number/street, then the locality, etc.) rather than failing
    // outright, since OSM often just doesn't have that level of detail for
    // small towns. `exact` tells us whether it matched everything typed or
    // had to fall back, so we can be honest about how confident this is.
    setAddressApprox(!result.exact);
    setAddressCoords({ lat: result.lat, lng: result.lng });
  }

  // Re-check delivery eligibility in the background as the shopper edits
  // their address — but only while there's no manual pin. The instant one
  // exists (locate-me, drag, or map tap), it's strictly more trustworthy
  // than a guess from typed text, so this backs off entirely rather than
  // fighting it. Including `coords` in the deps also cancels any check
  // still in flight the moment a pin gets dropped mid-debounce.
  useEffect(() => {
    setAddressCheckFailed(false);
    if (fulfillment !== "delivery" || !!coords || !typedAddress || !readyToCheck) return;
    const t = setTimeout(() => checkAddressEligibility({ silent: true }), 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typedAddress, fulfillment, coords]);

  // Autofill City/State the moment the shopper finishes typing a 6-digit
  // pincode — a shopper who leads with the pincode (rather than typing City/
  // State first) previously got nothing back until they'd filled in enough
  // of the rest of the address for the Nominatim address-search to kick in.
  // This uses India Post's own pincode→post-office data instead, which is
  // authoritative for exactly this lookup. Only fills a field that's either
  // blank or still holds what a *previous* pincode lookup put there, so it
  // never overwrites something the shopper typed themselves.
  useEffect(() => {
    if (fulfillment !== "delivery" || !hasCompletePincode) return;
    let cancelled = false;
    lookupPincode(pincode).then((result) => {
      if (cancelled || !result) return;
      const prev = pincodeAutofilledRef.current;
      if (result.city && (city.trim() === "" || city === prev.city)) setCity(result.city);
      if (result.state && (stateName.trim() === "" || stateName === prev.state)) setStateName(result.state);
      pincodeAutofilledRef.current = { city: result.city || prev.city, state: result.state || prev.state };
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pincode, hasCompletePincode, fulfillment]);

  const fulfillmentCharge =
    fulfillment === "pickup" ? deliveryInfo?.pickup_charge_cents ?? 0 : quote?.charge_cents ?? 0;
  const canDeliver = fulfillment === "delivery" ? hasFullAddress && !!effectiveCoords && !!quote?.eligible : true;
  const orderTotal = Math.max(0, subtotal - discount + fulfillmentCharge);

  const maxWallet = Math.min(walletBalance, orderTotal);
  const walletAmountCents = useWallet ? Math.min(maxWallet, Math.round((Number(walletAmountInput) || 0) * 100)) : 0;
  const amountDueNow = Math.max(0, orderTotal - walletAmountCents);

  useEffect(() => {
    // Default the wallet field to "pay everything possible" the first time it's toggled on.
    if (useWallet && !walletAmountInput) {
      setWalletAmountInput((maxWallet / 100).toFixed(2));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useWallet]);

  async function placeOrder() {
    if (!user) {
      toast.error("Please sign in to place an order");
      navigate({ to: "/auth" });
      return;
    }
    if (items.length === 0) return;
    if (PHONE_VERIFICATION_ENABLED && !profile?.phone_verified) {
      toast("Please verify your phone number before placing an order", { icon: "📱" });
      setPhoneDialogOpen(true);
      return;
    }
    if (!name.trim()) {
      toast.error("Please add your name");
      return;
    }
    if (!isValidPhone(phone)) {
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }
    if (fulfillment === "delivery" && !hasFullAddress) {
      toast.error("Please fill in your complete address — address line, city, state, and a 6-digit pincode.");
      return;
    }
    if (fulfillment === "delivery" && (!effectiveCoords || !quote?.eligible)) {
      toast.error(
        addressCheckFailed
          ? "We couldn't confirm delivery for this address automatically — please drop a pin on the map to confirm your location."
          : "Please set a valid delivery address within our delivery area.",
      );
      return;
    }
    setPlacing(true);

    // Re-check the coupon right before charging — never trust the client's
    // cached discount, in case the cart, price, or coupon changed since.
    let finalDiscount = 0;
    let finalCouponCode: string | null = null;
    let couponId: string | undefined;
    if (appliedCoupon?.valid && appliedCoupon.code) {
      const recheck = await validateCoupon(appliedCoupon.code, pricedItems);
      if (!recheck.valid) {
        setPlacing(false);
        toast.error(`Your coupon is no longer valid: ${recheck.message}`);
        setAppliedCoupon(null);
        return;
      }
      finalDiscount = recheck.discount_cents ?? 0;
      finalCouponCode = recheck.code ?? null;
      couponId = recheck.coupon_id;
    }

    // Re-check delivery pricing right before charging too.
    let finalCharge = 0;
    let finalQuote: DeliveryChargeResult | null = null;
    const freshInfo = await getDeliveryInfo();
    if (fulfillment === "delivery" && effectiveCoords) {
      finalQuote = await calculateDeliveryCharge(effectiveCoords.lat, effectiveCoords.lng, subtotal);
      if (!finalQuote.eligible) {
        setPlacing(false);
        setDeliveryBlocked(true);
        toast.error("This address is no longer within our delivery area — try another address or switch to Store Pickup.");
        return;
      }
      finalCharge = finalQuote.charge_cents ?? 0;
    } else {
      finalCharge = freshInfo?.pickup_charge_cents ?? 0;
    }

    const finalTotal = Math.max(0, subtotal - finalDiscount + finalCharge);
    const combinedAddress = [addressLine1, addressLine2, city, stateName, pincode].filter(Boolean).join(", ");
    // Cash on Pickup only exists for Store Pickup — the delivery tab never
    // sets paymentMethod to "cash_on_pickup" in the first place (see the
    // fulfillment toggle above), but this is the single source of truth
    // that actually decides which path the order takes below.
    const isCashOnPickup = fulfillment === "pickup" && paymentMethod === "cash_on_pickup";

    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        customer_email: user.email ?? "",
        customer_name: name,
        shipping_address:
          fulfillment === "delivery"
            ? { address: combinedAddress, line1: addressLine1, line2: addressLine2, city, state: stateName, pincode, phone }
            : { pickup: true, phone },
        subtotal_cents: subtotal,
        discount_cents: finalDiscount,
        coupon_code: finalCouponCode,
        shipping_cents: finalCharge,
        total_cents: finalTotal,
        notes,
        fulfillment_type: fulfillment,
        payment_method: isCashOnPickup ? "cash_on_pickup" : "online",
        delivery_zone_id: fulfillment === "delivery" ? finalQuote?.zone_id ?? null : null,
        delivery_lat: fulfillment === "delivery" ? effectiveCoords?.lat ?? null : null,
        delivery_lng: fulfillment === "delivery" ? effectiveCoords?.lng ?? null : null,
        // `coords` only ever holds a location the shopper explicitly set
        // (GPS "use my location", a map tap, or a pin drag) — never a typed
        // address. So its presence is exactly "was this precise" for
        // admin's purposes; addressCoords (the address-only fallback) never
        // counts as precise even though it's what effectiveCoords ends up
        // using when no pin was set.
        delivery_location_precise: fulfillment === "delivery" ? !!coords : null,
        delivery_distance_km: fulfillment === "delivery" ? finalQuote?.distance_km ?? null : null,
        delivery_instructions_snapshot: fulfillment === "delivery" ? freshInfo?.delivery_instructions ?? null : null,
        pickup_instructions_snapshot: fulfillment === "pickup" ? freshInfo?.pickup_instructions ?? null : null,
      })
      .select()
      .single();
    if (error || !order) {
      setPlacing(false);
      return toast.error(error?.message ?? "Failed to place order");
    }
    const { error: itemsErr } = await supabase.from("order_items").insert(
      items.map((i) => ({
        order_id: order.id,
        product_id: i.id,
        product_name: i.name,
        // The checkout trigger (recompute_order_total) always overwrites
        // this with the server-computed bulk-tiered price regardless of
        // what's sent here — this is just today's best-known price so the
        // row is accurate from the instant it's created, not a value
        // anything downstream actually trusts.
        unit_price_cents: effectiveUnitPrice(i),
        quantity: i.quantity,
        variant_id: i.variantId,
        variant_name: i.variantName,
        sku: i.sku,
      })),
    );
    if (couponId) {
      await supabase.from("coupon_redemptions").insert({
        coupon_id: couponId,
        order_id: order.id,
        user_id: user.id,
        discount_cents: finalDiscount,
        order_total_cents: finalTotal,
      });
    }
    if (itemsErr) {
      setPlacing(false);
      return toast.error(itemsErr.message);
    }

    // Fire-and-forget: lets the store owner know a new order came in
    // (Telegram + admin app push). Never awaited/blocking and never allowed
    // to affect checkout — if it fails, the order itself is already placed.
    fetch("/api/order-notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_id: order.id }),
    }).catch(() => {});

    // Apply wallet credit, if the shopper opted in, before touching Razorpay.
    if (walletAmountCents > 0) {
      const walletResult = await redeemWalletForOrder(order.id, walletAmountCents);
      if (!walletResult.success) {
        toast.error(walletResult.message ?? "Couldn't apply wallet balance — continuing with full payment.");
      }
    }

    clear();
    removeCoupon();
    setPlacing(false);

    if (amountDueNow === 0 && walletAmountCents > 0) {
      // Wallet covered the order in full — redeemWalletForOrder already
      // marked it paid above (whichever payment method was chosen — a
      // fully wallet-paid order is fully paid, cash or not). Calling
      // payForOrder here would just hit "Order is already paid" and show a
      // confusing error toast for what was actually a success, so this
      // check runs before the cash-on-pickup branch below, not after it.
      toast.success("Order placed — paid by wallet. Thank you!");
      navigate({ to: "/orders" });
      return;
    }

    if (isCashOnPickup) {
      // No Razorpay at all for this path — the order is placed and left
      // exactly as-is (payment_status: 'pending'), on purpose. Stock is
      // only ever deducted once payment_status actually becomes 'paid',
      // so this order does not hold its items until staff collect cash in
      // store and mark it paid.
      toast(`Order placed — bring ${formatMoney(amountDueNow)} cash when you pick up. This doesn't reserve your items until it's paid.`, { icon: "🏪" });
      navigate({ to: "/orders" });
      return;
    }

    const result = await payForOrder({
      id: order.id,
      customer_name: name,
      customer_email: user.email,
    });

    if (result.status === "paid") {
      toast.success("Payment received — thank you!");
    } else if (result.status === "dismissed") {
      toast("Order placed — you can pay anytime from My Orders", { icon: "🛒" });
    } else {
      toast.error(result.message);
    }
    navigate({ to: "/orders" });
  }

  const shopLocation = deliveryInfo?.store_locations?.find((s) => s.is_primary) ?? deliveryInfo?.store_locations?.[0];
  const mapCenter = coords ?? (shopLocation ? { lat: shopLocation.lat, lng: shopLocation.lng } : FALLBACK_CENTER);

  return (
    <div className="min-h-screen bg-background">
      <StoreHeader />
      <div className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">Your cart</h1>

        {items.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed p-16 text-center text-muted-foreground">
            Cart is empty.{" "}
            <Link to="/" className="underline">Continue shopping</Link>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="md:col-span-2 space-y-6">
              <div className="space-y-4">
                {items.map((i) => {
                  const tiers = tiersForLine(bulkTiersByProduct[i.id] ?? [], i.variantId ?? null);
                  const unitPrice = effectiveUnitPrice(i);
                  const tier = bestTierFor(tiers, i.quantity);
                  const next = nextTierHint(tiers, i.quantity);
                  // Same coercion the store uses internally to clamp quantity
                  // — reading `i.stock` straight off the item here (bypassing
                  // that coercion) is what let a line with a missing/odd
                  // stock value render a stepper that looked permanently
                  // disabled, since a raw non-number `max` fails a plain
                  // Number.isFinite check downstream.
                  const cap = qtyCap(i);
                  return (
                  <div key={`${i.id}::${i.variantId ?? ""}`} className="flex gap-3 rounded-xl border p-4 sm:gap-4">
                    <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-secondary/60">
                      {i.image_url && <img src={i.image_url} alt="" className="h-full w-full object-cover" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="break-words font-medium">{i.name}</p>
                      {i.sku && <p className="break-words text-xs text-muted-foreground">SKU: {i.sku}</p>}
                      <div className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                        <span className={tier ? "text-foreground font-medium" : ""}>{formatMoney(unitPrice)}</span>
                        {tier && (
                          <>
                            <span className="line-through">{formatMoney(i.price_cents)}</span>
                            <span className="flex items-center gap-1 rounded-full bg-green-100 px-1.5 py-0.5 text-[11px] font-semibold text-green-700">
                              <Layers className="h-2.5 w-2.5" /> {describeTierDiscount(tier)}
                            </span>
                          </>
                        )}
                      </div>
                      {next && next.unitsNeeded <= cap - i.quantity && (
                        <p className="mt-0.5 text-xs font-medium text-primary">
                          Add {next.unitsNeeded} more for {describeTierDiscount(next.tier)}
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-1.5">
                        <QuantityInput
                          value={i.quantity}
                          min={1}
                          max={cap}
                          onChange={(q) => setQty(i.id, q, i.variantId)}
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="ml-auto h-10 w-10 touch-manipulation sm:h-9 sm:w-9"
                          onClick={() => remove(i.id, i.variantId)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-sm font-medium">
                      {formatMoney(unitPrice * i.quantity)}
                    </div>
                  </div>
                  );
                })}
              </div>

              {/* Delivery method */}
              <div className="rounded-xl border p-5 space-y-4">
                <h2 className="font-semibold">Delivery method</h2>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setFulfillment("delivery"); setPaymentMethod("online"); }}
                    className={`flex items-center justify-center gap-2 rounded-lg border p-3 text-sm font-medium transition-colors ${
                      fulfillment === "delivery" ? "border-primary bg-primary/5 text-primary" : "text-muted-foreground"
                    }`}
                  >
                    <Truck className="h-4 w-4" /> Home Delivery
                  </button>
                  <button
                    type="button"
                    onClick={() => setFulfillment("pickup")}
                    className={`flex items-center justify-center gap-2 rounded-lg border p-3 text-sm font-medium transition-colors ${
                      fulfillment === "pickup" ? "border-primary bg-primary/5 text-primary" : "text-muted-foreground"
                    }`}
                  >
                    <Store className="h-4 w-4" /> Store Pickup
                  </button>
                </div>

                {deliveryBlocked && fulfillment === "delivery" && (
                  <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700">
                    We don't deliver to this address{quote?.distance_km != null ? ` — you're about ${quote.distance_km} km away` : ""}. Try a different address, fine-tune the pin, or switch to Store Pickup instead.
                  </p>
                )}

                {fulfillment === "delivery" ? (
                  <div className="space-y-3">
                    {user && savedAddresses.length > 0 && (
                      <div className="space-y-2">
                        <Label>Saved addresses</Label>
                        <div className="flex flex-wrap gap-2">
                          {savedAddresses.map((a) => (
                            <button
                              key={a.id}
                              type="button"
                              onClick={() => applySavedAddress(a)}
                              className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-colors max-w-[220px] ${
                                selectedAddressId === a.id ? "border-primary bg-primary/5" : "hover:bg-secondary/50"
                              }`}
                            >
                              {a.label.toLowerCase() === "work" ? (
                                <Building2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                              ) : (
                                <Home className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                              )}
                              <span>
                                <span className="block font-medium">{a.label}</span>
                                <span className="line-clamp-2 text-muted-foreground">
                                  {a.line1}, {a.city}
                                </span>
                              </span>
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={useNewAddress}
                            className={`flex items-center gap-1.5 rounded-lg border border-dashed px-3 py-2 text-xs transition-colors ${
                              selectedAddressId === null ? "border-primary bg-primary/5" : "hover:bg-secondary/50"
                            }`}
                          >
                            <PencilLine className="h-3.5 w-3.5" /> Use a new address
                          </button>
                        </div>
                      </div>
                    )}
                    <Button type="button" variant="outline" size="sm" onClick={useMyLocation} disabled={locating}>
                      <LocateFixed className="mr-2 h-3.5 w-3.5" />
                      {locating ? "Locating…" : "Use my current location"}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Adding a location on the map is completely optional — it just makes it easy for us to find your exact spot before delivery. Your address below is what actually matters, whether or not you drop a pin.
                    </p>
                    <LeafletMap
                      center={mapCenter}
                      circles={[
                        ...(deliveryInfo?.zones.map((z) => ({ id: z.id, lat: z.lat, lng: z.lng, radiusKm: z.radius_km, label: z.name })) ?? []),
                        // Visualizes GPS uncertainty so it's obvious the pin is an
                        // estimate, not exact — clears itself once the shopper
                        // drags the pin (see onDragEnd/onMapClick).
                        ...(coords && locationAccuracy && locationAccuracy > 30
                          ? [{ id: "accuracy", lat: coords.lat, lng: coords.lng, radiusKm: locationAccuracy / 1000, color: "#94a3b8", label: `~${Math.round(locationAccuracy)}m accuracy` }]
                          : []),
                      ]}
                      markers={[
                        ...(shopLocation ? [{ id: "shop", lat: shopLocation.lat, lng: shopLocation.lng, color: "#16a34a", label: shopLocation.name }] : []),
                        ...(coords ? [{ id: "you", lat: coords.lat, lng: coords.lng, color: "#2454e5", label: "Delivery location", draggable: true, onDragEnd: (lat: number, lng: number) => { setCoords({ lat, lng }); setLocationAccuracy(null); setAddressApprox(false); setAddressCoords(null); } }] : []),
                      ]}
                      onMapClick={(lat, lng) => { setCoords({ lat, lng }); setLocationAccuracy(null); setDeliveryBlocked(false); setAddressApprox(false); setAddressCoords(null); }}
                      height={220}
                    />
                    <p className="text-xs text-muted-foreground">
                      <MapPin className="mr-1 inline h-3 w-3" />
                      Tap the map (or drag the pin) to set your delivery location precisely.
                    </p>
                    <div>
                      <Label htmlFor="addr1">Address line 1</Label>
                      <Textarea id="addr1" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} rows={2} placeholder="House/flat no, street" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Combobox
                        value={city}
                        onChange={setCity}
                        options={INDIAN_CITIES}
                        allowCustomValue
                        placeholder="City"
                        searchPlaceholder="Search city…"
                        emptyText="Not in our shortlist — type to use it anyway."
                      />
                      <Combobox
                        value={stateName}
                        onChange={setStateName}
                        options={INDIAN_STATES}
                        placeholder="State"
                        searchPlaceholder="Search state…"
                        emptyText="No matching state."
                      />
                    </div>
                    <Input placeholder="Pincode" value={pincode} onChange={(e) => setPincode(e.target.value)} />
                    <div>
                      <Label htmlFor="cart-phone">Phone number</Label>
                      <PhoneInput id="cart-phone" value={phone} onChange={setPhone} />
                    </div>

                    {addressChecking && !coords && (
                      <p className="text-xs text-muted-foreground">Checking if we deliver to this address…</p>
                    )}
                    {!addressChecking && !coords && addressCheckFailed && (
                      <div className="flex items-center justify-between gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700">
                        <span>Couldn't verify this address automatically — drop a pin on the map above to confirm your location.</span>
                        <Button type="button" size="sm" variant="outline" className="h-7 flex-shrink-0 text-xs" onClick={() => checkAddressEligibility({ silent: false })}>
                          Retry
                        </Button>
                      </div>
                    )}
                    {!addressChecking && !coords && !addressCheckFailed && !addressCoords && typedAddress.length > 0 && !readyToCheck && (
                      <p className="text-xs text-muted-foreground">Keep typing your full address, or just enter your 6-digit pincode, so we can check delivery availability.</p>
                    )}
                    {checkingQuote && <p className="text-xs text-muted-foreground">Checking delivery availability…</p>}
                    {quote?.eligible && (
                      <div className="rounded-lg bg-green-500/10 px-3 py-2 text-xs text-green-700">
                        Deliverable — {quote.distance_km} km away, in the "{quote.zone_name}" zone.
                        {" "}Charge: {quote.free_delivery_applied ? "Free" : formatMoney(quote.charge_cents ?? 0)}.
                        {deliveryInfo?.delivery_eta_text && ` Est. ${deliveryInfo.delivery_eta_text}.`}
                        {!coords && addressApprox && " This is estimated from your address — drop a pin on the map above if you'd like us to confirm your exact spot."}
                      </div>
                    )}
                    {deliveryInfo?.delivery_instructions && (
                      <p className="text-xs text-muted-foreground">{deliveryInfo.delivery_instructions}</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2 text-sm">
                    {deliveryInfo?.pickup_address && (
                      <p><Store className="mr-1 inline h-3.5 w-3.5" /> {deliveryInfo.pickup_address}</p>
                    )}
                    {deliveryInfo?.pickup_eta_text && (
                      <p className="text-muted-foreground">Est. ready: {deliveryInfo.pickup_eta_text}</p>
                    )}
                    {deliveryInfo?.pickup_instructions && (
                      <p className="text-muted-foreground">{deliveryInfo.pickup_instructions}</p>
                    )}
                    {!!deliveryInfo?.pickup_charge_cents && (
                      <p className="text-muted-foreground">Pickup charge: {formatMoney(deliveryInfo.pickup_charge_cents)}</p>
                    )}
                    <div className="mt-2">
                      <Label htmlFor="pickup-phone">Phone number</Label>
                      <PhoneInput id="pickup-phone" value={phone} onChange={setPhone} />
                    </div>

                    <div className="mt-3 space-y-2">
                      <Label>How will you pay?</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setPaymentMethod("online")}
                          className={`flex items-center justify-center gap-2 rounded-lg border p-2.5 text-xs font-medium transition-colors ${
                            paymentMethod === "online" ? "border-primary bg-primary/5 text-primary" : "text-muted-foreground"
                          }`}
                        >
                          <CreditCard className="h-3.5 w-3.5" /> Pay online now
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentMethod("cash_on_pickup")}
                          className={`flex items-center justify-center gap-2 rounded-lg border p-2.5 text-xs font-medium transition-colors ${
                            paymentMethod === "cash_on_pickup" ? "border-primary bg-primary/5 text-primary" : "text-muted-foreground"
                          }`}
                        >
                          <Banknote className="h-3.5 w-3.5" /> Cash at pickup
                        </button>
                      </div>
                      {paymentMethod === "cash_on_pickup" ? (
                        <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700">
                          <strong>This does not reserve your items.</strong> Stock is only held for orders that are actually paid — an unpaid cash order can be sold to another customer before you arrive. Pay online instead if you want to guarantee stock.
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Paying online now reserves your items immediately.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border p-5 h-fit space-y-4">
              <div className="space-y-2">
                <Label htmlFor="coupon">Coupon code</Label>
                {appliedCoupon?.valid ? (
                  <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary" />
                      <span className="font-mono font-medium">{appliedCoupon.code}</span>
                      <span className="text-muted-foreground">
                        {appliedCoupon.free_shipping ? "— free shipping applied" : "applied"}
                      </span>
                    </div>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={removeCoupon}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      id="coupon"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      placeholder="Enter code"
                      className="font-mono"
                    />
                    <Button type="button" variant="outline" onClick={() => applyCoupon()} disabled={applying}>
                      {applying ? "Checking…" : "Apply"}
                    </Button>
                  </div>
                )}
                {!appliedCoupon?.valid && suggestedForCart.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {suggestedForCart.map((c) => (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => applyCoupon(c.code)}
                        className="inline-flex items-center gap-1 rounded-full border border-dashed border-primary/40 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/5"
                      >
                        <Ticket className="h-3 w-3" /> {c.code} — {describeCoupon(c)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {bulkSavings > 0 && (
                <div className="flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-2 text-xs font-medium text-green-700">
                  <Layers className="h-3.5 w-3.5" /> You're saving {formatMoney(bulkSavings)} with bulk pricing (already reflected in the price below)
                </div>
              )}

              <div className="border-t pt-4 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span className="font-medium">{formatMoney(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm text-primary">
                    <span>Discount</span>
                    <span className="font-medium">-{formatMoney(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span>{fulfillment === "pickup" ? "Pickup charge" : "Delivery charge"}</span>
                  <span className="font-medium">{fulfillmentCharge > 0 ? formatMoney(fulfillmentCharge) : "Free"}</span>
                </div>
                <div className="flex justify-between text-base font-semibold pt-1">
                  <span>Total</span>
                  <span>{formatMoney(orderTotal)}</span>
                </div>
              </div>

              {user && walletBalance > 0 && (
                <div className="border-t pt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="use-wallet" className="flex items-center gap-1.5">
                      <Wallet className="h-3.5 w-3.5" /> Use wallet balance ({formatMoney(walletBalance)})
                    </Label>
                    <Switch id="use-wallet" checked={useWallet} onCheckedChange={setUseWallet} />
                  </div>
                  {useWallet && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        max={maxWallet / 100}
                        step="0.01"
                        value={walletAmountInput}
                        onChange={(e) => setWalletAmountInput(e.target.value)}
                        className="h-9"
                      />
                      <span className="whitespace-nowrap text-xs text-muted-foreground">of {formatMoney(maxWallet)} max</span>
                    </div>
                  )}
                  {useWallet && walletAmountCents > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {fulfillment === "pickup" && paymentMethod === "cash_on_pickup" ? "Remaining — cash at pickup" : "Amount to pay now"}
                      </span>
                      <span className="font-semibold">{formatMoney(amountDueNow)}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="border-t pt-4 space-y-3">
                <div>
                  <Label htmlFor="cn">Full name</Label>
                  <Input id="cn" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="cnn">Notes (optional)</Label>
                  <Textarea id="cnn" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
                </div>
              </div>
              {PHONE_VERIFICATION_ENABLED && user && !profile?.phone_verified && (
                <button
                  type="button"
                  onClick={() => setPhoneDialogOpen(true)}
                  className="flex w-full items-center justify-between rounded-lg bg-amber-500/10 px-3 py-2 text-left text-xs text-amber-700"
                >
                  <span>Verify your phone number before ordering</span>
                  <span className="font-semibold underline">Verify now</span>
                </button>
              )}
              <Button className="w-full" onClick={placeOrder} disabled={placing || !canDeliver}>
                {placing
                  ? "Placing order…"
                  : fulfillment === "pickup" && paymentMethod === "cash_on_pickup"
                    ? "Place order — pay cash at pickup"
                    : amountDueNow === 0 && walletAmountCents > 0
                      ? "Place order — paid by wallet"
                      : "Place order & pay"}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                {fulfillment === "pickup" && paymentMethod === "cash_on_pickup"
                  ? "No payment now — pay cash when you collect your order. Your items aren't reserved until it's paid."
                  : "Secure payment via Razorpay. You can also pay later from \"My orders\" if you close the payment window."}
              </p>
            </div>
          </div>
        )}
      </div>
      <StoreFooter />
      {PHONE_VERIFICATION_ENABLED && (
        <PhoneVerifyDialog
          open={phoneDialogOpen}
          onOpenChange={setPhoneDialogOpen}
          defaultPhone={phone || profile?.phone}
          onVerified={refreshProfile}
        />
      )}
    </div>
  );
}
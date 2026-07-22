import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Minus, Plus, Trash2, Ticket, X, Check, MapPin, Store, Truck, LocateFixed, Wallet } from "lucide-react";
import { toast } from "sonner";
import { StoreHeader } from "@/components/StoreHeader";
import { StoreFooter } from "@/components/StoreFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { LeafletMap } from "@/components/LeafletMap";
import { useCart, formatMoney } from "@/stores/cart";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { payForOrder } from "@/lib/razorpay";
import { validateCoupon, fetchOffersForCart, describeCoupon, type CouponValidationResult, type VisibleCoupon } from "@/lib/coupons";
import {
  getBrowserLocation,
  reverseGeocode,
  forwardGeocode,
  getDeliveryInfo,
  calculateDeliveryCharge,
  type DeliveryInfo,
  type DeliveryChargeResult,
} from "@/lib/delivery";
import { fetchWalletTransactions, sumBalance, redeemWalletForOrder } from "@/lib/wallet";
import { PhoneVerifyDialog } from "@/components/PhoneVerifyDialog";
import { PHONE_VERIFICATION_ENABLED } from "@/lib/phoneVerification";
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
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [pincode, setPincode] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  // Tracks *why* coords is set: "typed" means it came from auto-geocoding the
  // address fields (so it's safe to keep re-geocoding as the shopper keeps
  // typing), "manual" means the shopper explicitly placed it (locate-me,
  // dragging the pin, or tapping the map) and typing should no longer move it.
  const coordsSourceRef = useRef<"typed" | "manual" | null>(null);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [addressGeocoding, setAddressGeocoding] = useState(false);
  const [addressGeocodeFailed, setAddressGeocodeFailed] = useState(false);
  const [addressApprox, setAddressApprox] = useState(false);
  const [quote, setQuote] = useState<DeliveryChargeResult | null>(null);
  const [checkingQuote, setCheckingQuote] = useState(false);
  const [deliveryBlocked, setDeliveryBlocked] = useState(false);

  // ---- Wallet -------------------------------------------------------------
  const [walletBalance, setWalletBalance] = useState(0);
  const [useWallet, setUseWallet] = useState(false);
  const [walletAmountInput, setWalletAmountInput] = useState("");

  const subtotal = items.reduce((s, i) => s + i.price_cents * i.quantity, 0);
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

  // Re-quote delivery charge whenever coordinates or subtotal change.
  useEffect(() => {
    if (fulfillment !== "delivery" || !coords) {
      setQuote(null);
      return;
    }
    setCheckingQuote(true);
    calculateDeliveryCharge(coords.lat, coords.lng, subtotal)
      .then((res) => {
        setQuote(res);
        if (!res.eligible) {
          setDeliveryBlocked(true);
          setFulfillment("pickup");
        }
      })
      .finally(() => setCheckingQuote(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords?.lat, coords?.lng, subtotal, fulfillment]);

  useEffect(() => {
    if (items.length === 0) {
      setSuggested([]);
      return;
    }
    fetchOffersForCart(items, user?.id ?? null).then(setSuggested);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.map((i) => `${i.id}:${i.quantity}`).join(","), user?.id]);

  useEffect(() => {
    if (autoApplyChecked || appliedCoupon?.valid || items.length === 0) return;
    const autoCoupons = suggested.filter((c) => c.visibility === "auto_apply");
    if (autoCoupons.length === 0) return;
    setAutoApplyChecked(true);
    (async () => {
      for (const c of autoCoupons) {
        const result = await validateCoupon(c.code, user?.id ?? null, items);
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
    const result = await validateCoupon(target, user?.id ?? null, items);
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
      toast("Couldn't get your location — enter your address below instead.", { icon: "📍" });
      return;
    }
    coordsSourceRef.current = "manual";
    setCoords({ lat: loc.lat, lng: loc.lng });
    setLocationAccuracy(loc.accuracy);
    setDeliveryBlocked(false);
    setAddressGeocodeFailed(false);
    setAddressApprox(false);
    // Fill every field the reverse geocode could resolve — previously this
    // only ever touched address line 1, so City/State/Pincode stayed blank
    // (and looked "unfetched") even though Nominatim often does have that
    // level of detail, just not the exact house/street.
    const result = await reverseGeocode(loc.lat, loc.lng);
    if (result) {
      if (result.line1) setAddressLine1(result.line1);
      if (result.city) setCity(result.city);
      if (result.state) setStateName(result.state);
      if (result.pincode) setPincode(result.pincode);
    }
    // Anything much wider than a house-sized fix is worth flagging — the
    // pin is still draggable, so this is just steering the shopper to
    // double-check rather than blocking anything.
    if (loc.accuracy > 100) {
      toast(`Your location may be off by about ${Math.round(loc.accuracy)}m — drag the pin on the map to fine-tune it.`, { icon: "📍" });
    }
  }

  const typedAddress = [addressLine1, city, stateName, pincode].filter((s) => s.trim()).join(", ");

  async function locateTypedAddress(opts: { silent: boolean }) {
    if (!typedAddress) return;
    setAddressGeocoding(true);
    const result = await forwardGeocode(
      { line1: addressLine1, city, state: stateName, pincode },
      shopLocation ? { lat: shopLocation.lat, lng: shopLocation.lng } : undefined,
    );
    setAddressGeocoding(false);
    if (!result) {
      setAddressGeocodeFailed(true);
      setAddressApprox(false);
      if (!opts.silent) {
        toast.error("Couldn't locate that address automatically — please set it on the map instead.");
      }
      return;
    }
    setAddressGeocodeFailed(false);
    // forwardGeocode falls back to looser and looser matches (dropping the
    // house number/street, then the locality, etc.) rather than failing
    // outright, since OSM often just doesn't have that level of detail for
    // small towns. `exact` tells us whether it matched everything typed or
    // had to fall back, so we can be honest with the shopper about it.
    setAddressApprox(!result.exact);
    setLocationAccuracy(null);
    coordsSourceRef.current = "typed";
    setCoords({ lat: result.lat, lng: result.lng });
    setDeliveryBlocked(false);
  }

  // Auto-detect coordinates as someone types/edits their address by hand.
  // Keeps re-fetching on every debounced change so the pin stays in sync
  // while they keep typing, but backs off once the shopper has manually
  // placed the pin themselves (locate-me, drag, or map tap) so it never
  // overwrites a fix they've already fine-tuned.
  useEffect(() => {
    setAddressGeocodeFailed(false);
    if (fulfillment !== "delivery" || coordsSourceRef.current === "manual" || !typedAddress || typedAddress.length < 8) return;
    const t = setTimeout(() => locateTypedAddress({ silent: true }), 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typedAddress, fulfillment]);

  const fulfillmentCharge =
    fulfillment === "pickup" ? deliveryInfo?.pickup_charge_cents ?? 0 : quote?.charge_cents ?? 0;
  const canDeliver = fulfillment === "delivery" ? !!coords && !!quote?.eligible : true;
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
    if (fulfillment === "delivery" && (!addressLine1.trim() || !coords || !quote?.eligible)) {
      toast.error("Please set a valid delivery address within our delivery area");
      return;
    }
    setPlacing(true);

    // Re-check the coupon right before charging — never trust the client's
    // cached discount, in case the cart, price, or coupon changed since.
    let finalDiscount = 0;
    let finalCouponCode: string | null = null;
    let couponId: string | undefined;
    if (appliedCoupon?.valid && appliedCoupon.code) {
      const recheck = await validateCoupon(appliedCoupon.code, user.id, items);
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
    if (fulfillment === "delivery" && coords) {
      finalQuote = await calculateDeliveryCharge(coords.lat, coords.lng, subtotal);
      if (!finalQuote.eligible) {
        setPlacing(false);
        toast.error("This address is no longer within our delivery area — please choose Store Pickup.");
        setFulfillment("pickup");
        setDeliveryBlocked(true);
        return;
      }
      finalCharge = finalQuote.charge_cents ?? 0;
    } else {
      finalCharge = freshInfo?.pickup_charge_cents ?? 0;
    }

    const finalTotal = Math.max(0, subtotal - finalDiscount + finalCharge);
    const combinedAddress = [addressLine1, addressLine2, city, stateName, pincode].filter(Boolean).join(", ");

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
        delivery_zone_id: fulfillment === "delivery" ? finalQuote?.zone_id ?? null : null,
        delivery_lat: fulfillment === "delivery" ? coords?.lat ?? null : null,
        delivery_lng: fulfillment === "delivery" ? coords?.lng ?? null : null,
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
        unit_price_cents: i.price_cents,
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
          <div className="mt-8 grid gap-8 md:grid-cols-3">
            <div className="md:col-span-2 space-y-6">
              <div className="space-y-4">
                {items.map((i) => (
                  <div key={`${i.id}::${i.variantId ?? ""}`} className="flex gap-3 rounded-xl border p-4 sm:gap-4">
                    <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-secondary/60">
                      {i.image_url && <img src={i.image_url} alt="" className="h-full w-full object-cover" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{i.name}</p>
                      {i.sku && <p className="text-xs text-muted-foreground">SKU: {i.sku}</p>}
                      <p className="text-sm text-muted-foreground">
                        {formatMoney(i.price_cents)}
                      </p>
                      <div className="mt-2 flex items-center gap-1.5">
                        <Button size="icon" variant="outline" className="h-9 w-9" onClick={() => setQty(i.id, i.quantity - 1, i.variantId)}>
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <span className="w-7 text-center text-sm">{i.quantity}</span>
                        <Button size="icon" variant="outline" className="h-9 w-9" onClick={() => setQty(i.id, i.quantity + 1, i.variantId)}>
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="ml-auto h-9 w-9" onClick={() => remove(i.id, i.variantId)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-sm font-medium">
                      {formatMoney(i.price_cents * i.quantity)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Delivery method */}
              <div className="rounded-xl border p-5 space-y-4">
                <h2 className="font-semibold">Delivery method</h2>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFulfillment("delivery")}
                    disabled={deliveryBlocked}
                    className={`flex items-center justify-center gap-2 rounded-lg border p-3 text-sm font-medium transition-colors ${
                      fulfillment === "delivery" ? "border-primary bg-primary/5 text-primary" : "text-muted-foreground"
                    } ${deliveryBlocked ? "cursor-not-allowed opacity-40" : ""}`}
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

                {deliveryBlocked && (
                  <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700">
                    Home delivery isn't available at this address, so we've switched you to Store Pickup.
                    {quote?.distance_km != null && ` You're about ${quote.distance_km} km from our delivery area.`}
                  </p>
                )}

                {fulfillment === "delivery" ? (
                  <div className="space-y-3">
                    <Button type="button" variant="outline" size="sm" onClick={useMyLocation} disabled={locating}>
                      <LocateFixed className="mr-2 h-3.5 w-3.5" />
                      {locating ? "Locating…" : "Use my current location"}
                    </Button>
                    <LeafletMap
                      center={mapCenter}
                      circles={[
                        ...(deliveryInfo?.zones.map((z) => ({ id: z.id, lat: z.lat, lng: z.lng, radiusKm: z.radius_km, label: z.name })) ?? []),
                        // Visualizes GPS uncertainty so it's obvious the pin is an
                        // estimate, not exact — clears itself once the shopper
                        // manually places/drags the pin (see onDragEnd/onMapClick).
                        ...(coords && locationAccuracy && locationAccuracy > 30
                          ? [{ id: "accuracy", lat: coords.lat, lng: coords.lng, radiusKm: locationAccuracy / 1000, color: "#94a3b8", label: `~${Math.round(locationAccuracy)}m accuracy` }]
                          : []),
                      ]}
                      markers={[
                        ...(shopLocation ? [{ id: "shop", lat: shopLocation.lat, lng: shopLocation.lng, color: "#16a34a", label: shopLocation.name }] : []),
                        ...(coords ? [{ id: "you", lat: coords.lat, lng: coords.lng, color: "#2454e5", label: "Delivery location", draggable: true, onDragEnd: (lat: number, lng: number) => { coordsSourceRef.current = "manual"; setCoords({ lat, lng }); setLocationAccuracy(null); setAddressApprox(false); } }] : []),
                      ]}
                      onMapClick={(lat, lng) => { coordsSourceRef.current = "manual"; setCoords({ lat, lng }); setLocationAccuracy(null); setDeliveryBlocked(false); setAddressApprox(false); }}
                      height={220}
                    />
                    <p className="text-xs text-muted-foreground">
                      <MapPin className="mr-1 inline h-3 w-3" />
                      Tap the map (or drag the pin) to fine-tune your delivery location.
                    </p>
                    <div>
                      <Label htmlFor="addr1">Address line 1</Label>
                      <Textarea id="addr1" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} rows={2} placeholder="House/flat no, street" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
                      <Input placeholder="State" value={stateName} onChange={(e) => setStateName(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="Pincode" value={pincode} onChange={(e) => setPincode(e.target.value)} />
                      <Input placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} />
                    </div>

                    {addressGeocoding && (
                      <p className="text-xs text-muted-foreground">Locating your address…</p>
                    )}
                    {!addressGeocoding && !coords && addressGeocodeFailed && (
                      <div className="flex items-center justify-between gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700">
                        <span>Couldn't locate that address automatically — please set it by tapping the map above.</span>
                        <Button type="button" size="sm" variant="outline" className="h-7 flex-shrink-0 text-xs" onClick={() => locateTypedAddress({ silent: false })}>
                          Retry
                        </Button>
                      </div>
                    )}
                    {!addressGeocoding && !coords && !addressGeocodeFailed && typedAddress.length > 0 && typedAddress.length < 8 && (
                      <p className="text-xs text-muted-foreground">Keep typing your full address so we can locate it.</p>
                    )}
                    {!addressGeocoding && coords && addressApprox && (
                      <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700">
                        We placed the pin near your area, not your exact address — drag it on the map above to fine-tune it.
                      </p>
                    )}
                    {checkingQuote && <p className="text-xs text-muted-foreground">Checking delivery availability…</p>}
                    {quote?.eligible && (
                      <div className="rounded-lg bg-green-500/10 px-3 py-2 text-xs text-green-700">
                        Deliverable — {quote.distance_km} km away, in the "{quote.zone_name}" zone.
                        {" "}Charge: {quote.free_delivery_applied ? "Free" : formatMoney(quote.charge_cents ?? 0)}.
                        {deliveryInfo?.delivery_eta_text && ` Est. ${deliveryInfo.delivery_eta_text}.`}
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
                    <Input placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-2" />
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
                      <span className="text-muted-foreground">Amount to pay now</span>
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
                {placing ? "Placing order…" : amountDueNow === 0 && walletAmountCents > 0 ? "Place order — paid by wallet" : "Place order & pay"}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Secure payment via Razorpay. You can also pay later from "My orders" if you close the payment window.
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
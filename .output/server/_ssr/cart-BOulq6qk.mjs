import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { n as useCart, t as formatMoney } from "./cart-e0HpVhNN.mjs";
import { c as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { t as Button } from "./button-BNPKdh9r.mjs";
import { t as supabase } from "./client-C6ZaJElq.mjs";
import { c as useAuth } from "./useAuth-wDRVmRFv.mjs";
import { _ as useNavigate, g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { H as MapPin, K as LocateFixed, c as Truck, d as Trash2, gt as Check, h as Store, i as Wallet, j as Plus, n as X, p as Ticket, z as Minus } from "../_libs/lucide-react.mjs";
import { n as StoreHeader } from "./StoreHeader-BzV31mqn.mjs";
import { t as StoreFooter } from "./StoreFooter-SqAQEeLg.mjs";
import { t as Input } from "./input-fWD4AjO2.mjs";
import { t as Label } from "./label-RYLdB5Mm.mjs";
import { t as Textarea } from "./textarea-BMjH46cN.mjs";
import { t as Switch } from "./switch-B_mOGtgs.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { a as reverseGeocode, i as getDeliveryInfo, n as calculateDeliveryCharge, r as getBrowserLocation, t as LeafletMap } from "./delivery-IvurY_5s.mjs";
import { i as sumBalance, n as fetchWalletTransactions, r as redeemWalletForOrder } from "./wallet-i5A9tLwA.mjs";
import { t as payForOrder } from "./razorpay-CLuPmmfq.mjs";
import { a as validateCoupon, r as fetchOffersForCart, t as describeCoupon } from "./coupons-CAkuEXl3.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/cart-BOulq6qk.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var FALLBACK_CENTER = {
	lat: 20.5937,
	lng: 78.9629
};
function CartPage() {
	const items = useCart((s) => s.items);
	const setQty = useCart((s) => s.setQty);
	const remove = useCart((s) => s.remove);
	const clear = useCart((s) => s.clear);
	const { user } = useAuth();
	const navigate = useNavigate();
	const [name, setName] = (0, import_react.useState)("");
	const [phone, setPhone] = (0, import_react.useState)("");
	const [notes, setNotes] = (0, import_react.useState)("");
	const [placing, setPlacing] = (0, import_react.useState)(false);
	const [couponInput, setCouponInput] = (0, import_react.useState)("");
	const [applying, setApplying] = (0, import_react.useState)(false);
	const [appliedCoupon, setAppliedCoupon] = (0, import_react.useState)(null);
	const [suggested, setSuggested] = (0, import_react.useState)([]);
	const [autoApplyChecked, setAutoApplyChecked] = (0, import_react.useState)(false);
	const [deliveryInfo, setDeliveryInfo] = (0, import_react.useState)(null);
	const [fulfillment, setFulfillment] = (0, import_react.useState)("delivery");
	const [addressLine1, setAddressLine1] = (0, import_react.useState)("");
	const [addressLine2, setAddressLine2] = (0, import_react.useState)("");
	const [city, setCity] = (0, import_react.useState)("");
	const [stateName, setStateName] = (0, import_react.useState)("");
	const [pincode, setPincode] = (0, import_react.useState)("");
	const [coords, setCoords] = (0, import_react.useState)(null);
	const [locating, setLocating] = (0, import_react.useState)(false);
	const [quote, setQuote] = (0, import_react.useState)(null);
	const [checkingQuote, setCheckingQuote] = (0, import_react.useState)(false);
	const [deliveryBlocked, setDeliveryBlocked] = (0, import_react.useState)(false);
	const [walletBalance, setWalletBalance] = (0, import_react.useState)(0);
	const [useWallet, setUseWallet] = (0, import_react.useState)(false);
	const [walletAmountInput, setWalletAmountInput] = (0, import_react.useState)("");
	const subtotal = items.reduce((s, i) => s + i.price_cents * i.quantity, 0);
	const discount = appliedCoupon?.valid ? appliedCoupon.discount_cents ?? 0 : 0;
	(0, import_react.useEffect)(() => {
		getDeliveryInfo().then(setDeliveryInfo);
	}, []);
	(0, import_react.useEffect)(() => {
		if (!user) {
			setWalletBalance(0);
			return;
		}
		fetchWalletTransactions(user.id).then((tx) => setWalletBalance(sumBalance(tx))).catch(() => setWalletBalance(0));
	}, [user]);
	(0, import_react.useEffect)(() => {
		if (fulfillment !== "delivery" || !coords) {
			setQuote(null);
			return;
		}
		setCheckingQuote(true);
		calculateDeliveryCharge(coords.lat, coords.lng, subtotal).then((res) => {
			setQuote(res);
			if (!res.eligible) {
				setDeliveryBlocked(true);
				setFulfillment("pickup");
			}
		}).finally(() => setCheckingQuote(false));
	}, [
		coords?.lat,
		coords?.lng,
		subtotal,
		fulfillment
	]);
	(0, import_react.useEffect)(() => {
		if (items.length === 0) {
			setSuggested([]);
			return;
		}
		fetchOffersForCart(items, user?.id ?? null).then(setSuggested);
	}, [items.map((i) => `${i.id}:${i.quantity}`).join(","), user?.id]);
	(0, import_react.useEffect)(() => {
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
	}, [
		suggested,
		items,
		user,
		autoApplyChecked,
		appliedCoupon
	]);
	async function applyCoupon(code) {
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
	const suggestedForCart = suggested.filter((c) => c.visibility === "visible" && (!c.min_order_cents || subtotal >= c.min_order_cents));
	async function useMyLocation() {
		setLocating(true);
		const loc = await getBrowserLocation();
		setLocating(false);
		if (!loc) {
			toast("Couldn't get your location — enter your address below instead.", { icon: "📍" });
			return;
		}
		setCoords(loc);
		setDeliveryBlocked(false);
		const address = await reverseGeocode(loc.lat, loc.lng);
		if (address) setAddressLine1(address);
	}
	const fulfillmentCharge = fulfillment === "pickup" ? deliveryInfo?.pickup_charge_cents ?? 0 : quote?.charge_cents ?? 0;
	const canDeliver = fulfillment === "delivery" ? !!coords && !!quote?.eligible : true;
	const orderTotal = Math.max(0, subtotal - discount + fulfillmentCharge);
	const maxWallet = Math.min(walletBalance, orderTotal);
	const walletAmountCents = useWallet ? Math.min(maxWallet, Math.round((Number(walletAmountInput) || 0) * 100)) : 0;
	const amountDueNow = Math.max(0, orderTotal - walletAmountCents);
	(0, import_react.useEffect)(() => {
		if (useWallet && !walletAmountInput) setWalletAmountInput((maxWallet / 100).toFixed(2));
	}, [useWallet]);
	async function placeOrder() {
		if (!user) {
			toast.error("Please sign in to place an order");
			navigate({ to: "/auth" });
			return;
		}
		if (items.length === 0) return;
		if (!name.trim()) {
			toast.error("Please add your name");
			return;
		}
		if (fulfillment === "delivery" && (!addressLine1.trim() || !coords || !quote?.eligible)) {
			toast.error("Please set a valid delivery address within our delivery area");
			return;
		}
		setPlacing(true);
		let finalDiscount = 0;
		let finalCouponCode = null;
		let couponId;
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
		let finalCharge = 0;
		let finalQuote = null;
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
		} else finalCharge = freshInfo?.pickup_charge_cents ?? 0;
		const finalTotal = Math.max(0, subtotal - finalDiscount + finalCharge);
		const combinedAddress = [
			addressLine1,
			addressLine2,
			city,
			stateName,
			pincode
		].filter(Boolean).join(", ");
		const { data: order, error } = await supabase.from("orders").insert({
			user_id: user.id,
			customer_email: user.email ?? "",
			customer_name: name,
			shipping_address: fulfillment === "delivery" ? {
				address: combinedAddress,
				line1: addressLine1,
				line2: addressLine2,
				city,
				state: stateName,
				pincode,
				phone
			} : {
				pickup: true,
				phone
			},
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
			pickup_instructions_snapshot: fulfillment === "pickup" ? freshInfo?.pickup_instructions ?? null : null
		}).select().single();
		if (error || !order) {
			setPlacing(false);
			return toast.error(error?.message ?? "Failed to place order");
		}
		const { error: itemsErr } = await supabase.from("order_items").insert(items.map((i) => ({
			order_id: order.id,
			product_id: i.id,
			product_name: i.name,
			unit_price_cents: i.price_cents,
			quantity: i.quantity,
			variant_id: i.variantId,
			variant_name: i.variantName,
			sku: i.sku
		})));
		if (couponId) await supabase.from("coupon_redemptions").insert({
			coupon_id: couponId,
			order_id: order.id,
			user_id: user.id,
			discount_cents: finalDiscount,
			order_total_cents: finalTotal
		});
		if (itemsErr) {
			setPlacing(false);
			return toast.error(itemsErr.message);
		}
		if (walletAmountCents > 0) {
			const walletResult = await redeemWalletForOrder(order.id, walletAmountCents);
			if (!walletResult.success) toast.error(walletResult.message ?? "Couldn't apply wallet balance — continuing with full payment.");
		}
		clear();
		removeCoupon();
		setPlacing(false);
		const result = await payForOrder({
			id: order.id,
			customer_name: name,
			customer_email: user.email
		});
		if (result.status === "paid") toast.success("Payment received — thank you!");
		else if (result.status === "dismissed") toast("Order placed — you can pay anytime from My Orders", { icon: "🛒" });
		else toast.error(result.message);
		navigate({ to: "/orders" });
	}
	const shopLocation = deliveryInfo?.store_locations?.find((s) => s.is_primary) ?? deliveryInfo?.store_locations?.[0];
	const mapCenter = coords ?? (shopLocation ? {
		lat: shopLocation.lat,
		lng: shopLocation.lng
	} : FALLBACK_CENTER);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-screen bg-background",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StoreHeader, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mx-auto max-w-5xl px-6 py-10",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-2xl font-semibold tracking-tight",
					children: "Your cart"
				}), items.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-8 rounded-2xl border border-dashed p-16 text-center text-muted-foreground",
					children: [
						"Cart is empty.",
						" ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/",
							className: "underline",
							children: "Continue shopping"
						})
					]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-8 grid gap-8 md:grid-cols-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "md:col-span-2 space-y-6",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "space-y-4",
							children: items.map((i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex gap-3 rounded-xl border p-4 sm:gap-4",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-secondary/60",
										children: i.image_url && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
											src: i.image_url,
											alt: "",
											className: "h-full w-full object-cover"
										})
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "min-w-0 flex-1",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "truncate font-medium",
												children: i.name
											}),
											i.sku && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
												className: "text-xs text-muted-foreground",
												children: ["SKU: ", i.sku]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "text-sm text-muted-foreground",
												children: formatMoney(i.price_cents)
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "mt-2 flex items-center gap-1.5",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
														size: "icon",
														variant: "outline",
														className: "h-9 w-9",
														onClick: () => setQty(i.id, i.quantity - 1, i.variantId),
														children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Minus, { className: "h-3.5 w-3.5" })
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "w-7 text-center text-sm",
														children: i.quantity
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
														size: "icon",
														variant: "outline",
														className: "h-9 w-9",
														onClick: () => setQty(i.id, i.quantity + 1, i.variantId),
														children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-3.5 w-3.5" })
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
														size: "icon",
														variant: "ghost",
														className: "ml-auto h-9 w-9",
														onClick: () => remove(i.id, i.variantId),
														children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-3.5 w-3.5" })
													})
												]
											})
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "flex-shrink-0 text-sm font-medium",
										children: formatMoney(i.price_cents * i.quantity)
									})
								]
							}, `${i.id}::${i.variantId ?? ""}`))
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-xl border p-5 space-y-4",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
									className: "font-semibold",
									children: "Delivery method"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "grid grid-cols-2 gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										onClick: () => setFulfillment("delivery"),
										disabled: deliveryBlocked,
										className: `flex items-center justify-center gap-2 rounded-lg border p-3 text-sm font-medium transition-colors ${fulfillment === "delivery" ? "border-primary bg-primary/5 text-primary" : "text-muted-foreground"} ${deliveryBlocked ? "cursor-not-allowed opacity-40" : ""}`,
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Truck, { className: "h-4 w-4" }), " Home Delivery"]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										onClick: () => setFulfillment("pickup"),
										className: `flex items-center justify-center gap-2 rounded-lg border p-3 text-sm font-medium transition-colors ${fulfillment === "pickup" ? "border-primary bg-primary/5 text-primary" : "text-muted-foreground"}`,
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Store, { className: "h-4 w-4" }), " Store Pickup"]
									})]
								}),
								deliveryBlocked && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700",
									children: ["Home delivery isn't available at this address, so we've switched you to Store Pickup.", quote?.distance_km != null && ` You're about ${quote.distance_km} km from our delivery area.`]
								}),
								fulfillment === "delivery" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "space-y-3",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
											type: "button",
											variant: "outline",
											size: "sm",
											onClick: useMyLocation,
											disabled: locating,
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LocateFixed, { className: "mr-2 h-3.5 w-3.5" }), locating ? "Locating…" : "Use my current location"]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LeafletMap, {
											center: mapCenter,
											circles: deliveryInfo?.zones.map((z) => ({
												id: z.id,
												lat: z.lat,
												lng: z.lng,
												radiusKm: z.radius_km,
												label: z.name
											})) ?? [],
											markers: [...shopLocation ? [{
												id: "shop",
												lat: shopLocation.lat,
												lng: shopLocation.lng,
												color: "#16a34a",
												label: shopLocation.name
											}] : [], ...coords ? [{
												id: "you",
												lat: coords.lat,
												lng: coords.lng,
												color: "#2454e5",
												label: "Delivery location",
												draggable: true,
												onDragEnd: (lat, lng) => setCoords({
													lat,
													lng
												})
											}] : []],
											onMapClick: (lat, lng) => {
												setCoords({
													lat,
													lng
												});
												setDeliveryBlocked(false);
											},
											height: 220
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
											className: "text-xs text-muted-foreground",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MapPin, { className: "mr-1 inline h-3 w-3" }), "Tap the map (or drag the pin) to fine-tune your delivery location."]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
											htmlFor: "addr1",
											children: "Address line 1"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
											id: "addr1",
											value: addressLine1,
											onChange: (e) => setAddressLine1(e.target.value),
											rows: 2,
											placeholder: "House/flat no, street"
										})] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "grid grid-cols-2 gap-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
												placeholder: "City",
												value: city,
												onChange: (e) => setCity(e.target.value)
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
												placeholder: "State",
												value: stateName,
												onChange: (e) => setStateName(e.target.value)
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "grid grid-cols-2 gap-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
												placeholder: "Pincode",
												value: pincode,
												onChange: (e) => setPincode(e.target.value)
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
												placeholder: "Phone number",
												value: phone,
												onChange: (e) => setPhone(e.target.value)
											})]
										}),
										checkingQuote && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-xs text-muted-foreground",
											children: "Checking delivery availability…"
										}),
										quote?.eligible && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "rounded-lg bg-green-500/10 px-3 py-2 text-xs text-green-700",
											children: [
												"Deliverable — ",
												quote.distance_km,
												" km away, in the \"",
												quote.zone_name,
												"\" zone.",
												" ",
												"Charge: ",
												quote.free_delivery_applied ? "Free" : formatMoney(quote.charge_cents ?? 0),
												".",
												deliveryInfo?.delivery_eta_text && ` Est. ${deliveryInfo.delivery_eta_text}.`
											]
										}),
										deliveryInfo?.delivery_instructions && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-xs text-muted-foreground",
											children: deliveryInfo.delivery_instructions
										})
									]
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "space-y-2 text-sm",
									children: [
										deliveryInfo?.pickup_address && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Store, { className: "mr-1 inline h-3.5 w-3.5" }),
											" ",
											deliveryInfo.pickup_address
										] }),
										deliveryInfo?.pickup_eta_text && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
											className: "text-muted-foreground",
											children: ["Est. ready: ", deliveryInfo.pickup_eta_text]
										}),
										deliveryInfo?.pickup_instructions && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-muted-foreground",
											children: deliveryInfo.pickup_instructions
										}),
										!!deliveryInfo?.pickup_charge_cents && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
											className: "text-muted-foreground",
											children: ["Pickup charge: ", formatMoney(deliveryInfo.pickup_charge_cents)]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											placeholder: "Phone number",
											value: phone,
											onChange: (e) => setPhone(e.target.value),
											className: "mt-2"
										})
									]
								})
							]
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-xl border p-5 h-fit space-y-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
										htmlFor: "coupon",
										children: "Coupon code"
									}),
									appliedCoupon?.valid ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-3 py-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center gap-2 text-sm",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-4 w-4 text-primary" }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "font-mono font-medium",
													children: appliedCoupon.code
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-muted-foreground",
													children: appliedCoupon.free_shipping ? "— free shipping applied" : "applied"
												})
											]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
											size: "icon",
											variant: "ghost",
											className: "h-7 w-7",
											onClick: removeCoupon,
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-3.5 w-3.5" })
										})]
									}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex gap-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											id: "coupon",
											value: couponInput,
											onChange: (e) => setCouponInput(e.target.value.toUpperCase()),
											placeholder: "Enter code",
											className: "font-mono"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
											type: "button",
											variant: "outline",
											onClick: () => applyCoupon(),
											disabled: applying,
											children: applying ? "Checking…" : "Apply"
										})]
									}),
									!appliedCoupon?.valid && suggestedForCart.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "flex flex-wrap gap-1.5 pt-1",
										children: suggestedForCart.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											type: "button",
											onClick: () => applyCoupon(c.code),
											className: "inline-flex items-center gap-1 rounded-full border border-dashed border-primary/40 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/5",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ticket, { className: "h-3 w-3" }),
												" ",
												c.code,
												" — ",
												describeCoupon(c)
											]
										}, c.code))
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "border-t pt-4 space-y-1.5",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex justify-between text-sm",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Subtotal" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-medium",
											children: formatMoney(subtotal)
										})]
									}),
									discount > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex justify-between text-sm text-primary",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Discount" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "font-medium",
											children: ["-", formatMoney(discount)]
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex justify-between text-sm",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: fulfillment === "pickup" ? "Pickup charge" : "Delivery charge" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-medium",
											children: fulfillmentCharge > 0 ? formatMoney(fulfillmentCharge) : "Free"
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex justify-between text-base font-semibold pt-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Total" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: formatMoney(orderTotal) })]
									})
								]
							}),
							user && walletBalance > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "border-t pt-4 space-y-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Label, {
											htmlFor: "use-wallet",
											className: "flex items-center gap-1.5",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wallet, { className: "h-3.5 w-3.5" }),
												" Use wallet balance (",
												formatMoney(walletBalance),
												")"
											]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
											id: "use-wallet",
											checked: useWallet,
											onCheckedChange: setUseWallet
										})]
									}),
									useWallet && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											type: "number",
											min: 0,
											max: maxWallet / 100,
											step: "0.01",
											value: walletAmountInput,
											onChange: (e) => setWalletAmountInput(e.target.value),
											className: "h-9"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "whitespace-nowrap text-xs text-muted-foreground",
											children: [
												"of ",
												formatMoney(maxWallet),
												" max"
											]
										})]
									}),
									useWallet && walletAmountCents > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex justify-between text-sm",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-muted-foreground",
											children: "Amount to pay now"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-semibold",
											children: formatMoney(amountDueNow)
										})]
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "border-t pt-4 space-y-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
									htmlFor: "cn",
									children: "Full name"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									id: "cn",
									value: name,
									onChange: (e) => setName(e.target.value)
								})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
									htmlFor: "cnn",
									children: "Notes (optional)"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
									id: "cnn",
									value: notes,
									onChange: (e) => setNotes(e.target.value),
									rows: 2
								})] })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								className: "w-full",
								onClick: placeOrder,
								disabled: placing || !canDeliver,
								children: placing ? "Placing order…" : amountDueNow === 0 && walletAmountCents > 0 ? "Place order — paid by wallet" : "Place order & pay"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-muted-foreground text-center",
								children: "Secure payment via Razorpay. You can also pay later from \"My orders\" if you close the payment window."
							})
						]
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StoreFooter, {})
		]
	});
}
//#endregion
export { CartPage as component };

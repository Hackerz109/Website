import { t as supabase } from "./client-C6ZaJElq.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/razorpay-CLuPmmfq.js
function loadRazorpayScript() {
	return new Promise((resolve, reject) => {
		if (window.Razorpay) return resolve();
		const script = document.createElement("script");
		script.src = "https://checkout.razorpay.com/v1/checkout.js";
		script.onload = () => resolve();
		script.onerror = () => reject(/* @__PURE__ */ new Error("Failed to load the payment script — check your connection and try again."));
		document.body.appendChild(script);
	});
}
/** Opens Razorpay Checkout for an existing order and resolves once the
*  modal closes — either because payment was confirmed, the user closed
*  it, or something went wrong. The order stays "pending" until either
*  this resolves with "paid", or the webhook backstop confirms it. */
async function payForOrder(order) {
	const { data: sessionData } = await supabase.auth.getSession();
	const token = sessionData.session?.access_token;
	if (!token) return {
		status: "error",
		message: "Please sign in again."
	};
	const createRes = await fetch("/api/create-razorpay-order", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify({ orderId: order.id })
	});
	const createData = await createRes.json();
	if (!createRes.ok) return {
		status: "error",
		message: createData.error ?? "Could not start payment"
	};
	try {
		await loadRazorpayScript();
	} catch (err) {
		return {
			status: "error",
			message: err instanceof Error ? err.message : "Could not load payment script"
		};
	}
	return new Promise((resolve) => {
		const rzp = new window.Razorpay({
			key: createData.keyId,
			amount: createData.amount,
			currency: createData.currency,
			order_id: createData.razorpayOrderId,
			name: "My Shop",
			prefill: {
				name: order.customer_name ?? void 0,
				email: order.customer_email ?? void 0
			},
			theme: { color: "#2454e5" },
			handler: async (response) => {
				const r = response;
				if ((await fetch("/api/verify-razorpay-payment", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`
					},
					body: JSON.stringify({
						orderId: order.id,
						razorpayOrderId: r.razorpay_order_id,
						razorpayPaymentId: r.razorpay_payment_id,
						razorpaySignature: r.razorpay_signature
					})
				})).ok) resolve({ status: "paid" });
				else resolve({
					status: "error",
					message: "Payment went through but confirmation failed — contact the shop, your payment is safe."
				});
			},
			modal: { ondismiss: () => resolve({ status: "dismissed" }) }
		});
		rzp.on("payment.failed", () => resolve({
			status: "error",
			message: "Payment failed. You can try again anytime from My Orders."
		}));
		rzp.open();
	});
}
//#endregion
export { payForOrder as t };

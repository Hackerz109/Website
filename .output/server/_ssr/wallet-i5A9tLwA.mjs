import { t as supabase } from "./client-C6ZaJElq.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/wallet-i5A9tLwA.js
/** Balance is always derived from the ledger — never stored — so it can
* never drift from the sum of its own transactions. */
function sumBalance(transactions) {
	return transactions.reduce((sum, t) => sum + t.amount_cents, 0);
}
async function fetchWalletTransactions(userId) {
	const { data, error } = await supabase.from("wallet_transactions").select("*").eq("user_id", userId).order("created_at", { ascending: false });
	if (error) throw error;
	return data ?? [];
}
/** Apply wallet balance toward an unpaid order (full or partial). Server
* clamps to whatever is actually available and actually owed. */
async function redeemWalletForOrder(orderId, amountCents) {
	const { data, error } = await supabase.rpc("wallet_redeem_for_order", {
		p_order_id: orderId,
		p_amount_cents: Math.round(amountCents)
	});
	if (error) return {
		success: false,
		message: error.message
	};
	return data;
}
/** Admin-only: manually credit (positive) or debit (negative) a customer's wallet. */
async function adminAdjustWallet(userId, amountCents, reason) {
	const { data, error } = await supabase.rpc("admin_wallet_adjust", {
		p_user_id: userId,
		p_amount_cents: Math.round(amountCents),
		p_reason: reason
	});
	if (error) return {
		success: false,
		message: error.message
	};
	return data;
}
function walletTransactionLabel(type) {
	switch (type) {
		case "credit": return "Credit";
		case "debit": return "Used at checkout";
		case "refund": return "Refund";
		case "adjustment": return "Manual adjustment";
		default: return type;
	}
}
//#endregion
export { walletTransactionLabel as a, sumBalance as i, fetchWalletTransactions as n, redeemWalletForOrder as r, adminAdjustWallet as t };

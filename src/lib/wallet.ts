import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type WalletTransaction = Database["public"]["Tables"]["wallet_transactions"]["Row"];

/** Balance is always derived from the ledger — never stored — so it can
 * never drift from the sum of its own transactions. */
export function sumBalance(transactions: Pick<WalletTransaction, "amount_cents">[]): number {
  return transactions.reduce((sum, t) => sum + t.amount_cents, 0);
}

export async function fetchWalletTransactions(userId: string): Promise<WalletTransaction[]> {
  const { data, error } = await supabase
    .from("wallet_transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export interface WalletRpcResult {
  success: boolean;
  message?: string;
  applied_cents?: number;
  wallet_used_cents?: number;
  remaining_due_cents?: number;
  new_balance_cents?: number;
}

/** Apply wallet balance toward an unpaid order (full or partial). Server
 * clamps to whatever is actually available and actually owed. */
export async function redeemWalletForOrder(orderId: string, amountCents: number): Promise<WalletRpcResult> {
  const { data, error } = await supabase.rpc("wallet_redeem_for_order", {
    p_order_id: orderId,
    p_amount_cents: Math.round(amountCents),
  });
  if (error) return { success: false, message: error.message };
  return data as unknown as WalletRpcResult;
}

/** Admin-only: manually credit (positive) or debit (negative) a customer's wallet. */
export async function adminAdjustWallet(userId: string, amountCents: number, reason: string): Promise<WalletRpcResult> {
  const { data, error } = await supabase.rpc("admin_wallet_adjust", {
    p_user_id: userId,
    p_amount_cents: Math.round(amountCents),
    p_reason: reason,
  });
  if (error) return { success: false, message: error.message };
  return data as unknown as WalletRpcResult;
}

export function walletTransactionLabel(type: WalletTransaction["type"]): string {
  switch (type) {
    case "credit":
      return "Credit";
    case "debit":
      return "Used at checkout";
    case "refund":
      return "Refund";
    case "adjustment":
      return "Manual adjustment";
    default:
      return type;
  }
}

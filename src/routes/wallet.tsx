import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { ArrowDownCircle, ArrowUpCircle, RotateCcw, Settings2, Wallet } from "lucide-react";
import { StoreHeader } from "@/components/StoreHeader";
import { StoreFooter } from "@/components/StoreFooter";
import { useAuth } from "@/hooks/useAuth";
import { formatMoney } from "@/stores/cart";
import { fetchWalletTransactions, sumBalance, walletTransactionLabel } from "@/lib/wallet";

export const Route = createFileRoute("/wallet")({ component: WalletPage });

function typeIcon(type: string) {
  switch (type) {
    case "credit":
    case "refund":
      return <ArrowDownCircle className="h-4 w-4 text-green-600" />;
    case "debit":
      return <ArrowUpCircle className="h-4 w-4 text-red-500" />;
    case "adjustment":
      return <Settings2 className="h-4 w-4 text-blue-600" />;
    default:
      return <RotateCcw className="h-4 w-4" />;
  }
}

function WalletPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const { data: transactions } = useQuery({
    enabled: !!user,
    queryKey: ["wallet-transactions", user?.id],
    queryFn: () => fetchWalletTransactions(user!.id),
  });

  const balance = sumBalance(transactions ?? []);

  return (
    <div className="min-h-screen bg-background">
      <StoreHeader />
      <div className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">Store Wallet</h1>

        <div className="mt-6 rounded-2xl border bg-gradient-to-br from-primary/10 to-primary/5 p-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Wallet className="h-4 w-4" /> Available balance
          </div>
          <p className="mt-2 text-3xl font-semibold tracking-tight">{formatMoney(balance)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Use your wallet balance as full or partial payment at checkout.
          </p>
        </div>

        <div className="mt-8">
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Transaction history</h2>
          {!transactions || transactions.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
              No wallet activity yet.
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((t) => (
                <div key={t.id} className="flex items-center gap-3 rounded-xl border p-3.5">
                  {typeIcon(t.type)}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{walletTransactionLabel(t.type)}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {t.description}
                      {t.reference_order_id && (
                        <>
                          {" · "}
                          <Link to="/orders/$id" params={{ id: t.reference_order_id }} className="underline">
                            Order #{t.reference_order_id.slice(0, 8)}
                          </Link>
                        </>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${t.amount_cents >= 0 ? "text-green-600" : "text-foreground"}`}>
                      {t.amount_cents >= 0 ? "+" : "-"}
                      {formatMoney(Math.abs(t.amount_cents))}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <StoreFooter />
    </div>
  );
}

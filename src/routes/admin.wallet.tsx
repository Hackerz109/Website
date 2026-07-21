import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Search, Wallet, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/stores/cart";
import { fetchWalletTransactions, sumBalance, adminAdjustWallet, walletTransactionLabel } from "@/lib/wallet";

export const Route = createFileRoute("/admin/wallet")({ component: AdminWallet });

interface CustomerHit {
  id: string;
  email: string | null;
  full_name: string | null;
}

function AdminWallet() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CustomerHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<CustomerHit | null>(null);

  async function search() {
    if (!query.trim()) return;
    setSearching(true);
    const { data, error } = await supabase.rpc("admin_search_customers", { p_query: query.trim() });
    setSearching(false);
    if (error) return toast.error(error.message);
    setResults((data ?? []) as CustomerHit[]);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Store Wallet</h1>
        <p className="text-sm text-muted-foreground">Look up a customer to view their balance, transaction history, or make a manual adjustment.</p>
      </div>

      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder="Search by name or email"
        />
        <Button onClick={search} disabled={searching}><Search className="mr-1.5 h-4 w-4" /> Search</Button>
      </div>

      {results.length > 0 && !selected && (
        <div className="divide-y rounded-xl border">
          {results.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelected(c)}
              className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-secondary/50"
            >
              <span>{c.full_name || "—"}</span>
              <span className="text-muted-foreground">{c.email}</span>
            </button>
          ))}
        </div>
      )}

      {selected && <CustomerWallet customer={selected} onBack={() => setSelected(null)} />}
    </div>
  );
}

function CustomerWallet({ customer, onBack }: { customer: CustomerHit; onBack: () => void }) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<"credit" | "debit">("credit");

  const { data: transactions } = useQuery({
    queryKey: ["admin-wallet-tx", customer.id],
    queryFn: () => fetchWalletTransactions(customer.id),
  });
  const balance = sumBalance(transactions ?? []);

  async function adjust() {
    const value = Number(amount);
    if (!(value > 0)) return toast.error("Enter an amount greater than 0");
    if (!reason.trim()) return toast.error("A reason is required");
    setSubmitting(true);
    const result = await adminAdjustWallet(customer.id, Math.round(value * 100) * (mode === "debit" ? -1 : 1), reason);
    setSubmitting(false);
    if (!result.success) return toast.error(result.message ?? "Adjustment failed");
    toast.success("Wallet updated");
    setAmount("");
    setReason("");
    qc.invalidateQueries({ queryKey: ["admin-wallet-tx", customer.id] });
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack}>← Back to search</Button>

      <div className="rounded-xl border p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{customer.full_name || customer.email}</p>
          <Link
            to="/admin/users/$id"
            params={{ id: customer.id }}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Full profile <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          <span className="text-2xl font-semibold">{formatMoney(balance)}</span>
        </div>
      </div>

      <div className="rounded-xl border p-5">
        <h3 className="font-medium">Manual adjustment</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-[auto_1fr]">
          <div className="flex gap-1">
            <Button type="button" size="sm" variant={mode === "credit" ? "default" : "outline"} onClick={() => setMode("credit")}>Credit</Button>
            <Button type="button" size="sm" variant={mode === "debit" ? "default" : "outline"} onClick={() => setMode("debit")}>Debit</Button>
          </div>
          <Input type="number" min={0} step="0.01" placeholder="Amount (₹)" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="mt-3">
          <Label>Reason</Label>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="e.g. Goodwill credit for delayed delivery" />
        </div>
        <Button className="mt-3" onClick={adjust} disabled={submitting}>
          {submitting ? "Saving…" : `${mode === "credit" ? "Add" : "Deduct"} balance`}
        </Button>
      </div>

      <div>
        <h3 className="mb-2 font-medium">Transaction history</h3>
        <div className="space-y-2">
          {(transactions ?? []).map((t) => (
            <div key={t.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
              <div>
                <p className="font-medium">{walletTransactionLabel(t.type)}</p>
                <p className="text-xs text-muted-foreground">{t.description}</p>
                <p className="text-[11px] text-muted-foreground">{new Date(t.created_at).toLocaleString()}</p>
              </div>
              <span className={t.amount_cents >= 0 ? "font-semibold text-green-600" : "font-semibold"}>
                {t.amount_cents >= 0 ? "+" : "-"}{formatMoney(Math.abs(t.amount_cents))}
              </span>
            </div>
          ))}
          {(transactions ?? []).length === 0 && <p className="text-sm text-muted-foreground">No transactions yet.</p>}
        </div>
      </div>
    </div>
  );
}

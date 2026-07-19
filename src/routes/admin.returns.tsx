import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/stores/cart";
import {
  adminReviewReturn,
  adminProcessRefund,
  getReturnImageUrl,
  returnStatusLabel,
  returnStatusBadgeClass,
  type ReturnRequestWithDetails,
} from "@/lib/returns";

export const Route = createFileRoute("/admin/returns")({ component: AdminReturns });

type ReturnWithOrder = ReturnRequestWithDetails & {
  orders: { customer_name: string | null; customer_email: string; payment_status: string; razorpay_payment_id: string | null; total_cents: number } | null;
};

function AdminReturns() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-returns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("return_requests")
        .select("*, return_items(*), return_images(*), orders(customer_name, customer_email, payment_status, razorpay_payment_id, total_cents)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as ReturnWithOrder[];
    },
  });

  function refresh() {
    qc.invalidateQueries({ queryKey: ["admin-returns"] });
  }

  const pending = (data ?? []).filter((r) => r.status === "requested");
  const others = (data ?? []).filter((r) => r.status !== "requested");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Returns & Refunds</h1>
        <p className="text-sm text-muted-foreground">Review return requests and process refunds to wallet or original payment method.</p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Awaiting review ({pending.length})</h2>
        <div className="space-y-3">
          {pending.map((r) => <ReturnCard key={r.id} r={r} onChanged={refresh} />)}
          {pending.length === 0 && <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Nothing waiting on review.</p>}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">History</h2>
        <div className="space-y-3">
          {others.map((r) => <ReturnCard key={r.id} r={r} onChanged={refresh} />)}
          {others.length === 0 && <p className="text-sm text-muted-foreground">No reviewed returns yet.</p>}
        </div>
      </section>
    </div>
  );
}

function ReturnCard({ r, onChanged }: { r: ReturnWithOrder; onChanged: () => void }) {
  const [reviewOpen, setReviewOpen] = useState(false);
  const [refunding, setRefunding] = useState(false);

  async function refund(method: "wallet_credit" | "original_payment") {
    setRefunding(true);
    if (method === "wallet_credit") {
      const result = await adminProcessRefund(r.id, "wallet_credit");
      setRefunding(false);
      if (!result.success) return toast.error(result.message ?? "Refund failed");
      toast.success("Refunded to customer's wallet");
      onChanged();
      return;
    }
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    try {
      const res = await fetch("/api/refund-razorpay-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ returnId: r.id }),
      });
      const body = await res.json();
      setRefunding(false);
      if (!res.ok) return toast.error(body.error ?? "Refund failed");
      toast.success("Refunded to original payment method");
      onChanged();
    } catch {
      setRefunding(false);
      toast.error("Couldn't reach the payment gateway");
    }
  }

  const canRefund = r.status === "approved" || r.status === "partially_approved";
  const originalPaymentAvailable = r.orders?.payment_status === "paid" && !!r.orders?.razorpay_payment_id;

  return (
    <div className="rounded-xl border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{r.orders?.customer_name ?? r.orders?.customer_email ?? "Customer"}</p>
          <p className="text-xs text-muted-foreground">Order #{r.order_id.slice(0, 8)} · Return #{r.id.slice(0, 8)}</p>
          <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</p>
        </div>
        <Badge className={returnStatusBadgeClass(r.status)}>{returnStatusLabel(r.status)}</Badge>
      </div>

      <p className="mt-2 text-sm">{r.reason}</p>
      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
        {r.return_items.map((it) => (
          <div key={it.id}>
            Qty {it.quantity}{it.approved_quantity != null && it.approved_quantity !== it.quantity && ` (approved: ${it.approved_quantity})`} — {formatMoney(it.unit_price_cents)} each
          </div>
        ))}
      </div>
      {r.return_images.length > 0 && (
        <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground"><ImageIcon className="h-3 w-3" /> {r.return_images.length} photo{r.return_images.length > 1 ? "s" : ""} attached</p>
      )}
      {r.admin_notes && <p className="mt-2 text-xs italic text-muted-foreground">Note: {r.admin_notes}</p>}
      {r.status === "refunded" && (
        <p className="mt-2 text-xs font-medium text-green-700">
          Refunded {formatMoney(r.refund_amount_cents)} via {r.refund_method === "wallet_credit" ? "wallet credit" : "original payment method"}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {r.status === "requested" && (
          <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
            <DialogTrigger asChild><Button size="sm">Review</Button></DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <ReviewDialog r={r} onDone={() => { setReviewOpen(false); onChanged(); }} />
            </DialogContent>
          </Dialog>
        )}
        {canRefund && (
          <>
            <Button size="sm" variant="outline" disabled={refunding} onClick={() => refund("wallet_credit")}>
              Refund to wallet
            </Button>
            <Button size="sm" variant="outline" disabled={refunding || !originalPaymentAvailable} onClick={() => refund("original_payment")}>
              Refund to original payment{!originalPaymentAvailable && " (unavailable)"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function ReviewDialog({ r, onDone }: { r: ReturnWithOrder; onDone: () => void }) {
  const [quantities, setQuantities] = useState<Record<string, number>>(
    Object.fromEntries(r.return_items.map((it) => [it.id, it.quantity])),
  );
  const [notes, setNotes] = useState("");
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const entries = await Promise.all(r.return_images.map(async (img) => [img.id, await getReturnImageUrl(img.url)] as const));
      setImageUrls(Object.fromEntries(entries.filter(([, url]) => !!url)) as Record<string, string>);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(reject: boolean) {
    setSubmitting(true);
    const itemDecisions = r.return_items.map((it) => ({
      return_item_id: it.id,
      approved_quantity: reject ? 0 : Math.max(0, Math.min(it.quantity, quantities[it.id] ?? 0)),
    }));
    const anyReduced = !reject && itemDecisions.some((d) => {
      const original = r.return_items.find((it) => it.id === d.return_item_id)!.quantity;
      return d.approved_quantity < original;
    });
    const decision = reject ? "rejected" : anyReduced ? "partially_approved" : "approved";
    const result = await adminReviewReturn(r.id, decision, notes, itemDecisions);
    setSubmitting(false);
    if (!result.success) return toast.error(result.message ?? "Couldn't submit review");
    toast.success(reject ? "Return rejected" : "Return approved");
    onDone();
  }

  return (
    <>
      <DialogHeader><DialogTitle>Review return #{r.id.slice(0, 8)}</DialogTitle></DialogHeader>
      <div className="space-y-4">
        <p className="text-sm">{r.reason}</p>

        {r.return_images.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {r.return_images.map((img) => (
              imageUrls[img.id] ? (
                <img key={img.id} src={imageUrls[img.id]} alt="" className="h-20 w-20 rounded-lg border object-cover" />
              ) : (
                <div key={img.id} className="flex h-20 w-20 items-center justify-center rounded-lg border text-muted-foreground"><ImageIcon className="h-5 w-5" /></div>
              )
            ))}
          </div>
        )}

        <div className="space-y-2">
          {r.return_items.map((it) => (
            <div key={it.id} className="flex items-center justify-between gap-3 rounded-lg border p-2.5 text-sm">
              <div>
                <p>Requested qty: {it.quantity}</p>
                <p className="text-xs text-muted-foreground">{formatMoney(it.unit_price_cents)} each</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Approve qty</span>
                <Input
                  type="number"
                  min={0}
                  max={it.quantity}
                  value={quantities[it.id]}
                  onChange={(e) => setQuantities((q) => ({ ...q, [it.id]: Math.max(0, Math.min(it.quantity, Number(e.target.value) || 0)) }))}
                  className="h-8 w-16"
                />
              </div>
            </div>
          ))}
        </div>

        <div>
          <label className="text-sm font-medium">Note to customer (optional)</label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </div>
      </div>
      <DialogFooter className="gap-2 sm:gap-2">
        <Button variant="outline" disabled={submitting} onClick={() => submit(true)}>Reject</Button>
        <Button disabled={submitting} onClick={() => submit(false)}>Approve</Button>
      </DialogFooter>
    </>
  );
}

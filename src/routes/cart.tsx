import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { StoreHeader } from "@/components/StoreHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCart, formatMoney } from "@/stores/cart";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/cart")({ component: CartPage });

function CartPage() {
  const items = useCart((s) => s.items);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const clear = useCart((s) => s.clear);
  const { user } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [placing, setPlacing] = useState(false);

  const subtotal = items.reduce((s, i) => s + i.price_cents * i.quantity, 0);

  async function placeOrder() {
    if (!user) {
      toast.error("Please sign in to place an order");
      navigate({ to: "/auth" });
      return;
    }
    if (items.length === 0) return;
    if (!name || !address) {
      toast.error("Please add your name and shipping address");
      return;
    }
    setPlacing(true);
    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        customer_email: user.email ?? "",
        customer_name: name,
        shipping_address: { address },
        subtotal_cents: subtotal,
        total_cents: subtotal,
        notes,
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
    setPlacing(false);
    if (itemsErr) return toast.error(itemsErr.message);
    clear();
    toast.success("Order placed — we'll be in touch about payment & shipping");
    navigate({ to: "/orders" });
  }

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
            <div className="md:col-span-2 space-y-4">
              {items.map((i) => (
                <div key={`${i.id}::${i.variantId ?? ""}`} className="flex gap-4 rounded-xl border p-4">
                  <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-secondary/60">
                    {i.image_url && <img src={i.image_url} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{i.name}</p>
                    {i.sku && <p className="text-xs text-muted-foreground">SKU: {i.sku}</p>}
                    <p className="text-sm text-muted-foreground">
                      {formatMoney(i.price_cents)}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setQty(i.id, i.quantity - 1, i.variantId)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center text-sm">{i.quantity}</span>
                      <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setQty(i.id, i.quantity + 1, i.variantId)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="ml-auto h-7 w-7" onClick={() => remove(i.id, i.variantId)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-sm font-medium">
                    {formatMoney(i.price_cents * i.quantity)}
                  </div>
                </div>
              ))}
            </div>
            <div className="rounded-xl border p-5 h-fit space-y-4">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span className="font-medium">{formatMoney(subtotal)}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Shipping calculated after order confirmation.
              </div>
              <div className="border-t pt-4 space-y-3">
                <div>
                  <Label htmlFor="cn">Full name</Label>
                  <Input id="cn" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="ca">Shipping address</Label>
                  <Textarea id="ca" value={address} onChange={(e) => setAddress(e.target.value)} rows={3} />
                </div>
                <div>
                  <Label htmlFor="cnn">Notes (optional)</Label>
                  <Textarea id="cnn" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
                </div>
              </div>
              <Button className="w-full" onClick={placeOrder} disabled={placing}>
                Place order
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Payment set up separately by the shop owner.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
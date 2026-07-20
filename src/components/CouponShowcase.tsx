import { useEffect, useState } from "react";
import { Ticket, Copy, Check, Percent, IndianRupee, Truck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { fetchEligibleCoupons, describeCoupon, type VisibleCoupon } from "@/lib/coupons";
import { cn } from "@/lib/utils";

function iconFor(type: VisibleCoupon["discount_type"]) {
  if (type === "percentage") return Percent;
  if (type === "free_shipping") return Truck;
  return IndianRupee;
}

function CouponTicket({ coupon }: { coupon: VisibleCoupon }) {
  const [copied, setCopied] = useState(false);
  const Icon = iconFor(coupon.discount_type);

  async function copy() {
    try {
      await navigator.clipboard.writeText(coupon.code);
      setCopied(true);
      toast.success(`Copied "${coupon.code}"`);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Couldn't copy — long-press the code instead.");
    }
  }

  return (
    <div className="relative mx-2 flex w-72 flex-shrink-0 overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg">
      {/* Perforated ticket edge */}
      <div className="absolute inset-y-0 left-[74px] flex flex-col justify-between py-1">
        {Array.from({ length: 8 }).map((_, i) => (
          <span key={i} className="h-1.5 w-1.5 rounded-full bg-background" />
        ))}
      </div>

      <div className="flex w-[74px] flex-shrink-0 flex-col items-center justify-center gap-1 border-r border-dashed border-primary-foreground/30 px-2 py-4">
        <Icon className="h-6 w-6" />
        <span className="text-center text-[10px] font-medium uppercase tracking-wide opacity-80">Offer</span>
      </div>

      <div className="flex flex-1 flex-col justify-between p-4 pl-6">
        <div>
          <p className="text-base font-bold leading-tight">{describeCoupon(coupon)}</p>
          {coupon.description && (
            <p className="mt-1 line-clamp-2 text-xs text-primary-foreground/80">{coupon.description}</p>
          )}
          {coupon.min_order_cents ? (
            <p className="mt-1 text-[11px] text-primary-foreground/70">
              On orders above ₹{(coupon.min_order_cents / 100).toFixed(0)}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={copy}
          className={cn(
            "mt-3 flex items-center justify-between gap-2 rounded-lg bg-background/15 px-3 py-2 font-mono text-sm font-semibold backdrop-blur-sm transition hover:bg-background/25",
          )}
        >
          {coupon.code}
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}

/**
 * A highlighted, "you qualify for this" coupon strip. Only ever shows
 * coupons the current visitor is actually eligible for right now — a
 * first-order coupon drops off the instant they've placed one, a
 * logged-in-only coupon is hidden from guests, and so on, so nothing shown
 * here can end up being a broken promise at checkout.
 */
export function CouponShowcase() {
  const { user } = useAuth();
  const [coupons, setCoupons] = useState<VisibleCoupon[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchEligibleCoupons(user?.id ?? null).then((c) => {
      setCoupons(c);
      setLoaded(true);
    });
  }, [user?.id]);

  if (!loaded || coupons.length === 0) return null;

  return (
    <section className="border-y border-border bg-secondary/30 py-10">
      <div className="mx-auto max-w-6xl px-6">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
          <Ticket className="h-3.5 w-3.5" /> Offers for you
        </p>
        <h2 className="mt-1 text-xl font-extrabold tracking-tight text-foreground md:text-2xl">
          Deals you're eligible for right now
        </h2>
      </div>
      <div className="mt-6 flex overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="mx-auto flex">
          {coupons.map((c) => (
            <CouponTicket key={c.code} coupon={c} />
          ))}
        </div>
      </div>
    </section>
  );
}

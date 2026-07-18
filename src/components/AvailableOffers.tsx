import { useEffect, useState } from "react";
import { Ticket } from "lucide-react";
import { fetchOffersForProduct, describeCoupon, type VisibleCoupon } from "@/lib/coupons";

/**
 * Surfaces "visible" coupons that actually apply to this product — based on
 * its category/brand and any specific product/category/brand targeting or
 * exclusions on the coupon. The same eligibility check runs again at
 * checkout, so what's shown here always matches what will actually work.
 */
export function AvailableOffers({
  productId,
  categoryId,
  brandId,
}: {
  productId: string;
  categoryId: string | null;
  brandId: string | null;
}) {
  const [coupons, setCoupons] = useState<VisibleCoupon[]>([]);

  useEffect(() => {
    fetchOffersForProduct(productId, categoryId, brandId).then((all) =>
      setCoupons(all.filter((c) => c.visibility === "visible")),
    );
  }, [productId, categoryId, brandId]);

  if (coupons.length === 0) return null;

  return (
    <div className="mt-6 rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-4">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <Ticket className="h-4 w-4 text-primary" /> Available offers
      </p>
      <ul className="mt-2 space-y-1.5">
        {coupons.map((c) => (
          <li key={c.code} className="flex items-center gap-2 text-sm">
            <span className="rounded-md bg-background px-1.5 py-0.5 font-mono text-xs font-semibold">{c.code}</span>
            <span className="text-muted-foreground">{describeCoupon(c)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted-foreground">Enter the code at checkout — eligibility is confirmed there.</p>
    </div>
  );
}

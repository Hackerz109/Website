import { Link } from "@tanstack/react-router";
import { ShieldCheck, ShieldOff, ArrowRight } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type WarrantyType = Database["public"]["Enums"]["warranty_type"];
type ServiceMethod = Database["public"]["Enums"]["warranty_service_method"];

export interface WarrantyInfo {
  warranty_available?: boolean | null;
  warranty_type?: WarrantyType | null;
  warranty_duration?: string | null;
  warranty_provider?: string | null;
  warranty_service_method?: ServiceMethod | null;
  warranty_notes?: string | null;
  /** Legacy free-text field, used as a fallback for older products. */
  warranty?: string | null;
}

const WARRANTY_TYPE_LABEL: Record<WarrantyType, string> = {
  manufacturer: "Manufacturer Warranty",
  seller: "Seller Warranty",
  extended: "Extended Warranty",
};

const SERVICE_METHOD_LABEL: Record<ServiceMethod, string> = {
  home_service: "Home Service",
  authorized_service_center: "Authorized Service Center",
  bring_to_store: "Bring to Store",
  carry_in_service: "Carry-in Service",
  on_site_service: "On-site Service",
};

/**
 * Premium, at-a-glance warranty summary shown on every product page.
 * Falls back gracefully to the legacy free-text warranty note for
 * products that haven't been migrated to the structured fields yet.
 */
export function WarrantyCard({ product }: { product: WarrantyInfo }) {
  const hasStructuredWarranty = !!product.warranty_available;
  const hasLegacyNote = !hasStructuredWarranty && !!product.warranty?.trim();

  // Explicit "no warranty" only when we know for sure — i.e. structured
  // data exists and says no, and there's no legacy note to fall back on.
  const explicitlyNoWarranty = product.warranty_available === false && !hasLegacyNote;

  if (!hasStructuredWarranty && !hasLegacyNote && !explicitlyNoWarranty) {
    return null;
  }

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
      <div className="flex items-center gap-2.5 border-b border-border bg-secondary/40 px-4 py-3">
        {explicitlyNoWarranty ? (
          <ShieldOff className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ShieldCheck className="h-4 w-4 text-primary" />
        )}
        <p className="text-sm font-semibold text-foreground">Warranty Information</p>
      </div>

      <div className="space-y-2 px-4 py-4 text-sm">
        {explicitlyNoWarranty ? (
          <p className="text-muted-foreground">
            This product doesn't come with a warranty. We stand by every order with our
            standard return and refund policy — reach out any time if something isn't right.
          </p>
        ) : hasStructuredWarranty ? (
          <>
            <Row
              label="Warranty"
              value={
                [product.warranty_duration, product.warranty_type ? WARRANTY_TYPE_LABEL[product.warranty_type] : null]
                  .filter(Boolean)
                  .join(" ") || "Covered"
              }
            />
            {product.warranty_provider && <Row label="Provider" value={product.warranty_provider} />}
            {product.warranty_service_method && (
              <Row label="Service" value={SERVICE_METHOD_LABEL[product.warranty_service_method]} />
            )}
            {product.warranty_notes && <Row label="Note" value={product.warranty_notes} />}
          </>
        ) : (
          <p className="whitespace-pre-wrap text-muted-foreground">{product.warranty}</p>
        )}

        <div className="pt-1">
          <Link
            to="/warranty-policy"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Read Full Warranty Policy <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4">
      <span className="w-20 flex-shrink-0 text-muted-foreground">{label}:</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

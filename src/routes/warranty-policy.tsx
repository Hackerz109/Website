import { createFileRoute, Link } from "@tanstack/react-router";
import { PolicyPage } from "@/components/PolicyPage";

export const Route = createFileRoute("/warranty-policy")({ component: WarrantyPolicyPage });

function WarrantyPolicyPage() {
  return (
    <PolicyPage
      title="Warranty Policy"
      subtitle="What's covered, for how long, and how to use it — in plain language."
      lastUpdated="24 July 2026"
    >
      <p>
        We want every purchase to feel safe. That's why each product page on My Shop clearly shows its
        warranty status, so you always know exactly what's covered before you buy — no surprises later.
      </p>

      <div>
        <h2>How warranty coverage works</h2>
        <p>Every product falls into one of two categories, shown directly on its product page:</p>
        <ul>
          <li>
            <strong>No Warranty</strong> — the product isn't covered by a warranty. It's still backed by our
            standard{" "}
            <Link to="/returns-policy" className="font-medium text-primary hover:underline">
              Return &amp; Refund Policy
            </Link>
            .
          </li>
          <li>
            <strong>Warranty Available</strong> — the product page lists the warranty type, duration,
            provider, and how to get service.
          </li>
        </ul>
      </div>

      <div>
        <h2>Types of warranty</h2>
        <ul>
          <li>
            <strong>Manufacturer Warranty</strong> — provided directly by the brand that makes the product.
          </li>
          <li>
            <strong>Seller Warranty</strong> — provided by My Shop as the seller.
          </li>
          <li>
            <strong>Extended Warranty</strong> — additional coverage beyond the standard term, where
            available.
          </li>
        </ul>
      </div>

      <div>
        <h2>Getting warranty service</h2>
        <p>Depending on the product, service is offered through one or more of the following methods:</p>
        <ul>
          <li>
            <strong>Home Service</strong> — a technician visits your location.
          </li>
          <li>
            <strong>Authorized Service Center</strong> — service through the brand's official centers.
          </li>
          <li>
            <strong>Bring to Store</strong> — bring the item to any My Shop location.
          </li>
          <li>
            <strong>Carry-in Service</strong> — drop the item off at a designated service point.
          </li>
          <li>
            <strong>On-site Service</strong> — service performed where the product is installed.
          </li>
        </ul>
      </div>

      <div>
        <h2>What you'll typically need</h2>
        <p>
          Most warranty claims require your original purchase invoice or order confirmation, and the
          product in the condition it was received (excluding normal wear). Any product-specific
          requirements are noted directly on that product's page.
        </p>
      </div>

      <div>
        <h2>Questions about a specific product?</h2>
        <p>
          Check the Warranty Information card on the product page first — it has the exact duration,
          provider, and service method for that item. If anything is unclear, our{" "}
          <Link to="/contact" className="font-medium text-primary hover:underline">
            support team
          </Link>{" "}
          is happy to help.
        </p>
      </div>
    </PolicyPage>
  );
}

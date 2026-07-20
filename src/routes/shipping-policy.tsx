import { createFileRoute, Link } from "@tanstack/react-router";
import { PolicyPage } from "@/components/PolicyPage";

export const Route = createFileRoute("/shipping-policy")({ component: ShippingPolicyPage });

function ShippingPolicyPage() {
  return (
    <PolicyPage
      title="Shipping Policy"
      subtitle="How we get your order to you, and what to expect along the way."
    >
      <div>
        <h2>Processing time</h2>
        <p>
          Orders are typically processed within 1–2 business days. You'll see real-time stock
          availability on every product page, so you'll know upfront if an item is ready to ship.
        </p>
      </div>

      <div>
        <h2>Delivery time</h2>
        <p>
          Delivery times vary depending on your location and the items ordered. We'll share an
          estimated delivery window at checkout and keep you updated as your order moves.
        </p>
      </div>

      <div>
        <h2>Order tracking</h2>
        <p>
          Once your order ships, you can check its status any time from the "My Orders" section
          of your account.
        </p>
      </div>

      <div>
        <h2>Shipping charges</h2>
        <p>
          Any applicable shipping charges are calculated and shown clearly at checkout before
          you confirm your order — no hidden fees.
        </p>
      </div>

      <div>
        <h2>Damaged or missing items</h2>
        <p>
          If anything arrives damaged or incomplete, please contact us within 48 hours of
          delivery and we'll make it right. See our{" "}
          <Link to="/returns-policy" className="font-medium text-primary hover:underline">
            Return &amp; Refund Policy
          </Link>{" "}
          for full details.
        </p>
      </div>

      <div>
        <h2>Questions about your order?</h2>
        <p>
          Our{" "}
          <Link to="/contact" className="font-medium text-primary hover:underline">
            support team
          </Link>{" "}
          is happy to help with anything shipping-related.
        </p>
      </div>
    </PolicyPage>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { PolicyPage } from "@/components/PolicyPage";

export const Route = createFileRoute("/shipping-policy")({ component: ShippingPolicyPage });

function ShippingPolicyPage() {
  return (
    <PolicyPage
      title="Shipping Policy"
      subtitle="How we get your order to you, and what to expect along the way."
      lastUpdated="24 July 2026"
    >
      <div>
        <h2>Do we deliver to you?</h2>
        <p>
          We deliver within a set area around our store, and we check this live rather than against a
          generic PIN code list. At checkout, share your location or enter your address and we'll instantly
          confirm whether you're within our delivery area, roughly how far away you are, and what — if
          anything — it'll cost. That's more accurate than most PIN-code checkers, especially for smaller
          towns where one PIN code can span a huge area.
        </p>
      </div>

      <div>
        <h2>Delivery charges</h2>
        <p>
          Any delivery charge is shown clearly at checkout before you pay — never added as a surprise
          afterward. Depending on your distance from the store, delivery may be a flat rate or scaled to
          distance, and we often waive it entirely above a minimum order value. You'll always see the exact
          number for your address and cart before you confirm.
        </p>
      </div>

      <div>
        <h2>Store Pickup</h2>
        <p>
          Prefer to skip delivery altogether? Choose Store Pickup at checkout and collect your order
          directly from us — handy if you're nearby or need something in a hurry. We'll show you the pickup
          address and an estimated ready time before you complete your order.
        </p>
      </div>

      <div>
        <h2>Processing & delivery time</h2>
        <p>
          We start processing an order as soon as payment is confirmed. Delivery timelines depend on your
          distance from the store and the items ordered — we'll give you an estimate at checkout and keep
          you posted as your order moves from confirmed to packed to out for delivery.
        </p>
      </div>

      <div>
        <h2>Help us get your pin exactly right</h2>
        <p>
          Digital maps aren't always complete for smaller towns and newer neighbourhoods, so at checkout,
          take a second to check the pin on the map matches where you actually want your order delivered,
          and add a landmark or delivery note if it'll help. It's the single biggest thing you can do to
          avoid a delivery hiccup.
        </p>
      </div>

      <div>
        <h2>Tracking your order</h2>
        <p>
          Once your order's placed, you can follow its status anytime from "My Orders" in your account — no
          need to guess or ask.
        </p>
      </div>

      <div>
        <h2>If something arrives damaged or incomplete</h2>
        <p>
          Please let us know within 48 hours of delivery and we'll sort it out. See our{" "}
          <Link to="/returns-policy" className="font-medium text-primary hover:underline">
            Return &amp; Refund Policy
          </Link>{" "}
          for exactly how that works.
        </p>
      </div>

      <div>
        <h2>Outside our delivery area?</h2>
        <p>
          If checkout shows your address is currently outside our delivery zone, Store Pickup is always
          available as an alternative — and we're regularly expanding coverage, so it's worth checking
          back.
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

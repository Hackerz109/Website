import { createFileRoute, Link } from "@tanstack/react-router";
import { PolicyPage } from "@/components/PolicyPage";

export const Route = createFileRoute("/returns-policy")({ component: ReturnsPolicyPage });

function ReturnsPolicyPage() {
  return (
    <PolicyPage
      title="Return & Refund Policy"
      subtitle="If something's not right, we'll help make it right."
    >
      <div>
        <h2>Our approach</h2>
        <p>
          We want you to feel completely comfortable shopping with us. If an item isn't what
          you expected, arrives damaged, or simply isn't the right fit, we're here to help
          with a straightforward return or refund.
        </p>
      </div>

      <div>
        <h2>Eligibility</h2>
        <ul>
          <li>Items should be unused and in their original packaging where possible.</li>
          <li>Please reach out within a reasonable time of receiving your order — as a guide, within 7 days.</li>
          <li>Have your order number or invoice ready to help us move quickly.</li>
        </ul>
      </div>

      <div>
        <h2>How refunds work</h2>
        <p>
          Once we receive and review a returned item, we'll process your refund to your
          original payment method. We'll keep you informed at each step, and most refunds
          are completed within a few business days of approval.
        </p>
      </div>

      <div>
        <h2>Warranty vs. returns</h2>
        <p>
          A product issue that develops after your return window has passed is usually a
          warranty matter rather than a return — check the Warranty Information on the
          product page, or see our{" "}
          <Link to="/warranty-policy" className="font-medium text-primary hover:underline">
            Warranty Policy
          </Link>{" "}
          for how to get it serviced.
        </p>
      </div>

      <div>
        <h2>Starting a return</h2>
        <p>
          The easiest way to start is to message our{" "}
          <Link to="/contact" className="font-medium text-primary hover:underline">
            support team
          </Link>{" "}
          with your order number — we'll guide you through the next steps personally.
        </p>
      </div>
    </PolicyPage>
  );
}

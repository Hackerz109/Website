import { createFileRoute, Link } from "@tanstack/react-router";
import { PolicyPage } from "@/components/PolicyPage";

export const Route = createFileRoute("/returns-policy")({ component: ReturnsPolicyPage });

const sections = [
  { id: "cancellations", label: "Cancelling an order" },
  { id: "eligibility", label: "Return eligibility" },
  { id: "starting-a-return", label: "Starting a return" },
  { id: "review-process", label: "What happens next" },
  { id: "refunds", label: "How refunds work" },
  { id: "damaged-items", label: "Damaged or wrong items" },
  { id: "exclusions", label: "What's not eligible" },
  { id: "warranty-vs-returns", label: "Warranty vs. returns" },
];

function ReturnsPolicyPage() {
  return (
    <PolicyPage
      title="Return & Refund Policy"
      subtitle="If something's not right, we'll help make it right — here's exactly how."
      lastUpdated="24 July 2026"
    >
      <p>
        We want you to buy from us with total confidence — which means making it genuinely easy to cancel,
        return, or get your money back when something's not right. No fine print designed to wear you down.
      </p>

      <nav aria-label="Jump to a section" className="flex flex-wrap gap-2">
        {sections.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
          >
            {s.label}
          </a>
        ))}
      </nav>

      <div>
        <h2 id="cancellations">Cancelling an order</h2>
        <p>
          Changed your mind right after ordering? Reach out as soon as possible — ideally before your order
          is packed — and we'll cancel it and refund you in full. We don't charge cancellation fees, in
          line with Indian consumer protection rules. Once an order is out for delivery or delivered, it
          moves into the return process below instead.
        </p>
      </div>

      <div>
        <h2 id="eligibility">Return eligibility</h2>
        <ul>
          <li>
            Returns apply to delivered orders — once your order shows as delivered, you can request a
            return from its order details.
          </li>
          <li>As a guide, reach out within 7 days of delivery — the sooner you flag it, the faster we can move.</li>
          <li>
            Items should be unused, in their original packaging, with all accessories and freebies included
            where possible.
          </li>
          <li>Have your order number handy — it helps us move quickly.</li>
        </ul>
      </div>

      <div>
        <h2 id="starting-a-return">Starting a return</h2>
        <p>
          Open the order from "My Orders," choose the item(s) you'd like to return, tell us why, and add a
          photo or two if the issue is visual — damage, the wrong item, missing parts. A picture genuinely
          speeds up approval. Let us know whether you'd prefer a refund to your original payment method or
          as Store Wallet credit, and we'll take that into account when we process it.
        </p>
      </div>

      <div>
        <h2 id="review-process">What happens next</h2>
        <p>
          Our team reviews every return individually — this isn't an automated rubber stamp. We'll approve
          it in full, approve it partially (for example, if only some items in a multi-item return
          qualify), or explain if we can't accept it. You'll see the status update on your order the moment
          we decide, with no need to chase us for a response.
        </p>
      </div>

      <div>
        <h2 id="refunds">How refunds work</h2>
        <p>
          Once a return is approved, we refund you either to your original payment method (card, UPI, or
          bank, via Razorpay) or as Store Wallet credit — whichever you preferred, where possible. Wallet
          credit lands as soon as we process it and never expires; refunds to your original payment method
          typically take a few business days to reflect, depending on your bank. Either way, your order
          status updates the moment it's done.
        </p>
      </div>

      <div>
        <h2 id="damaged-items">Damaged, defective, or wrong items</h2>
        <p>
          This is different from a change of mind, and we treat it that way. Let us know within 48 hours of
          delivery with a photo, and we'll prioritise getting it fixed, replaced, or refunded — without the
          usual back-and-forth.
        </p>
      </div>

      <div>
        <h2 id="exclusions">What's usually not eligible</h2>
        <p>
          Items that have been installed, used beyond checking they work, damaged through misuse, or
          missing their original packaging typically can't be returned for a change of mind. If a product
          is genuinely faulty, though, that's a warranty matter instead — regardless of its condition.
        </p>
      </div>

      <div>
        <h2 id="warranty-vs-returns">Warranty vs. returns</h2>
        <p>
          A fault that shows up after your return window has passed is usually a warranty matter rather
          than a return — check the Warranty Information on the product page, or see our{" "}
          <Link to="/warranty-policy" className="font-medium text-primary hover:underline">
            Warranty Policy
          </Link>{" "}
          for how to get it serviced.
        </p>
      </div>

      <div>
        <h2>Need a hand?</h2>
        <p>
          Message our{" "}
          <Link to="/contact" className="font-medium text-primary hover:underline">
            support team
          </Link>{" "}
          with your order number — we'll guide you through it personally.
        </p>
      </div>
    </PolicyPage>
  );
}

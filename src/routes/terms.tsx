import { createFileRoute, Link } from "@tanstack/react-router";
import { PolicyPage } from "@/components/PolicyPage";

export const Route = createFileRoute("/terms")({ component: TermsPage });

const sections = [
  { id: "who-we-are", label: "Who we are" },
  { id: "your-account", label: "Your account" },
  { id: "products-pricing", label: "Products & pricing" },
  { id: "orders-payment", label: "Orders & payment" },
  { id: "store-wallet", label: "Store Wallet" },
  { id: "fulfillment", label: "Delivery, cancellations & returns" },
  { id: "offers", label: "Offers & coupons" },
  { id: "acceptable-use", label: "Using the site fairly" },
  { id: "ownership", label: "Content on this site" },
  { id: "liability", label: "Keeping things realistic" },
  { id: "grievance", label: "If something's not right" },
  { id: "governing-law", label: "Governing law" },
  { id: "changes", label: "Changes to these Terms" },
  { id: "contact", label: "Questions?" },
];

function TermsPage() {
  return (
    <PolicyPage
      title="Terms & Conditions"
      subtitle="The plain-language basics of shopping with My Shop — worth an actual read, we promise."
      lastUpdated="24 July 2026"
    >
      <p>
        My Shop is an online store for electrical essentials — switches, wiring, fans, fittings, and more —
        from brands people already trust. These Terms explain how things work when you browse, create an
        account, or place an order with us. By using our website or placing an order, you're agreeing to
        them, so we've kept the language plain on purpose.
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
        <h2 id="who-we-are">Who we are, and who this is for</h2>
        <p>
          My Shop is owned and operated by <strong>[Registered business/proprietor name]</strong> ("My
          Shop," "we," "us"). Everything we list is our own stock, not a third-party marketplace listing —
          so when something needs fixing, you're dealing with the people who actually sold it to you.
        </p>
        <p>
          To shop with us, you should be at least 18, or using the site with a parent or guardian's
          supervision and agreement to these Terms. When you give us information — for an account, an
          order, or a support request — we just ask that it's accurate and genuinely yours to give.
        </p>
      </div>

      <div>
        <h2 id="your-account">Your account</h2>
        <p>
          Creating an account lets you track orders, save addresses, and use Store Wallet credit. Sign up
          with your email or continue with Google — either way, you're responsible for keeping your login
          secure and for activity under your account. If you ever suspect someone else has access, tell us
          right away and we'll help lock things down. For your security, we sign you out automatically
          after a period of inactivity, and we may occasionally ask you to re-verify your identity.
        </p>
      </div>

      <div>
        <h2 id="products-pricing">Products, pricing & MRP</h2>
        <p>
          We keep product photos, specifications, warranty details, and stock counts as accurate and
          current as we can. Prices are listed in Indian Rupees, and — in line with Indian retail rules —
          our MRP already includes applicable taxes, so the price you see is the price you pay. Occasionally
          a price or stock level changes between adding something to your cart and checking out; if that
          happens in a way that affects your order, we'll always tell you before charging you, never after.
        </p>
      </div>

      <div>
        <h2 id="orders-payment">Placing an order & payment</h2>
        <p>
          Checking out is an offer to buy, which we confirm once your payment is verified. Payments are
          handled through Razorpay, an RBI-regulated payment gateway — your card, UPI, or banking details go
          straight to them over an encrypted connection, and we never see or store your full card details.
          Closed the payment window before finishing? Your order isn't lost — find it under "My Orders" and
          complete payment whenever you're ready.
        </p>
      </div>

      <div>
        <h2 id="store-wallet">Store Wallet credit</h2>
        <p>
          Refunds and any goodwill credit we issue land in your Store Wallet, visible anytime from your
          account. You can apply wallet balance toward any order, in full or in part, alongside another
          payment method for the rest. It's credit for use on My Shop, not cash — it can't be withdrawn or
          transferred to a bank account or another person, and currently it doesn't expire.
        </p>
      </div>

      <div>
        <h2 id="fulfillment">Delivery, cancellations & returns</h2>
        <p>
          We don't charge cancellation fees — if you need to cancel before your order ships, just reach out
          and we'll take care of it. Delivery areas and charges, cancelling or returning an order, and
          what's covered by warranty each deserve more room than a summary paragraph, so they live on their
          own pages:
        </p>
        <ul>
          <li>
            <Link to="/shipping-policy" className="font-medium text-primary hover:underline">
              Shipping Policy
            </Link>
          </li>
          <li>
            <Link to="/returns-policy" className="font-medium text-primary hover:underline">
              Return &amp; Refund Policy
            </Link>
          </li>
          <li>
            <Link to="/warranty-policy" className="font-medium text-primary hover:underline">
              Warranty Policy
            </Link>
          </li>
        </ul>
      </div>

      <div>
        <h2 id="offers">Offers & coupon codes</h2>
        <p>
          From time to time we run discounts and coupon codes. Each one comes with its own conditions —
          shown to you at checkout, like a minimum order value or a validity window — and we may modify or
          withdraw an offer at any time without affecting orders already placed under it. Unless we say
          otherwise, offers can't be combined or exchanged for cash.
        </p>
      </div>

      <div>
        <h2 id="acceptable-use">Using the site fairly</h2>
        <p>We keep this store useful for everyone by asking that you:</p>
        <ul>
          <li>Give accurate information when creating an account or placing an order</li>
          <li>Don't interfere with the site's security, scrape it at scale, or exploit bugs for gain</li>
          <li>Don't use the site for anything illegal, fraudulent, or intended to harm us or other shoppers</li>
          <li>Buy for genuine personal or business use, not to abuse offers meant for individual customers</li>
        </ul>
        <p>
          We may suspend or close an account we reasonably believe is misusing the site — we'll always try
          to talk to you first.
        </p>
      </div>

      <div>
        <h2 id="ownership">Content on this site</h2>
        <p>
          Product descriptions, photography, page design, and the My Shop name and logo belong to us or our
          licensors, including the brands whose products we sell. Browse, screenshot for personal reference,
          and share links freely — just don't republish, resell, or pass off our content as your own without
          asking us first.
        </p>
      </div>

      <div>
        <h2 id="liability">Keeping things realistic</h2>
        <p>
          We work hard to keep this site accurate and running smoothly, but like any online store, we can't
          promise it's error-free or available every second. If we make a genuine pricing or listing
          mistake, we'll tell you and make it right rather than quietly honouring it. Nothing here limits
          any right you have under Indian consumer protection law — these Terms sit alongside those rights,
          not in place of them.
        </p>
      </div>

      <div>
        <h2 id="grievance">If something's not right</h2>
        <p>
          We'd always rather you tell us directly than leave frustrated. In line with the Consumer
          Protection (E-Commerce) Rules, 2020, here's who to contact:
        </p>
        <ul>
          <li>
            <strong>Grievance Officer:</strong> [Grievance Officer name]
          </li>
          <li>
            <strong>Email:</strong> support@myshop.example
          </li>
        </ul>
        <p>We'll acknowledge your complaint within 48 hours and aim to resolve it within one month.</p>
      </div>

      <div>
        <h2 id="governing-law">Governing law</h2>
        <p>
          These Terms are governed by the laws of India, and any disputes are subject to the exclusive
          jurisdiction of the courts in Your City, India.
        </p>
      </div>

      <div>
        <h2 id="changes">Changes to these Terms</h2>
        <p>
          As My Shop grows, these Terms might need to grow with it. We'll update this page when that
          happens and refresh the date at the top, so you can always see what's changed. Continuing to use
          the site after an update means you're accepting the current version.
        </p>
      </div>

      <div>
        <h2 id="contact">Questions?</h2>
        <p>
          Reach out any time through our{" "}
          <Link to="/contact" className="font-medium text-primary hover:underline">
            Contact Us
          </Link>{" "}
          page — we read every message ourselves.
        </p>
      </div>
    </PolicyPage>
  );
}

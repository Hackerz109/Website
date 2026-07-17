import { createFileRoute, Link } from "@tanstack/react-router";
import { PolicyPage } from "@/components/PolicyPage";

export const Route = createFileRoute("/terms")({ component: TermsPage });

function TermsPage() {
  return (
    <PolicyPage
      title="Terms & Conditions"
      subtitle="The plain-language basics of using My Shop."
    >
      <div>
        <h2>Using our site</h2>
        <p>
          By browsing and shopping with My Shop, you're agreeing to use the site fairly and
          honestly — for example, providing accurate information when creating an account or
          placing an order.
        </p>
      </div>

      <div>
        <h2>Product information</h2>
        <p>
          We do our best to keep product details, pricing, and stock levels accurate and
          up to date. Occasionally, something may change between when you view a page and
          when you check out — if that happens, we'll always let you know before charging you.
        </p>
      </div>

      <div>
        <h2>Orders and payment</h2>
        <p>
          Placing an order is an offer to purchase, which we confirm once payment is
          verified. Payments are processed securely, and we never store your full card
          details ourselves.
        </p>
      </div>

      <div>
        <h2>Warranty, shipping, and returns</h2>
        <p>
          Specific terms for product coverage, delivery, and returns are covered in our{" "}
          <Link to="/warranty-policy" className="font-medium text-primary hover:underline">Warranty Policy</Link>,{" "}
          <Link to="/shipping-policy" className="font-medium text-primary hover:underline">Shipping Policy</Link>, and{" "}
          <Link to="/returns-policy" className="font-medium text-primary hover:underline">Return &amp; Refund Policy</Link>.
        </p>
      </div>

      <div>
        <h2>Account responsibility</h2>
        <p>
          You're responsible for keeping your account credentials secure. If you notice any
          unauthorized activity, please let us know right away.
        </p>
      </div>

      <div>
        <h2>Changes to these terms</h2>
        <p>
          We may update these terms occasionally as our store grows. We'll keep this page
          current, and continued use of the site means you accept the latest version.
        </p>
      </div>

      <div>
        <h2>Questions?</h2>
        <p>
          Reach out any time through our{" "}
          <Link to="/contact" className="font-medium text-primary hover:underline">Contact Us</Link> page.
        </p>
      </div>
    </PolicyPage>
  );
}

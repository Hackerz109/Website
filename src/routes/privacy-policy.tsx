import { createFileRoute, Link } from "@tanstack/react-router";
import { PolicyPage } from "@/components/PolicyPage";

export const Route = createFileRoute("/privacy-policy")({ component: PrivacyPolicyPage });

function PrivacyPolicyPage() {
  return (
    <PolicyPage
      title="Privacy Policy"
      subtitle="A clear summary of what we collect and how we use it."
    >
      <p>
        Your trust matters to us. This page explains, in everyday language, what information
        we collect when you shop with us and how we use it to serve you better.
      </p>

      <div>
        <h2>What we collect</h2>
        <ul>
          <li>Account details you provide, like your name and email address.</li>
          <li>Order information, including shipping address and items purchased.</li>
          <li>Basic usage data, like pages visited, to help us improve the site.</li>
        </ul>
      </div>

      <div>
        <h2>How we use it</h2>
        <ul>
          <li>To process and deliver your orders, including warranty and support requests.</li>
          <li>To keep you updated on order status and respond to your questions.</li>
          <li>To improve our products, pages, and overall shopping experience.</li>
        </ul>
      </div>

      <div>
        <h2>What we don't do</h2>
        <p>
          We don't sell your personal information. We only share what's necessary with
          trusted partners who help us operate — such as payment processing and delivery —
          and only to the extent needed to fulfill your order.
        </p>
      </div>

      <div>
        <h2>Your choices</h2>
        <p>
          You can review or update your account details at any time, and you're welcome to
          ask us to delete your data where we're not required to keep it (for example, for
          tax or warranty records). Just reach out through our{" "}
          <Link to="/contact" className="font-medium text-primary hover:underline">
            Contact Us
          </Link>{" "}
          page.
        </p>
      </div>

      <div>
        <h2>Keeping your data safe</h2>
        <p>
          We use industry-standard security practices, including encrypted checkout, to
          protect your information at every step.
        </p>
      </div>
    </PolicyPage>
  );
}

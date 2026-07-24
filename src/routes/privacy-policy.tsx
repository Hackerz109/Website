import { createFileRoute, Link } from "@tanstack/react-router";
import { PolicyPage } from "@/components/PolicyPage";

export const Route = createFileRoute("/privacy-policy")({ component: PrivacyPolicyPage });

const sections = [
  { id: "what-we-collect", label: "What we collect" },
  { id: "location-data", label: "Location & delivery data" },
  { id: "how-we-use-it", label: "How we use it" },
  { id: "who-we-share-with", label: "Who we share it with" },
  { id: "cookies", label: "Cookies & storage" },
  { id: "security", label: "Keeping your data safe" },
  { id: "retention", label: "How long we keep it" },
  { id: "your-rights", label: "Your rights & choices" },
  { id: "children", label: "Children's privacy" },
  { id: "changes", label: "Changes to this policy" },
  { id: "contact", label: "Questions about your data?" },
];

function PrivacyPolicyPage() {
  return (
    <PolicyPage
      title="Privacy Policy"
      subtitle="A clear, specific summary of what we collect, why, and who ever sees it."
      lastUpdated="24 July 2026"
    >
      <p>
        Buying switches, wiring, or a new fan online means trusting us with some personal details — your
        name, your address, sometimes your exact location so delivery actually works. We don't take that
        lightly. This page explains what we collect, why, who we share it with, and the choices you have —
        without the usual legal fog.
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
        <h2 id="what-we-collect">What we collect</h2>
        <ul>
          <li>
            <strong>Account details</strong> — your name, email, and (optionally) phone number, plus a
            profile photo if you sign in with Google.
          </li>
          <li>
            <strong>Order details</strong> — shipping or pickup address, items purchased, order value, and
            your chosen payment and delivery method.
          </li>
          <li>
            <strong>Location data</strong> — if you allow it, your device's GPS coordinates, used to check
            delivery eligibility and place your address accurately.
          </li>
          <li>
            <strong>Payment references</strong> — a payment ID and order ID confirming your transaction,
            from Razorpay. We never receive or store your full card, UPI, or bank details.
          </li>
          <li>
            <strong>Return details</strong> — the reason you give us for a return, and any photos you choose
            to upload as evidence.
          </li>
          <li>
            <strong>Support messages</strong> — anything you send us through Contact Us or WhatsApp.
          </li>
          <li>
            <strong>Technical & security data</strong> — your IP address, a randomly generated device
            identifier, and basic sign-in activity, used to keep accounts secure.
          </li>
        </ul>
      </div>

      <div>
        <h2 id="location-data">Location & delivery data, specifically</h2>
        <p>
          At checkout, we may ask permission to use your device's GPS to check whether we deliver to you
          and to help place your address accurately — smaller towns aren't always well mapped, and a
          precise pin genuinely helps your order reach the right door. Sharing location is never required
          to place an order; you can always type your address manually instead.
        </p>
        <p>
          To turn coordinates into a readable address (and back again), we send them to OpenStreetMap's
          Nominatim service and, for PIN code lookups, India Post's public postal API. Both are used purely
          to help fill in your address fields — every field stays editable by you before you confirm.
        </p>
      </div>

      <div>
        <h2 id="how-we-use-it">How we use it</h2>
        <ul>
          <li>To process, pack, deliver, and support your orders — including warranty and return requests</li>
          <li>To check delivery eligibility and calculate accurate delivery charges for your address</li>
          <li>To keep you updated on order status and reply to your questions</li>
          <li>To keep accounts and checkout secure, and to spot and prevent fraudulent orders or logins</li>
          <li>To understand, in aggregate, how people use the site, so we can improve it</li>
        </ul>
        <p>
          We don't use your information to build advertising profiles, and we don't run third-party ad
          trackers on this site.
        </p>
      </div>

      <div>
        <h2 id="who-we-share-with">Who we share it with</h2>
        <p>
          We don't sell personal information, to anyone, ever. We only share what's needed, with partners
          who help us actually run the store:
        </p>
        <ul>
          <li>
            <strong>Razorpay</strong> — to process your payment securely (RBI-regulated payment gateway)
          </li>
          <li>
            <strong>Supabase</strong> — our database and authentication provider, storing your account and
            order data securely
          </li>
          <li>
            <strong>OpenStreetMap Nominatim &amp; India Post</strong> — to convert addresses and
            coordinates, as above
          </li>
          <li>
            <strong>Google</strong> — only if you choose to sign in with your Google account
          </li>
          <li>
            <strong>Cloudflare</strong> — to tell real visitors from bots during sign-in
          </li>
          <li>
            <strong>WhatsApp/Meta</strong> — only when phone verification is active, to deliver a one-time
            verification code
          </li>
        </ul>
        <p>
          We may also share information if the law requires it, or to protect the rights, property, or
          safety of My Shop, our customers, or the public.
        </p>
      </div>

      <div>
        <h2 id="cookies">Cookies & similar technologies</h2>
        <p>
          We keep this simple: we use local storage in your browser to keep you signed in, remember light
          preferences, and recognise your device for fraud prevention — not to track you around the
          internet or serve you ads elsewhere. We don't currently use third-party analytics or advertising
          cookies.
        </p>
      </div>

      <div>
        <h2 id="security">Keeping your data safe</h2>
        <p>
          Your connection to our site is encrypted, and access to your account and order data is restricted
          by row-level security on our database — so even our own systems only surface what a given login
          is actually allowed to see. Return photos are stored privately, never publicly accessible. No
          online system is completely risk-free, but we treat your data the way we'd want a store to treat
          ours.
        </p>
      </div>

      <div>
        <h2 id="retention">How long we keep it</h2>
        <p>
          We keep account and order information for as long as your account is active, plus a reasonable
          period afterward for tax, warranty, and legal record-keeping. If you ask us to delete your data,
          we will, except where we're required to retain it — invoices for completed orders, for example.
        </p>
      </div>

      <div>
        <h2 id="your-rights">Your rights & choices</h2>
        <p>
          You can review and update most of your account details yourself, anytime, from your profile.
          You're also welcome to ask us to:
        </p>
        <ul>
          <li>Send you a copy of the personal data we hold about you</li>
          <li>Correct anything that's inaccurate</li>
          <li>Delete your account and associated data, where we're not required to keep it</li>
        </ul>
        <p>
          Just reach out through our{" "}
          <Link to="/contact" className="font-medium text-primary hover:underline">
            Contact Us
          </Link>{" "}
          page — a real person handles it, not a ticket queue.
        </p>
      </div>

      <div>
        <h2 id="children">Children's privacy</h2>
        <p>
          My Shop is meant for adults making purchases for their home or business. We don't knowingly
          collect personal information from children, and if we learn we have, we'll delete it.
        </p>
      </div>

      <div>
        <h2 id="changes">Changes to this policy</h2>
        <p>
          If how we handle your data changes meaningfully, we'll update this page and refresh the date at
          the top. We won't quietly expand what we collect or how we use it without saying so here.
        </p>
      </div>

      <div>
        <h2 id="contact">Questions about your data?</h2>
        <p>
          Reach us through our{" "}
          <Link to="/contact" className="font-medium text-primary hover:underline">
            Contact Us
          </Link>{" "}
          page, or write to support@myshop.example — for anything privacy-related, a real person responds.
        </p>
      </div>
    </PolicyPage>
  );
}

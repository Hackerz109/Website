import { Link } from "@tanstack/react-router";
import { Zap, Mail, Phone, MapPin } from "lucide-react";

const companyLinks = [
  { label: "About Us", to: "/about" as const },
  { label: "Products", to: "/" as const, hash: "#products" },
  { label: "Categories", to: "/" as const, hash: "#products" },
];

const supportLinks = [
  { label: "Contact Us", to: "/contact" as const },
  { label: "Warranty Policy", to: "/warranty-policy" as const },
  { label: "Shipping Policy", to: "/shipping-policy" as const },
  { label: "Return & Refund Policy", to: "/returns-policy" as const },
  { label: "Privacy Policy", to: "/privacy-policy" as const },
  { label: "Terms & Conditions", to: "/terms" as const },
];

export function StoreFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-soft">
                <Zap className="h-4 w-4 fill-current" />
              </span>
              <span className="font-display text-lg font-bold tracking-tight text-foreground">
                Sanjay Electricals
              </span>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              At Sanjay Electricals, we believe trust is earned through consistency, quality, and genuine care. That's why we focus on offering reliable products from trusted brands, transparent pricing, and friendly support at every step. 
              Our goal is simple: to make every purchase easy, every recommendation honest, and every customer confident that they've chosen a store they can rely on again and again.
            </p>
            <div className="mt-5 space-y-2 text-sm text-muted-foreground">
              <a href="tel:+10000000000" className="flex items-center gap-2 hover:text-foreground">
                <Phone className="h-3.5 w-3.5" /> +91 9580269784
              </a>
              <a href="mailto:support@myshop.example" className="flex items-center gap-2 hover:text-foreground">
                <Mail className="h-3.5 w-3.5" /> support@sanjayelectricals.shop
              </a>
              <p className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5" /> Old Katra, Prayagraj
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-foreground">Company</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {companyLinks.map((link) => (
                <li key={link.label}>
                  <Link to={link.to} hash={link.hash} className="text-muted-foreground hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-foreground">Customer Support</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {supportLinks.map((link) => (
                <li key={link.label}>
                  <Link to={link.to} className="text-muted-foreground hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground md:flex-row md:items-center">
          <p>© {new Date().getFullYear()} My Shop. All rights reserved.</p>
          <p>Made with care, for customers who expect better.</p>
        </div>
      </div>
    </footer>
  );
}

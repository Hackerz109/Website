import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck, Truck, HeartHandshake, Zap } from "lucide-react";
import { StoreHeader } from "@/components/StoreHeader";
import { StoreFooter } from "@/components/StoreFooter";

export const Route = createFileRoute("/about")({ component: AboutPage });

const values = [
  {
    icon: ShieldCheck,
    title: "Quality you can trust",
    desc: "Every product we list is chosen because we'd use it ourselves — genuine parts, real warranties, no shortcuts.",
  },
  {
    icon: Truck,
    title: "Reliable, transparent delivery",
    desc: "Live stock counts and clear timelines, so you always know what to expect and when.",
  },
  {
    icon: HeartHandshake,
    title: "People, not just support tickets",
    desc: "Our team answers questions before you buy and stands by you after — no scripts, just real help.",
  },
];

function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <StoreHeader />
      <section className="mx-auto max-w-4xl px-6 py-14 md:py-20">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-soft">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          About My Shop
        </span>
        <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-foreground md:text-5xl">
          Sanjay Electricals: Shop that builds trust.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
          At Sanjay Electricals, we believe that great businesses are built on trust, not just transactions. Every customer who walks through our doors or visits us online deserves honest advice, quality products, fair prices, and dependable service.

Your satisfaction is our highest priority. Whether you're buying a single switch or planning a complete electrical project, we're committed to helping you find the right solution with confidence. We carefully select products from trusted brands and stand behind what we sell because we value long-term relationships over short-term sales.

Our goal isn't just to serve customers—it's to earn your trust, one purchase at a time. Thank you for choosing Sanjay Electricals. We look forward to being your reliable partner for all your electrical needs.
        </p>
      </section>

      <section className="border-y border-border bg-card">
        <div className="mx-auto grid max-w-5xl gap-6 px-6 py-14 md:grid-cols-3">
          {values.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border border-border bg-background p-6 shadow-soft">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <p className="mt-4 text-sm font-semibold text-foreground">{title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-14 md:py-20">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-soft md:p-10">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-soft">
            <Zap className="h-4 w-4 fill-current" />
          </span>
          <h2 className="mt-4 text-xl font-bold text-foreground">Still have questions?</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            We're always happy to talk products, warranties, or your order. Visit our{" "}
            <a href="/contact" className="font-medium text-primary hover:underline">
              Contact Us
            </a>{" "}
            page and reach out any way that's convenient for you.
          </p>
        </div>
      </section>
      <StoreFooter />
    </div>
  );
}

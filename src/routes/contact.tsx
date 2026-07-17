import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Phone, Mail, MapPin, Clock, MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { StoreHeader } from "@/components/StoreHeader";
import { StoreFooter } from "@/components/StoreFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/contact")({ component: ContactPage });

const contactDetails = [
  { icon: Phone, label: "Phone", value: "+1 (000) 000-0000", href: "tel:+10000000000" },
  { icon: MessageCircle, label: "WhatsApp", value: "+1 (000) 000-0000", href: "https://wa.me/10000000000" },
  { icon: Mail, label: "Email", value: "support@myshop.example", href: "mailto:support@myshop.example" },
  { icon: MapPin, label: "Store address", value: "123 Market Street, Your City", href: undefined },
  { icon: Clock, label: "Business hours", value: "Mon–Sat, 9:00 AM – 7:00 PM", href: undefined },
];

function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sending, setSending] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error("Please fill in your name, email, and message.");
      return;
    }
    setSending(true);
    // No backend endpoint yet — this simply confirms receipt to the customer.
    // Wire this up to an email service or a Supabase table when one is ready.
    setTimeout(() => {
      setSending(false);
      setForm({ name: "", email: "", message: "" });
      toast.success("Thanks for reaching out — we'll get back to you shortly.");
    }, 500);
  }

  return (
    <div className="min-h-screen bg-background">
      <StoreHeader />
      <div className="mx-auto max-w-5xl px-6 py-14 md:py-20">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
          We're here to help
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
          Whether you have a question before purchasing or need assistance after your order,
          our team is always happy to assist. Reach out however's easiest for you.
        </p>

        <div className="mt-10 grid gap-10 md:grid-cols-5">
          <div className="md:col-span-2">
            <div className="space-y-4">
              {contactDetails.map(({ icon: Icon, label, value, href }) => (
                <div key={label} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{label}</p>
                    {href ? (
                      <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="text-sm font-semibold text-foreground hover:text-primary">
                        {value}
                      </a>
                    ) : (
                      <p className="text-sm font-semibold text-foreground">{value}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="md:col-span-3 space-y-4 rounded-2xl border border-border bg-card p-6 shadow-soft md:p-8">
            <h2 className="text-lg font-semibold text-foreground">Send us a message</h2>
            <div>
              <Label htmlFor="name">Your name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Jane Doe"
              />
            </div>
            <div>
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <Label htmlFor="message">How can we help?</Label>
              <Textarea
                id="message"
                rows={5}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Tell us a bit about what you need…"
              />
            </div>
            <Button type="submit" className="rounded-xl shadow-soft" disabled={sending}>
              <Send className="mr-2 h-4 w-4" />
              {sending ? "Sending…" : "Send message"}
            </Button>
          </form>
        </div>
      </div>
      <StoreFooter />
    </div>
  );
}

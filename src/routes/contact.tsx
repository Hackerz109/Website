import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Phone, Mail, MapPin, Clock, MessageCircle, Send, LogIn } from "lucide-react";
import { toast } from "sonner";
import { StoreHeader } from "@/components/StoreHeader";
import { StoreFooter } from "@/components/StoreFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { createSupportTicket } from "@/lib/supportTickets";

export const Route = createFileRoute("/contact")({ component: ContactPage });

const contactDetails = [
  { icon: Phone, label: "Phone", value: "+91 9580269784", href: "tel:+919580269784" },
  { icon: MessageCircle, label: "WhatsApp", value: "+91 9580269784", href: "https://wa.me/9580269784" },
  { icon: Mail, label: "Email", value: "support@sanjayelectricals.shop", href: "mailto:support@sanjayelectricals.shop" },
  { icon: MapPin, label: "Store address", value: "Old katra, Prayagraj", href: undefined },
  { icon: Clock, label: "Business hours", value: "Mon–Sun, 9:30 AM – 8:00 PM", href: undefined },
];

function ContactPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ subject: "", message: "" });
  const [sending, setSending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.message.trim()) {
      toast.error("Tell us a bit about what you need.");
      return;
    }
    setSending(true);
    const result = await createSupportTicket(form.subject.trim() || "General question", form.message.trim());
    setSending(false);
    if (result.success && result.ticket_id) {
      setForm({ subject: "", message: "" });
      toast.success("Sent — we'll reply here and by email.");
      navigate({ to: "/support/$id", params: { id: result.ticket_id } });
    } else {
      toast.error(result.message || "Couldn't send that — try again.");
    }
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

          {loading ? (
            <div className="md:col-span-3 h-64 animate-pulse rounded-2xl border bg-secondary/30" />
          ) : !user ? (
            <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-border bg-card p-10 text-center shadow-soft md:col-span-3">
              <MessageCircle className="h-8 w-8 text-muted-foreground" />
              <div>
                <h2 className="text-lg font-semibold text-foreground">Sign in to message us</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  We'll keep your conversation here so you can track replies and pick up right where you left off.
                </p>
              </div>
              <Button asChild className="rounded-xl shadow-soft">
                <Link to="/auth">
                  <LogIn className="mr-2 h-4 w-4" /> Sign in
                </Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="md:col-span-3 space-y-4 rounded-2xl border border-border bg-card p-6 shadow-soft md:p-8">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-foreground">Send us a message</h2>
                <Link to="/support" className="text-xs font-medium text-primary underline underline-offset-4">
                  View past conversations
                </Link>
              </div>
              <div>
                <Label htmlFor="subject">What's this about? (optional)</Label>
                <Input
                  id="subject"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder="e.g. Order question, product help…"
                />
              </div>
              <div>
                <Label htmlFor="message">Your message</Label>
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
          )}
        </div>
      </div>
      <StoreFooter />
    </div>
  );
}

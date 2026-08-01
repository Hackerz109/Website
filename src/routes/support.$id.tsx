import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Send } from "lucide-react";
import { StoreHeader } from "@/components/StoreHeader";
import { StoreFooter } from "@/components/StoreFooter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchTicket,
  fetchTicketMessages,
  addSupportMessage,
  ticketStatusLabel,
  ticketStatusBadgeClass,
} from "@/lib/supportTickets";

export const Route = createFileRoute("/support/$id")({ component: SupportThreadPage });

function SupportThreadPage() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const { data: ticket } = useQuery({
    enabled: !!user,
    queryKey: ["support-ticket", id],
    queryFn: () => fetchTicket(id),
    refetchInterval: 6000,
  });

  const { data: messages, isLoading } = useQuery({
    enabled: !!user,
    queryKey: ["support-messages", id],
    queryFn: () => fetchTicketMessages(id),
    refetchInterval: 6000,
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!draft.trim()) return;
    setSending(true);
    const result = await addSupportMessage(id, draft.trim());
    setSending(false);
    if (result.success) {
      setDraft("");
      qc.invalidateQueries({ queryKey: ["support-messages", id] });
      qc.invalidateQueries({ queryKey: ["support-ticket", id] });
      qc.invalidateQueries({ queryKey: ["my-tickets"] });
    } else {
      toast.error(result.message || "Couldn't send that — try again.");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <StoreHeader />
      <div className="mx-auto max-w-2xl px-6 py-8">
        <Link to="/support" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> My conversations
        </Link>

        <div className="mt-3 flex items-center justify-between gap-3">
          <h1 className="truncate text-xl font-semibold tracking-tight">{ticket?.subject ?? "Conversation"}</h1>
          {ticket && <Badge className={ticketStatusBadgeClass(ticket.status)}>{ticketStatusLabel(ticket.status)}</Badge>}
        </div>

        <div className="mt-5 flex flex-col rounded-2xl border bg-card shadow-sm">
          <div ref={scrollRef} className="flex h-[55vh] min-h-[320px] flex-col gap-3 overflow-y-auto p-4">
            {isLoading ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading…</div>
            ) : (
              messages?.map((m) => (
                <div
                  key={m.id}
                  className={
                    m.sender_role === "customer"
                      ? "max-w-[85%] self-end rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground"
                      : "max-w-[85%] self-start rounded-2xl rounded-bl-sm bg-secondary px-4 py-2.5 text-sm text-foreground"
                  }
                >
                  <p className="whitespace-pre-wrap">{m.body}</p>
                  <p
                    className={
                      m.sender_role === "customer"
                        ? "mt-1 text-[10px] text-primary-foreground/70"
                        : "mt-1 text-[10px] text-muted-foreground"
                    }
                  >
                    {new Date(m.created_at).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
          <div className="flex items-end gap-2 border-t p-3">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type a reply…"
              rows={2}
              className="resize-none"
            />
            <Button onClick={handleSend} disabled={sending || !draft.trim()} size="icon" className="flex-shrink-0 rounded-xl">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      <StoreFooter />
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Send, CheckCircle2, RotateCcw, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { addSupportMessage, adminSetTicketStatus, ticketStatusLabel, ticketStatusBadgeClass } from "@/lib/supportTickets";

type SupportTicket = Database["public"]["Tables"]["support_tickets"]["Row"];
type SupportMessage = Database["public"]["Tables"]["support_messages"]["Row"];

export const Route = createFileRoute("/admin/support/$id")({ component: AdminSupportThread });

function AdminSupportThread() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: ticket } = useQuery({
    queryKey: ["admin-ticket", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("support_tickets").select("*").eq("id", id).single();
      if (error) throw error;
      return data as SupportTicket;
    },
    refetchInterval: 8000,
  });

  const { data: messages, isLoading } = useQuery({
    queryKey: ["admin-ticket-messages", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_messages")
        .select("*")
        .eq("ticket_id", id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as SupportMessage[];
    },
    refetchInterval: 8000,
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
      qc.invalidateQueries({ queryKey: ["admin-ticket-messages", id] });
      qc.invalidateQueries({ queryKey: ["admin-ticket", id] });
      qc.invalidateQueries({ queryKey: ["admin-tickets"] });
    } else {
      toast.error(result.message || "Couldn't send that — try again.");
    }
  }

  async function toggleStatus() {
    if (!ticket) return;
    setUpdatingStatus(true);
    const next = ticket.status === "resolved" ? "open" : "resolved";
    const result = await adminSetTicketStatus(id, next);
    setUpdatingStatus(false);
    if (result.success) {
      toast.success(next === "resolved" ? "Marked resolved." : "Reopened.");
      qc.invalidateQueries({ queryKey: ["admin-ticket", id] });
      qc.invalidateQueries({ queryKey: ["admin-tickets"] });
    } else {
      toast.error(result.message || "Couldn't update status.");
    }
  }

  return (
    <div>
      <Link to="/admin/support" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Support
      </Link>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight">{ticket?.subject ?? "Conversation"}</h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <span>{ticket?.customer_name || "Customer"}</span>
            {ticket?.customer_email && (
              <a href={`mailto:${ticket.customer_email}`} className="inline-flex items-center gap-1 hover:text-foreground">
                <Mail className="h-3.5 w-3.5" /> {ticket.customer_email}
              </a>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {ticket && <Badge className={ticketStatusBadgeClass(ticket.status)}>{ticketStatusLabel(ticket.status)}</Badge>}
          <Button variant="outline" size="sm" disabled={updatingStatus || !ticket} onClick={toggleStatus}>
            {ticket?.status === "resolved" ? (
              <>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reopen
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Mark resolved
              </>
            )}
          </Button>
        </div>
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
                  m.sender_role === "admin"
                    ? "max-w-[85%] self-end rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground"
                    : "max-w-[85%] self-start rounded-2xl rounded-bl-sm bg-secondary px-4 py-2.5 text-sm text-foreground"
                }
              >
                <p className="whitespace-pre-wrap">{m.body}</p>
                <p
                  className={
                    m.sender_role === "admin" ? "mt-1 text-[10px] text-primary-foreground/70" : "mt-1 text-[10px] text-muted-foreground"
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
  );
}

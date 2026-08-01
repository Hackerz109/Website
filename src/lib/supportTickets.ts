import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type SupportTicket = Database["public"]["Tables"]["support_tickets"]["Row"];
export type SupportMessage = Database["public"]["Tables"]["support_messages"]["Row"];
export type TicketStatus = Database["public"]["Enums"]["support_ticket_status"];

export interface SupportRpcResult {
  success: boolean;
  message?: string;
  ticket_id?: string;
  message_id?: string;
}

/** Best-effort — never blocks the caller on notification delivery. */
function fireNotify(messageId: string) {
  fetch("/api/support-notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message_id: messageId }),
  }).catch(() => {});
}

export async function createSupportTicket(subject: string, message: string): Promise<SupportRpcResult> {
  const { data, error } = await supabase.rpc("create_support_ticket", { p_subject: subject, p_message: message });
  if (error) return { success: false, message: error.message };
  const result = data as unknown as SupportRpcResult;
  if (result.success && result.message_id) fireNotify(result.message_id);
  return result;
}

export async function addSupportMessage(ticketId: string, body: string): Promise<SupportRpcResult> {
  const { data, error } = await supabase.rpc("add_support_message", { p_ticket_id: ticketId, p_body: body });
  if (error) return { success: false, message: error.message };
  const result = data as unknown as SupportRpcResult;
  if (result.success && result.message_id) fireNotify(result.message_id);
  return result;
}

export async function adminSetTicketStatus(ticketId: string, status: TicketStatus): Promise<SupportRpcResult> {
  const { data, error } = await supabase.rpc("admin_set_ticket_status", { p_ticket_id: ticketId, p_status: status });
  if (error) return { success: false, message: error.message };
  return data as unknown as SupportRpcResult;
}

export async function fetchMyTickets(): Promise<SupportTicket[]> {
  const { data, error } = await supabase
    .from("support_tickets")
    .select("*")
    .order("last_message_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchTicket(ticketId: string): Promise<SupportTicket | null> {
  const { data, error } = await supabase.from("support_tickets").select("*").eq("id", ticketId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchTicketMessages(ticketId: string): Promise<SupportMessage[]> {
  const { data, error } = await supabase
    .from("support_messages")
    .select("*")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export function ticketStatusLabel(status: TicketStatus): string {
  return status === "resolved" ? "Resolved" : "Open";
}

export function ticketStatusBadgeClass(status: TicketStatus): string {
  return status === "resolved"
    ? "bg-green-100 text-green-700 hover:bg-green-100"
    : "bg-amber-100 text-amber-700 hover:bg-amber-100";
}

/** Relative time string for ticket list rows, e.g. "5m ago", "2d ago". */
export function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

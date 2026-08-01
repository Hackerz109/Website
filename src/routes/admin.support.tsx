import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { ticketStatusLabel, ticketStatusBadgeClass, timeAgo } from "@/lib/supportTickets";

type SupportTicket = Database["public"]["Tables"]["support_tickets"]["Row"];

export const Route = createFileRoute("/admin/support")({ component: AdminSupport });

function AdminSupport() {
  const location = useLocation();

  // Same Outlet + useLocation split as admin.orders.tsx / admin.returns.tsx
  // — hand off to admin.support.$id.tsx once we're past the exact list path.
  const isListView = location.pathname === "/admin/support";

  const { data, isLoading } = useQuery({
    enabled: isListView,
    queryKey: ["admin-tickets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .order("last_message_at", { ascending: false });
      if (error) throw error;
      return data as SupportTicket[];
    },
    refetchInterval: isListView ? 15000 : false,
  });

  if (!isListView) {
    return <Outlet />;
  }

  const needsReply = (t: SupportTicket) => t.status === "open" && t.last_message_from === "customer";

  return (
    <div>
      <h1 className="flex items-center gap-2 text-xl font-semibold">
        <MessageCircle className="h-5 w-5" /> Support
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">Messages from customers via /contact.</p>

      {isLoading ? (
        <div className="mt-6 space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl border bg-secondary/30" />
          ))}
        </div>
      ) : (data ?? []).length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed p-12 text-center text-muted-foreground">
          No conversations yet.
        </div>
      ) : (
        <div className="mt-6 space-y-2">
          {data?.map((t) => (
            <Link
              key={t.id}
              to="/admin/support/$id"
              params={{ id: t.id }}
              className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium text-foreground">{t.customer_name || t.customer_email || "Customer"}</p>
                  {needsReply(t) && <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Needs reply</Badge>}
                  <Badge className={ticketStatusBadgeClass(t.status)}>{ticketStatusLabel(t.status)}</Badge>
                </div>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">{t.subject}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{timeAgo(t.last_message_at)}</p>
              </div>
              <ArrowUpRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { MessageCircle, ArrowRight, Plus } from "lucide-react";
import { StoreHeader } from "@/components/StoreHeader";
import { StoreFooter } from "@/components/StoreFooter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { fetchMyTickets, ticketStatusLabel, ticketStatusBadgeClass, timeAgo } from "@/lib/supportTickets";

export const Route = createFileRoute("/support")({ component: SupportPage });

function SupportPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // "/support/$id" nests under this route the same way "orders/$id" nests
  // under orders.tsx — if we're not on the exact /support list, hand off
  // entirely to the matched child instead of also rendering the list.
  const isListView = location.pathname === "/support";

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const { data, isLoading } = useQuery({
    enabled: !!user && isListView,
    queryKey: ["my-tickets", user?.id],
    queryFn: fetchMyTickets,
  });

  if (!isListView) {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen bg-background">
      <StoreHeader />
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">My conversations</h1>
            <p className="mt-1 text-sm text-muted-foreground">Messages you've sent us, and our replies.</p>
          </div>
          <Button asChild size="sm" className="rounded-lg shadow-soft">
            <Link to="/contact">
              <Plus className="mr-1.5 h-4 w-4" /> New message
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="mt-6 space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl border bg-secondary/30" />
            ))}
          </div>
        ) : (data ?? []).length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed p-16 text-center text-muted-foreground">
            <MessageCircle className="mx-auto h-8 w-8 opacity-40" />
            <p className="mt-3">No conversations yet.</p>
            <Link to="/contact" className="mt-1 inline-block text-sm font-medium text-primary underline underline-offset-4">
              Send us a message
            </Link>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {data?.map((t) => (
              <Link
                key={t.id}
                to="/support/$id"
                params={{ id: t.id }}
                className="flex items-center justify-between gap-3 rounded-2xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-foreground">{t.subject}</p>
                    <Badge className={ticketStatusBadgeClass(t.status)}>{ticketStatusLabel(t.status)}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t.last_message_from === "admin" ? "We replied" : "You messaged"} · {timeAgo(t.last_message_at)}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </div>
        )}
      </div>
      <StoreFooter />
    </div>
  );
}

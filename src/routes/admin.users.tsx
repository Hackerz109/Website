import { useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, ChevronRight, ChevronLeft, Shield, Users as UsersIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { formatMoney } from "@/stores/cart";
import { initials } from "@/lib/utils";
import { adminListCustomers } from "@/lib/admin-customers";

export const Route = createFileRoute("/admin/users")({ component: AdminUsersPage });

const PAGE_SIZE = 20;

function AdminUsersPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [committedSearch, setCommittedSearch] = useState("");
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-customers", committedSearch, page],
    queryFn: () => adminListCustomers(committedSearch, PAGE_SIZE, page * PAGE_SIZE),
  });

  const rows = data?.rows ?? [];
  const total = data?.totalCount ?? 0;
  const from = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const to = Math.min(total, (page + 1) * PAGE_SIZE);

  function submitSearch(e: FormEvent) {
    e.preventDefault();
    setPage(0);
    setCommittedSearch(search);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Users</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Every customer account, their Customer ID, orders, and wallet balance.
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground">
          <UsersIcon className="h-3.5 w-3.5" /> {total} total
        </div>
      </div>

      <form onSubmit={submitSearch} className="mt-5 flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, phone, or Customer ID…"
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      <div className="mt-5 space-y-2">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-secondary/50" />
          ))
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
            {committedSearch ? "No customers match that search." : "No customers yet."}
          </div>
        ) : (
          rows.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => navigate({ to: "/admin/users/$id", params: { id: c.id } })}
              className="flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors hover:bg-secondary/40"
            >
              <Avatar className="h-10 w-10 flex-shrink-0">
                <AvatarImage src={c.avatar_url ?? undefined} alt="" />
                <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                  {initials(c.full_name, c.email)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">{c.full_name || "Unnamed customer"}</p>
                  {c.is_admin && (
                    <Badge variant="secondary" className="flex items-center gap-1 text-[10px]">
                      <Shield className="h-2.5 w-2.5" /> Admin
                    </Badge>
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground">{c.email}</p>
                <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{c.customer_code}</p>
              </div>
              <div className="hidden flex-shrink-0 text-right sm:block">
                <p className="text-sm font-semibold">
                  {c.order_count} order{c.order_count === 1 ? "" : "s"}
                </p>
                <p className="text-xs text-muted-foreground">{formatMoney(c.total_spent_cents)} spent</p>
              </div>
              <div className="hidden flex-shrink-0 text-right md:block">
                <p className="text-sm font-semibold">{formatMoney(c.wallet_balance_cents)}</p>
                <p className="text-xs text-muted-foreground">wallet</p>
              </div>
              <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            </button>
          ))
        )}
      </div>

      {total > PAGE_SIZE && (
        <div className="mt-5 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {from}–{to} of {total}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Prev
            </Button>
            <Button variant="outline" size="sm" disabled={to >= total} onClick={() => setPage((p) => p + 1)}>
              Next <ChevronRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SearchX, User, ShoppingCart, Package, Ticket } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { adminGlobalSearch, totalResultCount } from "@/lib/adminSearch";
import { AdminSearchBar } from "@/components/AdminSearchBar";
import { formatMoney } from "@/stores/cart";

export const Route = createFileRoute("/admin/search")({
  component: AdminSearchPage,
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === "string" ? search.q : "",
  }),
});

function AdminSearchPage() {
  const { q } = Route.useSearch();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-search-results", q],
    queryFn: () => adminGlobalSearch(q),
    enabled: q.trim().length > 1,
  });

  const count = data ? totalResultCount(data) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Search</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {q ? (isLoading ? "Searching…" : `${count} result${count !== 1 ? "s" : ""} for "${q}"`) : "Search across orders, products, coupons, and customers"}
        </p>
      </div>

      <div className="max-w-lg">
        <AdminSearchBar />
      </div>

      {!q || q.trim().length < 2 ? (
        <div className="rounded-xl border border-dashed p-16 text-center text-sm text-muted-foreground">
          Type at least 2 characters to search.
        </div>
      ) : isLoading ? (
        <div className="rounded-xl border p-16 text-center text-sm text-muted-foreground">Searching…</div>
      ) : count === 0 ? (
        <div className="rounded-xl border border-dashed p-16 text-center">
          <SearchX className="mx-auto mb-4 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No matches for "{q}". Try a different name, email, phone, order id, or code.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {data && data.customers.length > 0 && (
            <Section title="Customers" icon={User}>
              <div className="divide-y rounded-xl border">
                {data.customers.map((c) => (
                  <Link
                    key={c.id}
                    to="/admin/users/$id"
                    params={{ id: c.id }}
                    className="flex items-center justify-between px-4 py-3 hover:bg-accent"
                  >
                    <div>
                      <p className="text-sm font-medium">{c.full_name || c.email || c.customer_code}</p>
                      <p className="text-xs text-muted-foreground">{c.customer_code} · {c.email}{c.phone ? ` · ${c.phone}` : ""}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </Section>
          )}

          {data && data.orders.length > 0 && (
            <Section title="Orders" icon={ShoppingCart}>
              <div className="divide-y rounded-xl border">
                {data.orders.map((o) => (
                  <Link
                    key={o.id}
                    to="/admin/orders/$id"
                    params={{ id: o.id }}
                    className="flex items-center justify-between px-4 py-3 hover:bg-accent"
                  >
                    <div>
                      <p className="font-mono text-sm font-medium">#{o.id.slice(0, 8)}</p>
                      <p className="text-xs text-muted-foreground">{o.customer_name ?? o.customer_email} · {new Date(o.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatMoney(o.total_cents, o.currency)}</p>
                      <Badge variant="outline" className="text-xs">{o.status}</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            </Section>
          )}

          {data && data.products.length > 0 && (
            <Section title="Products" icon={Package}>
              <div className="divide-y rounded-xl border">
                {data.products.map((p) => (
                  <Link
                    key={p.id}
                    to="/admin/products"
                    className="flex items-center justify-between px-4 py-3 hover:bg-accent"
                  >
                    <div>
                      <p className="text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.stock} in stock{p.active ? "" : " · hidden"}</p>
                    </div>
                    <p className="text-sm font-medium">{formatMoney(p.price_cents, p.currency)}</p>
                  </Link>
                ))}
              </div>
            </Section>
          )}

          {data && data.coupons.length > 0 && (
            <Section title="Coupons" icon={Ticket}>
              <div className="divide-y rounded-xl border">
                {data.coupons.map((c) => (
                  <Link
                    key={c.id}
                    to="/admin/coupons"
                    className="flex items-center justify-between px-4 py-3 hover:bg-accent"
                  >
                    <div>
                      <p className="font-mono text-sm font-medium">{c.code}</p>
                      <p className="text-xs text-muted-foreground">{c.description ?? "No description"}</p>
                    </div>
                    <Badge variant={c.active ? "default" : "secondary"}>{c.active ? "Active" : "Inactive"}</Badge>
                  </Link>
                ))}
              </div>
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: typeof User; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
        <Icon className="h-4 w-4" /> {title}
      </h2>
      {children}
    </div>
  );
}
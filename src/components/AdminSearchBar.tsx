import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, X, Loader2, User, ShoppingCart, Package, Ticket } from "lucide-react";
import { adminGlobalSearch, totalResultCount } from "@/lib/adminSearch";
import { formatMoney } from "@/stores/cart";

export function AdminSearchBar({ className = "" }: { className?: string }) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  const { data: results, isFetching } = useQuery({
    queryKey: ["admin-search-preview", debounced],
    queryFn: () => adminGlobalSearch(debounced),
    enabled: debounced.length > 1,
  });

  function goToResults() {
    const q = query.trim();
    if (!q) return;
    navigate({ to: "/admin/search", search: { q } });
    setOpen(false);
  }

  const showDropdown = open && debounced.length > 1;
  const count = results ? totalResultCount(results) : 0;

  return (
    <div className={`relative ${className}`}>
      <form onSubmit={(e) => { e.preventDefault(); goToResults(); }}>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder="Search orders, products, coupons, customers…"
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-9 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          {query && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { setQuery(""); setDebounced(""); inputRef.current?.focus(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </form>

      {showDropdown && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-[70vh] overflow-y-auto rounded-xl border border-border bg-card shadow-lg">
          {isFetching ? (
            <div className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Searching…
            </div>
          ) : !results || count === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No results for "{debounced}"</div>
          ) : (
            <>
              {results.customers.length > 0 && (
                <ResultGroup label="Customers" icon={User}>
                  {results.customers.map((c) => (
                    <ResultRow
                      key={c.id}
                      title={c.full_name || c.email || c.customer_code}
                      subtitle={[c.customer_code, c.phone].filter(Boolean).join(" · ")}
                      onClick={() => { navigate({ to: "/admin/users/$id", params: { id: c.id } }); setOpen(false); setQuery(""); }}
                    />
                  ))}
                </ResultGroup>
              )}
              {results.orders.length > 0 && (
                <ResultGroup label="Orders" icon={ShoppingCart}>
                  {results.orders.map((o) => (
                    <ResultRow
                      key={o.id}
                      title={`#${o.id.slice(0, 8)} — ${o.customer_name ?? o.customer_email}`}
                      subtitle={`${formatMoney(o.total_cents, o.currency)} · ${o.status}`}
                      onClick={() => { navigate({ to: "/admin/orders/$id", params: { id: o.id } }); setOpen(false); setQuery(""); }}
                    />
                  ))}
                </ResultGroup>
              )}
              {results.products.length > 0 && (
                <ResultGroup label="Products" icon={Package}>
                  {results.products.map((p) => (
                    <ResultRow
                      key={p.id}
                      title={p.name}
                      subtitle={`${formatMoney(p.price_cents, p.currency)} · ${p.stock} in stock${p.active ? "" : " · hidden"}`}
                      onClick={() => { navigate({ to: "/admin/products" }); setOpen(false); setQuery(""); }}
                    />
                  ))}
                </ResultGroup>
              )}
              {results.coupons.length > 0 && (
                <ResultGroup label="Coupons" icon={Ticket}>
                  {results.coupons.map((c) => (
                    <ResultRow
                      key={c.id}
                      title={c.code}
                      subtitle={c.description ?? (c.active ? "Active" : "Inactive")}
                      onClick={() => { navigate({ to: "/admin/coupons" }); setOpen(false); setQuery(""); }}
                    />
                  ))}
                </ResultGroup>
              )}
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={goToResults}
                className="w-full border-t border-border px-4 py-2.5 text-center text-sm font-semibold text-primary hover:bg-accent"
              >
                View all results for "{query.trim()}"
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ResultGroup({ label, icon: Icon, children }: { label: string; icon: typeof User; children: React.ReactNode }) {
  return (
    <div className="border-b border-border py-1.5 last:border-b-0">
      <p className="flex items-center gap-1.5 px-4 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </p>
      <ul>{children}</ul>
    </div>
  );
}

function ResultRow({ title, subtitle, onClick }: { title: string; subtitle?: string; onClick: () => void }) {
  return (
    <li>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onClick}
        className="flex w-full flex-col items-start px-4 py-2 text-left hover:bg-accent"
      >
        <span className="truncate text-sm font-medium">{title}</span>
        {subtitle && <span className="truncate text-xs text-muted-foreground">{subtitle}</span>}
      </button>
    </li>
  );
}
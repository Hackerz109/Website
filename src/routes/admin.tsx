import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { LayoutDashboard, Package, ShoppingCart, LogOut, ExternalLink, Tags } from "lucide-react";
import { StoreHeader } from "@/components/StoreHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({ component: AdminLayout });

function AdminLayout() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  if (loading) return <div className="p-12 text-center text-sm text-muted-foreground">Loading…</div>;
  if (!user) return null;

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <StoreHeader />
        <div className="mx-auto max-w-md p-12 text-center">
          <h1 className="text-xl font-semibold">Admin access required</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account isn't an admin yet. Ask the site owner to promote you, or if this is
            the first account, run the promotion step in chat.
          </p>
          <p className="mt-4 text-xs text-muted-foreground">
            Signed in as <span className="font-mono">{user.email}</span>
          </p>
          <Button asChild variant="outline" className="mt-6">
            <Link to="/">Back to store</Link>
          </Button>
        </div>
      </div>
    );
  }

  const nav = [
    { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
    { to: "/admin/products", label: "Products", icon: Package },
    { to: "/admin/taxonomy", label: "Categories & Brands", icon: Tags },
    { to: "/admin/orders", label: "Orders", icon: ShoppingCart },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5" />
            <span className="font-semibold">Admin</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/">
                <ExternalLink className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">View store</span>
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/" });
              }}
            >
              <LogOut className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 sm:py-8 md:flex-row md:gap-8">
        {/* Mobile: horizontal scrollable tab strip. Desktop: vertical sidebar. */}
        <aside className="-mx-4 flex-shrink-0 border-b px-4 pb-3 sm:-mx-6 sm:px-6 md:mx-0 md:w-56 md:border-b-0 md:px-0 md:pb-0">
          <nav className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
            {nav.map((n) => {
              const active = n.exact ? location.pathname === n.to : location.pathname.startsWith(n.to);
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={cn(
                    "flex flex-shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm",
                    active ? "bg-secondary font-medium" : "text-muted-foreground hover:bg-secondary/60",
                  )}
                >
                  <n.icon className="h-4 w-4" /> {n.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
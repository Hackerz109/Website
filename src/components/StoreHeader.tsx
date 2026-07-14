import { Link, useNavigate } from "@tanstack/react-router";
import { ShoppingBag, User as UserIcon, LayoutDashboard, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/stores/cart";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function StoreHeader() {
  const count = useCart((s) => s.items.reduce((sum, i) => sum + i.quantity, 0));
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link to="/" className="group flex items-center gap-2.5">
          <span className="relative flex h-7 w-7 items-center justify-center rounded-sm border border-primary/40 text-primary">
            <span className="absolute inset-0 rounded-sm border border-primary/20" style={{ margin: 3 }} />
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          </span>
          <span className="font-display text-lg font-semibold leading-none tracking-tight text-foreground">
            My Shop
          </span>
        </Link>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/cart">
              <ShoppingBag className="h-4 w-4" />
              <span className="ml-2 hidden sm:inline">Cart</span>
              {count > 0 && (
                <span className="spec-label ml-2 rounded-sm bg-primary px-1.5 py-0.5 text-[10px] leading-none text-primary-foreground">
                  {count}
                </span>
              )}
            </Link>
          </Button>
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <UserIcon className="h-4 w-4" />
                  <span className="ml-2 hidden max-w-[120px] truncate sm:inline">
                    {user.email}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate({ to: "/orders" })}>
                  My orders
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem onClick={() => navigate({ to: "/admin" })}>
                    <LayoutDashboard className="mr-2 h-4 w-4" /> Admin dashboard
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    await supabase.auth.signOut();
                    navigate({ to: "/" });
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild variant="outline" size="sm">
              <Link to="/auth">Sign in</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}

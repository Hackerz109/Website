import { Link, useNavigate } from "@tanstack/react-router";
import { ShoppingBag, User as UserIcon, LayoutDashboard, LogOut, Zap } from "lucide-react";
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

const TICKER_ITEMS = [
  "IN STOCK NOW",
  "SWITCHES",
  "FANS",
  "WIRES & CABLES",
  "FAST SHIPPING",
  "FITTINGS",
  "SECURE CHECKOUT",
];

export function StoreHeader() {
  const count = useCart((s) => s.items.reduce((sum, i) => sum + i.quantity, 0));
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  const tickerContent = (
    <>
      {TICKER_ITEMS.map((item) => (
        <span key={item} className="mx-4 flex items-center gap-2 text-xs font-extrabold tracking-wide">
          <Zap className="h-3 w-3 fill-current" /> {item}
        </span>
      ))}
    </>
  );

  return (
    <header className="sticky top-0 z-40 bg-background">
      <div className="overflow-hidden bg-foreground text-primary">
        <div className="marquee-track py-1.5">
          {tickerContent}
          {tickerContent}
        </div>
      </div>

      <div className="border-b-2 border-foreground/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 -rotate-6 items-center justify-center rounded-xl bg-primary text-foreground shadow-[3px_3px_0_var(--color-foreground)]">
              <Zap className="h-5 w-5 fill-current" />
            </span>
            <span className="font-display text-xl leading-none tracking-tight text-foreground">
              My Shop
            </span>
          </Link>
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="rounded-full">
              <Link to="/cart">
                <ShoppingBag className="h-4 w-4" />
                <span className="ml-2 hidden sm:inline">Cart</span>
                {count > 0 && (
                  <span className="ml-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-charge px-1 text-[11px] font-bold text-charge-foreground">
                    {count}
                  </span>
                )}
              </Link>
            </Button>
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="rounded-full">
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
              <Button asChild size="sm" className="rounded-full">
                <Link to="/auth">Sign in</Link>
              </Button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}

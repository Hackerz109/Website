import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ShoppingBag, UserCircle, LayoutDashboard, LogOut, Zap, Search, X, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useCart } from "@/stores/cart";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { SearchBar } from "@/components/SearchBar";
import { initials } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function StoreHeader() {
  const count = useCart((s) => s.items.reduce((sum, i) => sum + i.quantity, 0));
  const { user, isAdmin, profile } = useAuth();
  const navigate = useNavigate();
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
        <Link to="/" className="flex flex-shrink-0 items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-soft">
            <Zap className="h-4 w-4 fill-current" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight text-foreground">
            My Shop
          </span>
        </Link>

        <div className="mx-6 hidden max-w-md flex-1 md:block">
          <SearchBar />
        </div>

        <nav className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-lg md:hidden"
            onClick={() => setMobileSearchOpen((v) => !v)}
          >
            {mobileSearchOpen ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
          </Button>
          <Button asChild variant="ghost" size="sm" className="rounded-lg">
            <Link to="/cart">
              <ShoppingBag className="h-4 w-4" />
              <span className="ml-2 hidden sm:inline">Cart</span>
              {count > 0 && (
                <span className="ml-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold text-primary-foreground">
                  {count}
                </span>
              )}
            </Link>
          </Button>
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="rounded-lg px-1.5 sm:px-2.5">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={profile?.avatar_url ?? undefined} alt="" />
                    <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
                      {initials(profile?.full_name, user.email)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="ml-2 hidden max-w-[120px] truncate sm:inline">
                    {profile?.full_name || user.email}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <p className="truncate text-sm font-medium text-foreground">{profile?.full_name || "Your account"}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                  {profile?.customer_code && (
                    <p className="mt-1 inline-block rounded-full bg-secondary px-2 py-0.5 font-mono text-[10px] tracking-wide text-muted-foreground">
                      {profile.customer_code}
                    </p>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate({ to: "/profile" })}>
                  <UserCircle className="mr-2 h-4 w-4" /> My profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/orders" })}>
                  My orders
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/wallet" })}>
                  <Wallet className="mr-2 h-4 w-4" /> Store Wallet
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
            <Button asChild size="sm" className="rounded-lg shadow-soft">
              <Link to="/auth">Sign in</Link>
            </Button>
          )}
        </nav>
      </div>
      {mobileSearchOpen && (
        <div className="border-t border-border px-4 py-3 md:hidden">
          <SearchBar autoFocus onNavigate={() => setMobileSearchOpen(false)} />
        </div>
      )}
    </header>
  );
}

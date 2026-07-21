import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Copy,
  Check,
  Shield,
  ShieldOff,
  Phone,
  Mail,
  Calendar,
  Clock,
  Package,
  Wallet as WalletIcon,
  RotateCcw,
  ArrowDownCircle,
  ArrowUpCircle,
  Settings2,
  Home,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatMoney } from "@/stores/cart";
import { initials } from "@/lib/utils";
import { adminGetCustomer, adminSetAdminRole } from "@/lib/admin-customers";
import { fetchWalletTransactions, sumBalance, walletTransactionLabel } from "@/lib/wallet";
import { ORDER_STATUS_LABELS, ORDER_STATUS_BADGE_CLASS } from "@/lib/orderStatus";
import { returnStatusLabel, returnStatusBadgeClass, type ReturnRequestWithDetails } from "@/lib/returns";
import type { UserAddress } from "@/lib/profile";
import type { Database } from "@/integrations/supabase/types";

type Order = Database["public"]["Tables"]["orders"]["Row"];

export const Route = createFileRoute("/admin/users/$id")({ component: AdminCustomerDetailPage });

function AdminCustomerDetailPage() {
  const { id } = Route.useParams();
  const { user: currentUser } = useAuth();
  const qc = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [changingRole, setChangingRole] = useState(false);

  const {
    data: customer,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["admin-customer", id],
    queryFn: () => adminGetCustomer(id),
  });

  const { data: orders } = useQuery({
    queryKey: ["admin-customer-orders", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Order[];
    },
  });

  const { data: walletTx } = useQuery({
    queryKey: ["admin-customer-wallet", id],
    queryFn: () => fetchWalletTransactions(id),
  });

  const { data: addresses } = useQuery({
    queryKey: ["admin-customer-addresses", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_addresses")
        .select("*")
        .eq("user_id", id)
        .order("is_default", { ascending: false });
      if (error) throw error;
      return data as UserAddress[];
    },
  });

  const { data: returns } = useQuery({
    queryKey: ["admin-customer-returns", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("return_requests")
        .select("*, return_items(*), return_images(*)")
        .eq("user_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ReturnRequestWithDetails[];
    },
  });

  const walletBalance = sumBalance(walletTx ?? []);
  const isSelf = currentUser?.id === id;

  async function toggleRole() {
    if (!customer) return;
    const makeAdmin = !customer.is_admin;
    const label = makeAdmin ? "grant admin access to" : "remove admin access from";
    if (!confirm(`Are you sure you want to ${label} ${customer.full_name || customer.email}?`)) return;
    setChangingRole(true);
    const result = await adminSetAdminRole(id, makeAdmin);
    setChangingRole(false);
    if (!result.success) return toast.error(result.message ?? "Couldn't update admin access");
    toast.success(makeAdmin ? "Admin access granted" : "Admin access removed");
    qc.invalidateQueries({ queryKey: ["admin-customer", id] });
    qc.invalidateQueries({ queryKey: ["admin-customers"] });
  }

  function copyCode() {
    if (!customer) return;
    navigator.clipboard.writeText(customer.customer_code);
    setCopied(true);
    toast.success("Customer ID copied");
    setTimeout(() => setCopied(false), 1500);
  }

  if (isLoading) {
    return <div className="p-12 text-center text-sm text-muted-foreground">Loading customer…</div>;
  }
  if (isError || !customer) {
    return (
      <div className="p-12 text-center">
        <p className="text-sm font-medium text-red-600">Couldn't load this customer.</p>
        <Link to="/admin/users" className="mt-3 inline-block text-sm text-primary underline">
          Back to Users
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link
        to="/admin/users"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Users
      </Link>

      <div className="mt-4 rounded-2xl border bg-gradient-to-br from-primary/10 to-primary/5 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 border-2 border-background shadow-soft">
              <AvatarImage src={customer.avatar_url ?? undefined} alt="" />
              <AvatarFallback className="bg-primary/15 text-lg font-semibold text-primary">
                {initials(customer.full_name, customer.email)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-lg font-semibold">{customer.full_name || "Unnamed customer"}</p>
                {customer.is_admin && (
                  <Badge variant="secondary" className="flex items-center gap-1 text-[10px]">
                    <Shield className="h-2.5 w-2.5" /> Admin
                  </Badge>
                )}
              </div>
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Mail className="h-3.5 w-3.5" /> {customer.email}
              </p>
              {customer.phone && (
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" /> {customer.phone}
                </p>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={changingRole || isSelf}
            onClick={toggleRole}
            title={isSelf ? "You can't change your own admin access" : undefined}
          >
            {customer.is_admin ? (
              <ShieldOff className="mr-1.5 h-3.5 w-3.5" />
            ) : (
              <Shield className="mr-1.5 h-3.5 w-3.5" />
            )}
            {customer.is_admin ? "Remove admin access" : "Grant admin access"}
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={copyCode}
            className="flex items-center gap-2 rounded-lg border border-primary/20 bg-background/60 px-3 py-2 text-left transition-colors hover:bg-background"
          >
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Customer ID</p>
              <p className="font-mono text-sm font-semibold">{customer.customer_code}</p>
            </div>
            {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
          </button>
          <div className="flex items-center gap-1.5 rounded-lg border border-primary/20 bg-background/60 px-3 py-2 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" /> Joined {new Date(customer.created_at).toLocaleDateString()}
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-primary/20 bg-background/60 px-3 py-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" /> Last seen{" "}
            {customer.last_seen_at ? new Date(customer.last_seen_at).toLocaleString() : "Never"}
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={Package} label="Orders" value={String(customer.order_count)} />
        <StatCard icon={WalletIcon} label="Total spent" value={formatMoney(customer.total_spent_cents)} />
        <StatCard icon={WalletIcon} label="Wallet balance" value={formatMoney(walletBalance)} />
        <StatCard icon={RotateCcw} label="Returns" value={String(returns?.length ?? 0)} />
      </div>

      <Tabs defaultValue="orders" className="mt-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="wallet">Wallet</TabsTrigger>
          <TabsTrigger value="addresses">Addresses</TabsTrigger>
          <TabsTrigger value="returns">Returns</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="mt-4 space-y-2">
          {!orders || orders.length === 0 ? (
            <EmptyState text="No orders yet." />
          ) : (
            orders.map((o) => (
              <Link
                key={o.id}
                to="/admin/orders/$id"
                params={{ id: o.id }}
                className="flex items-center justify-between rounded-xl border p-4 transition-colors hover:bg-secondary/40"
              >
                <div>
                  <p className="text-sm font-medium">#{o.id.slice(0, 8)}</p>
                  <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={ORDER_STATUS_BADGE_CLASS[o.status]}>{ORDER_STATUS_LABELS[o.status]}</Badge>
                  <span className="text-sm font-semibold">{formatMoney(o.total_cents)}</span>
                </div>
              </Link>
            ))
          )}
        </TabsContent>

        <TabsContent value="wallet" className="mt-4 space-y-2">
          {!walletTx || walletTx.length === 0 ? (
            <EmptyState text="No wallet activity." />
          ) : (
            walletTx.map((t) => (
              <div key={t.id} className="flex items-center gap-3 rounded-xl border p-3.5">
                {t.type === "debit" ? (
                  <ArrowUpCircle className="h-4 w-4 flex-shrink-0 text-red-500" />
                ) : t.type === "adjustment" ? (
                  <Settings2 className="h-4 w-4 flex-shrink-0 text-blue-600" />
                ) : (
                  <ArrowDownCircle className="h-4 w-4 flex-shrink-0 text-green-600" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{walletTransactionLabel(t.type)}</p>
                  <p className="truncate text-xs text-muted-foreground">{t.description}</p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className={`text-sm font-semibold ${t.amount_cents >= 0 ? "text-green-600" : "text-foreground"}`}>
                    {t.amount_cents >= 0 ? "+" : "-"}
                    {formatMoney(Math.abs(t.amount_cents))}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            ))
          )}
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link to="/admin/wallet">Manage wallet balance →</Link>
          </Button>
        </TabsContent>

        <TabsContent value="addresses" className="mt-4 space-y-2">
          {!addresses || addresses.length === 0 ? (
            <EmptyState text="No saved addresses." />
          ) : (
            addresses.map((a) => (
              <div key={a.id} className="rounded-xl border p-4">
                <div className="flex items-center gap-2">
                  {a.label.toLowerCase() === "work" ? (
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <Home className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <p className="text-sm font-medium">{a.label}</p>
                  {a.is_default && (
                    <Badge variant="secondary" className="text-[10px]">
                      Default
                    </Badge>
                  )}
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  <p className="text-foreground">
                    {a.full_name}
                    {a.phone && ` · ${a.phone}`}
                  </p>
                  <p>
                    {a.line1}
                    {a.line2 && `, ${a.line2}`}
                  </p>
                  <p>
                    {a.city}, {a.state} - {a.pincode}
                  </p>
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="returns" className="mt-4 space-y-2">
          {!returns || returns.length === 0 ? (
            <EmptyState text="No return requests." />
          ) : (
            returns.map((r) => (
              <div key={r.id} className="rounded-xl border p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Return #{r.id.slice(0, 8)}</span>
                  <Badge className={returnStatusBadgeClass(r.status)}>{returnStatusLabel(r.status)}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{r.reason}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Requested {new Date(r.created_at).toLocaleDateString()}
                </p>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Package; label: string; value: string }) {
  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <p className="mt-1.5 text-lg font-semibold">{value}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">{text}</div>;
}

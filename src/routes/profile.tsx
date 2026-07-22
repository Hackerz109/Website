import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Camera,
  Copy,
  Check,
  Plus,
  Pencil,
  Trash2,
  Star,
  Lock,
  Loader2,
  ArrowRight,
  Package,
  Wallet as WalletIcon,
  Home,
  Building2,
} from "lucide-react";
import { StoreHeader } from "@/components/StoreHeader";
import { StoreFooter } from "@/components/StoreFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PhoneVerifyDialog } from "@/components/PhoneVerifyDialog";
import { PHONE_VERIFICATION_ENABLED } from "@/lib/phoneVerification";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/stores/cart";
import { initials } from "@/lib/utils";
import { fetchWalletTransactions, sumBalance } from "@/lib/wallet";
import {
  fetchMyAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  updateMyProfile,
  uploadAvatar,
  changePassword,
  type Profile,
  type UserAddress,
  type AddressInput,
} from "@/lib/profile";

export const Route = createFileRoute("/profile")({ component: ProfilePage });

function ProfilePage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const { data: orderCount } = useQuery({
    enabled: !!user,
    queryKey: ["profile-order-count", user?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: walletTx } = useQuery({
    enabled: !!user,
    queryKey: ["wallet-transactions", user?.id],
    queryFn: () => fetchWalletTransactions(user!.id),
  });
  const walletBalance = sumBalance(walletTx ?? []);

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-background">
        <StoreHeader />
        <div className="p-16 text-center text-sm text-muted-foreground">Loading your profile…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <StoreHeader />
      <div className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">My Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your details, saved addresses, and account security.
        </p>

        <ProfileHero profile={profile} email={user.email ?? ""} userId={user.id} onAvatarChange={refreshProfile} />

        <div className="mt-6 grid grid-cols-2 gap-3">
          <Link to="/orders" className="rounded-xl border p-4 transition-colors hover:bg-secondary/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Package className="h-4 w-4" /> Orders
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <p className="mt-2 text-xl font-semibold">{orderCount ?? "—"}</p>
          </Link>
          <Link to="/wallet" className="rounded-xl border p-4 transition-colors hover:bg-secondary/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <WalletIcon className="h-4 w-4" /> Wallet balance
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <p className="mt-2 text-xl font-semibold">{formatMoney(walletBalance)}</p>
          </Link>
        </div>

        <Tabs defaultValue="details" className="mt-8">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="addresses">Addresses</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>
          <TabsContent value="details" className="mt-4">
            <ProfileDetailsForm profile={profile} onSaved={refreshProfile} />
          </TabsContent>
          <TabsContent value="addresses" className="mt-4">
            <AddressesSection userId={user.id} />
          </TabsContent>
          <TabsContent value="security" className="mt-4">
            <PasswordForm />
          </TabsContent>
        </Tabs>
      </div>
      <StoreFooter />
    </div>
  );
}

function ProfileHero({
  profile,
  email,
  userId,
  onAvatarChange,
}: {
  profile: Profile;
  email: string;
  userId: string;
  onAvatarChange: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleAvatarPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadAvatar(userId, file);
      const result = await updateMyProfile(userId, { avatar_url: url });
      if (!result.success) throw new Error(result.message);
      onAvatarChange();
      toast.success("Profile photo updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't update your photo");
    } finally {
      setUploading(false);
    }
  }

  function copyCode() {
    navigator.clipboard.writeText(profile.customer_code);
    setCopied(true);
    toast.success("Customer ID copied");
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="mt-6 rounded-2xl border bg-gradient-to-br from-primary/10 to-primary/5 p-6">
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-shrink-0">
          <Avatar className="h-16 w-16 border-2 border-background shadow-soft">
            <AvatarImage src={profile.avatar_url ?? undefined} alt="" />
            <AvatarFallback className="bg-primary/15 text-lg font-semibold text-primary">
              {initials(profile.full_name, email)}
            </AvatarFallback>
          </Avatar>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-soft disabled:opacity-60"
          >
            {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarPick} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold">{profile.full_name || "Add your name"}</p>
          <p className="truncate text-sm text-muted-foreground">{email}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Member since{" "}
            {new Date(profile.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={copyCode}
        className="mt-4 flex w-full items-center justify-between rounded-xl border border-primary/20 bg-background/60 px-3.5 py-2.5 text-left transition-colors hover:bg-background"
      >
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Your Customer ID</p>
          <p className="font-mono text-sm font-semibold">{profile.customer_code}</p>
        </div>
        {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
      </button>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Share this ID with support so we can find your account quickly.
      </p>
    </div>
  );
}

function ProfileDetailsForm({ profile, onSaved }: { profile: Profile; onSaved: () => void }) {
  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [phoneDialogOpen, setPhoneDialogOpen] = useState(false);

  async function save() {
    setSaving(true);
    const result = await updateMyProfile(profile.id, {
      full_name: fullName.trim() || null,
      phone: phone.trim() || null,
    });
    setSaving(false);
    if (!result.success) return toast.error(result.message ?? "Couldn't save your details");
    toast.success("Profile updated");
    onSaved();
  }

  return (
    <div className="space-y-4 rounded-xl border p-5">
      <div>
        <Label htmlFor="pf-name">Full name</Label>
        <Input id="pf-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
      </div>
      <div>
        <Label htmlFor="pf-phone" className="flex items-center justify-between">
          <span>Mobile number</span>
          {PHONE_VERIFICATION_ENABLED && profile.phone && (
            profile.phone_verified ? (
              <Badge variant="secondary" className="text-[10px]">Verified</Badge>
            ) : (
              <button type="button" className="text-xs font-medium text-primary underline" onClick={() => setPhoneDialogOpen(true)}>
                Verify
              </button>
            )
          )}
        </Label>
        <Input
          id="pf-phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="10-digit mobile number"
        />
        {PHONE_VERIFICATION_ENABLED && phone && phone !== profile.phone && (
          <p className="mt-1 text-[11px] text-muted-foreground">Save this number first, then verify it.</p>
        )}
      </div>
      {PHONE_VERIFICATION_ENABLED && (
        <PhoneVerifyDialog
          open={phoneDialogOpen}
          onOpenChange={setPhoneDialogOpen}
          defaultPhone={profile.phone}
          onVerified={onSaved}
        />
      )}
      <div>
        <Label>Email</Label>
        <Input value={profile.email ?? ""} disabled className="bg-secondary/40 text-muted-foreground" />
        <p className="mt-1 text-xs text-muted-foreground">Contact support to change your email address.</p>
      </div>
      <Button onClick={save} disabled={saving} className="w-full">
        {saving ? "Saving…" : "Save changes"}
      </Button>
    </div>
  );
}

function PasswordForm() {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (pw.length < 6) return toast.error("Password should be at least 6 characters");
    if (pw !== confirm) return toast.error("Passwords don't match");
    setSaving(true);
    const result = await changePassword(pw);
    setSaving(false);
    if (!result.success) return toast.error(result.message ?? "Couldn't update your password");
    setPw("");
    setConfirm("");
    toast.success("Password updated");
  }

  return (
    <div className="space-y-4 rounded-xl border p-5">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Lock className="h-4 w-4" /> Change password
      </div>
      <div>
        <Label htmlFor="pw-new">New password</Label>
        <Input
          id="pw-new"
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="At least 6 characters"
        />
      </div>
      <div>
        <Label htmlFor="pw-confirm">Confirm new password</Label>
        <Input id="pw-confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </div>
      <Button onClick={save} disabled={saving} className="w-full">
        {saving ? "Updating…" : "Update password"}
      </Button>
    </div>
  );
}

function AddressesSection({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<UserAddress | null>(null);

  const { data: addresses, isLoading } = useQuery({
    queryKey: ["my-addresses", userId],
    queryFn: () => fetchMyAddresses(userId),
  });

  function refresh() {
    qc.invalidateQueries({ queryKey: ["my-addresses", userId] });
  }

  function openNew() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(addr: UserAddress) {
    setEditing(addr);
    setDialogOpen(true);
  }

  async function remove(addr: UserAddress) {
    if (!confirm(`Delete the "${addr.label}" address?`)) return;
    const result = await deleteAddress(addr.id);
    if (!result.success) return toast.error(result.message ?? "Couldn't delete address");
    toast.success("Address deleted");
    refresh();
  }

  async function makeDefault(addr: UserAddress) {
    const result = await updateAddress(addr.id, { is_default: true });
    if (!result.success) return toast.error(result.message ?? "Couldn't update address");
    refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Saved addresses</p>
        <Button size="sm" variant="outline" onClick={openNew}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Add address
        </Button>
      </div>

      {isLoading ? (
        <div className="mt-3 h-20 animate-pulse rounded-xl bg-secondary/50" />
      ) : !addresses || addresses.length === 0 ? (
        <div className="mt-3 rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No saved addresses yet.
        </div>
      ) : (
        <div className="mt-3 space-y-2.5">
          {addresses.map((a) => (
            <div key={a.id} className="rounded-xl border p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-secondary">
                    {a.label.toLowerCase() === "work" ? (
                      <Building2 className="h-3.5 w-3.5" />
                    ) : (
                      <Home className="h-3.5 w-3.5" />
                    )}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{a.label}</p>
                    {a.is_default && (
                      <Badge variant="secondary" className="mt-0.5 text-[10px]">
                        Default
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex flex-shrink-0 gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(a)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-600 hover:text-red-600"
                    onClick={() => remove(a)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="mt-2.5 text-sm text-muted-foreground">
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
              {!a.is_default && (
                <button
                  type="button"
                  onClick={() => makeDefault(a)}
                  className="mt-2 flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Star className="h-3 w-3" /> Set as default
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <AddressFormDialog
            userId={userId}
            existing={editing}
            onDone={() => {
              setDialogOpen(false);
              refresh();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AddressFormDialog({
  userId,
  existing,
  onDone,
}: {
  userId: string;
  existing: UserAddress | null;
  onDone: () => void;
}) {
  const [form, setForm] = useState<AddressInput>({
    label: existing?.label ?? "Home",
    full_name: existing?.full_name ?? "",
    phone: existing?.phone ?? "",
    line1: existing?.line1 ?? "",
    line2: existing?.line2 ?? "",
    city: existing?.city ?? "",
    state: existing?.state ?? "",
    pincode: existing?.pincode ?? "",
    is_default: existing?.is_default ?? false,
  });
  const [saving, setSaving] = useState(false);

  function set<K extends keyof AddressInput>(key: K, value: AddressInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit() {
    if (
      !form.full_name.trim() ||
      !form.phone.trim() ||
      !form.line1.trim() ||
      !form.city.trim() ||
      !form.state.trim() ||
      !form.pincode.trim()
    ) {
      return toast.error("Please fill in all required fields");
    }
    setSaving(true);
    const result = existing ? await updateAddress(existing.id, form) : await createAddress(userId, form);
    setSaving(false);
    if (!result.success) return toast.error(result.message ?? "Couldn't save address");
    toast.success(existing ? "Address updated" : "Address added");
    onDone();
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{existing ? "Edit address" : "Add a new address"}</DialogTitle>
      </DialogHeader>
      <div className="max-h-[65vh] space-y-3 overflow-y-auto py-1 pr-1">
        <div>
          <Label htmlFor="addr-label">Label</Label>
          <Input id="addr-label" value={form.label} onChange={(e) => set("label", e.target.value)} placeholder="Home, Work…" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="addr-name">Full name</Label>
            <Input id="addr-name" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="addr-phone">Phone</Label>
            <Input id="addr-phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </div>
        </div>
        <div>
          <Label htmlFor="addr-line1">Address line 1</Label>
          <Input id="addr-line1" value={form.line1} onChange={(e) => set("line1", e.target.value)} placeholder="House no., street" />
        </div>
        <div>
          <Label htmlFor="addr-line2">Address line 2 (optional)</Label>
          <Input id="addr-line2" value={form.line2} onChange={(e) => set("line2", e.target.value)} placeholder="Landmark, area" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label htmlFor="addr-city">City</Label>
            <Input id="addr-city" value={form.city} onChange={(e) => set("city", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="addr-state">State</Label>
            <Input id="addr-state" value={form.state} onChange={(e) => set("state", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="addr-pin">Pincode</Label>
            <Input id="addr-pin" value={form.pincode} onChange={(e) => set("pincode", e.target.value)} />
          </div>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Checkbox id="addr-default" checked={form.is_default} onCheckedChange={(v) => set("is_default", !!v)} />
          <Label htmlFor="addr-default" className="font-normal">
            Set as default address
          </Label>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={submit} disabled={saving} className="w-full">
          {saving ? "Saving…" : existing ? "Save changes" : "Add address"}
        </Button>
      </DialogFooter>
    </>
  );
}
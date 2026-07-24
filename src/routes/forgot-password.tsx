import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { StoreHeader } from "@/components/StoreHeader";
import { StoreFooter } from "@/components/StoreFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/lib/deviceId";

export const Route = createFileRoute("/forgot-password")({ component: ForgotPasswordPage });

type RateLimitStatus = {
  locked: boolean;
  lockedUntil: string | null;
  maxAttemptCount: number;
  requireCaptcha: boolean;
};

function formatUnlockTime(iso: string): string {
  const mins = Math.max(1, Math.ceil((new Date(iso).getTime() - Date.now()) / 60_000));
  return mins === 1 ? "1 minute" : `${mins} minutes`;
}

async function fetchStatus(email: string, device: string): Promise<RateLimitStatus | null> {
  try {
    const params = new URLSearchParams({ scope: "password_reset", email, device });
    const res = await fetch(`/api/rate-limit?${params}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function recordAttempt(email: string, device: string): Promise<RateLimitStatus | null> {
  try {
    const res = await fetch("/api/rate-limit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope: "password_reset", email, device, outcome: "attempt" }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();
    const device = getDeviceId();

    // Check the EMAIL-specific limit up front so we can honestly tell the
    // account owner to slow down. We deliberately don't distinguish an
    // IP-only block in the UI — revealing "your IP is blocked" to whoever
    // is submitting tells an attacker their spray is being detected, and
    // helps them target the blocked identifier instead of just backing off.
    const before = await fetchStatus(trimmedEmail, device);
    if (before?.locked) {
      toast.error(`Too many reset requests for this email. Try again in ${formatUnlockTime(before.lockedUntil!)}.`);
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    const after = await recordAttempt(trimmedEmail, device);
    setLoading(false);

    if (error && /rate limit/i.test(error.message)) {
      toast.error("Too many attempts — please wait a bit before trying again.");
      return;
    }
    if (after?.locked) {
      // The email itself just tipped over its limit on this very request —
      // still worth telling the real owner honestly.
      toast.error(`Too many reset requests for this email. Try again in ${formatUnlockTime(after.lockedUntil!)}.`);
      return;
    }

    setSent(true);
  }

  return (
    <div className="min-h-screen bg-background">
      <StoreHeader />
      <div className="mx-auto max-w-md px-6 py-12">
        <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter your account email and we'll send you a reset link.
        </p>

        {sent ? (
          <div className="mt-6 rounded-md border border-border bg-muted/40 p-4 text-sm">
            If an account exists for <span className="font-medium">{email}</span>, a reset link is on its way.
            Check your inbox (and spam folder).
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Sending…" : "Send reset link"}
            </Button>
          </form>
        )}

        <div className="mt-6 text-sm">
          <Link to="/auth" className="text-primary underline-offset-4 hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
      <StoreFooter />
    </div>
  );
}

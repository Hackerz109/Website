import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { StoreHeader } from "@/components/StoreHeader";
import { StoreFooter } from "@/components/StoreFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TurnstileWidget } from "@/components/TurnstileWidget";
import { supabase } from "@/integrations/supabase/client";
import { REMEMBER_ME_KEY } from "@/hooks/useRememberMeGuard";
import { getDeviceId } from "@/lib/deviceId";

export const Route = createFileRoute("/auth")({ component: AuthPage });

type RateLimitStatus = {
  locked: boolean;
  lockedUntil: string | null;
  maxAttemptCount: number;
  requireCaptcha: boolean;
};

async function fetchStatus(scope: string, email: string, device: string): Promise<RateLimitStatus | null> {
  try {
    const params = new URLSearchParams({ scope, email, device });
    const res = await fetch(`/api/rate-limit?${params}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function reportOutcome(
  scope: string,
  email: string,
  device: string,
  outcome: "attempt" | "success",
): Promise<RateLimitStatus | null> {
  try {
    const res = await fetch("/api/rate-limit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope, email, device, outcome }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function formatUnlockTime(iso: string): string {
  const mins = Math.max(1, Math.ceil((new Date(iso).getTime() - Date.now()) / 60_000));
  return mins === 1 ? "1 minute" : `${mins} minutes`;
}

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [loginStatus, setLoginStatus] = useState<RateLimitStatus | null>(null);
  const [signupStatus, setSignupStatus] = useState<RateLimitStatus | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaResetKey, setCaptchaResetKey] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
  }, [navigate]);

  // Check signup's IP/device-based lock as soon as the page loads — no
  // email needed for that scope, since it's mainly about mass account
  // creation from one source.
  useEffect(() => {
    fetchStatus("signup", "", getDeviceId()).then(setSignupStatus);
  }, []);

  // Re-check login lockout/captcha status as soon as we know which email is
  // being signed in with, so the UI reflects prior failed attempts on reload.
  useEffect(() => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      setLoginStatus(null);
      return;
    }
    const id = setTimeout(() => {
      fetchStatus("login", trimmed, getDeviceId()).then(setLoginStatus);
    }, 400);
    return () => clearTimeout(id);
  }, [email]);

  const isLoginLocked = !!loginStatus?.locked;
  const needsCaptcha = !!loginStatus?.requireCaptcha && !!import.meta.env.VITE_TURNSTILE_SITE_KEY;
  const isSignupLocked = !!signupStatus?.locked;

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();
    const device = getDeviceId();

    const freshStatus = await fetchStatus("login", trimmedEmail, device);
    setLoginStatus(freshStatus);
    if (freshStatus?.locked) {
      toast.error(`Too many failed attempts. Try again in ${formatUnlockTime(freshStatus.lockedUntil!)}.`);
      return;
    }
    if (freshStatus?.requireCaptcha && import.meta.env.VITE_TURNSTILE_SITE_KEY && !captchaToken) {
      toast.error("Please complete the verification below.");
      return;
    }

    // Verify the Turnstile token ourselves — Supabase's own "Enable Captcha
    // protection" toggle would require a token on every single sign-in
    // attempt, not just ones flagged by our own failure-count logic, so we
    // keep that toggle off and check it server-side here instead.
    if (captchaToken) {
      const verifyRes = await fetch("/api/verify-captcha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: captchaToken }),
      }).catch(() => null);
      const verified = verifyRes?.ok ? (await verifyRes.json()).success : false;
      if (!verified) {
        toast.error("Verification failed — please try again.");
        setCaptchaToken(null);
        setCaptchaResetKey((k) => k + 1);
        return;
      }
    }

    setLoading(true);
    window.localStorage.setItem(REMEMBER_ME_KEY, String(rememberMe));

    const { error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });
    setLoading(false);

    if (error) {
      const updated = await reportOutcome("login", trimmedEmail, device, "attempt");
      setLoginStatus(updated);
      setCaptchaToken(null);
      setCaptchaResetKey((k) => k + 1);
      if (updated?.locked) {
        toast.error(`Too many failed attempts. Try again in ${formatUnlockTime(updated.lockedUntil!)}.`);
      } else {
        toast.error(error.message);
      }
      return;
    }

    await reportOutcome("login", trimmedEmail, device, "success");
    toast.success("Welcome back");
    navigate({ to: "/" });
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    const device = getDeviceId();

    const freshStatus = await fetchStatus("signup", "", device);
    setSignupStatus(freshStatus);
    if (freshStatus?.locked) {
      toast.error("Too many accounts created from this device/network recently. Please try again later.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName },
      },
    });
    setLoading(false);

    // Count every submission attempt (not just failures) — signup abuse is
    // about volume of accounts created, not about guessing a password.
    const updated = await reportOutcome("signup", "", device, "attempt");
    setSignupStatus(updated);

    if (error) return toast.error(error.message);
    toast.success("Account created — check your email to confirm");
  }

  async function handleGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    // On success this redirects the browser to Google — there's no local
    // navigation to do here. We only reach this line if it failed to start.
    if (error) toast.error(error.message ?? "Google sign-in failed");
  }

  return (
    <div className="min-h-screen bg-background">
      <StoreHeader />
      <div className="mx-auto max-w-md px-6 py-12">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Access your orders and admin dashboard
        </p>

        <div className="mt-6">
          <Button variant="outline" className="w-full" onClick={handleGoogle}>
            Continue with Google
          </Button>
          <div className="my-4 flex items-center gap-2 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
          </div>
        </div>

        <Tabs defaultValue="signin">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Create account</TabsTrigger>
          </TabsList>
          <TabsContent value="signin">
            <form onSubmit={handleSignIn} className="space-y-4 pt-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-muted-foreground">
                  <Checkbox checked={rememberMe} onCheckedChange={(v) => setRememberMe(v === true)} />
                  Remember me
                </label>
                <Link to="/forgot-password" className="text-primary underline-offset-4 hover:underline">
                  Forgot password?
                </Link>
              </div>

              {isLoginLocked && loginStatus?.lockedUntil && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  Too many failed attempts. Try again in {formatUnlockTime(loginStatus.lockedUntil)}.
                </p>
              )}

              {needsCaptcha && !isLoginLocked && (
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">
                    A few failed attempts were made on this account — please verify you're human.
                  </p>
                  <TurnstileWidget onVerify={setCaptchaToken} onExpire={() => setCaptchaToken(null)} resetKey={captchaResetKey} />
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading || isLoginLocked}>
                {loading ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          </TabsContent>
          <TabsContent value="signup">
            <form onSubmit={handleSignUp} className="space-y-4 pt-4">
              <div>
                <Label htmlFor="name">Full name</Label>
                <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="email2">Email</Label>
                <Input id="email2" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="password2">Password</Label>
                <div className="relative">
                  <Input
                    id="password2"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {isSignupLocked && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  Too many accounts created from this device/network recently. Please try again later.
                </p>
              )}
              <Button type="submit" className="w-full" disabled={loading || isSignupLocked}>
                Create account
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
      <StoreFooter />
    </div>
  );
}

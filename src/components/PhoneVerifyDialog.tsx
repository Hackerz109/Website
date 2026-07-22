import { useState } from "react";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { sendPhoneOtp, verifyPhoneOtp } from "@/lib/phoneVerification";

interface PhoneVerifyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPhone?: string | null;
  /** Called once the code is confirmed and profiles.phone_verified is true. */
  onVerified: () => void;
}

export function PhoneVerifyDialog({ open, onOpenChange, defaultPhone, onVerified }: PhoneVerifyDialogProps) {
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState(defaultPhone ?? "");
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  function reset() {
    setStep("phone");
    setCode("");
  }

  async function handleSend() {
    if (!phone.trim() || phone.replace(/[^0-9]/g, "").length < 10) {
      toast.error("Enter a valid phone number");
      return;
    }
    setSending(true);
    const result = await sendPhoneOtp(phone.trim());
    setSending(false);
    if (!result.ok) return toast.error(result.message ?? "Couldn't send the code");
    toast.success("Code sent via WhatsApp");
    setStep("code");
  }

  async function handleVerify() {
    if (code.length !== 6) return toast.error("Enter the 6-digit code");
    setVerifying(true);
    const result = await verifyPhoneOtp(code);
    setVerifying(false);
    if (!result.ok) return toast.error(result.message ?? "Incorrect code");
    toast.success("Phone verified");
    onVerified();
    onOpenChange(false);
    reset();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" /> Verify your phone
          </DialogTitle>
          <DialogDescription>
            {step === "phone"
              ? "We verify your number before you place your first order, so we can reach you about delivery."
              : `Enter the 6-digit code sent to ${phone} on WhatsApp.`}
          </DialogDescription>
        </DialogHeader>

        {step === "phone" ? (
          <div className="space-y-3">
            <div>
              <Label htmlFor="verify-phone">Phone number</Label>
              <Input
                id="verify-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10-digit mobile number"
                autoFocus
              />
            </div>
            <Button className="w-full" onClick={handleSend} disabled={sending}>
              {sending ? "Sending…" : "Send code"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={code} onChange={setCode}>
                <InputOTPGroup>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <InputOTPSlot key={i} index={i} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button className="w-full" onClick={handleVerify} disabled={verifying || code.length !== 6}>
              {verifying ? "Verifying…" : "Verify"}
            </Button>
            <button
              type="button"
              className="w-full text-center text-xs text-muted-foreground underline"
              onClick={() => setStep("phone")}
            >
              Use a different number / resend
            </button>
          </div>
        )}

        <DialogFooter>
          <p className="text-[11px] text-muted-foreground">
            Standard WhatsApp messaging applies. Never share this code with anyone.
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
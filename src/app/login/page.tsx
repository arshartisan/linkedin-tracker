"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { LogoLockup } from "@/components/Logo";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

const PHONE_LENGTH = 10;
const PHONE_PATTERN = /^07\d{8}$/;

/*
  Local (Sri Lankan) mobiles are ten digits and always open `07`, so the field
  is a fixed ten-cell OTP input grouped the way the number is spoken -
  07X XXX XXXX. The prefix rule is checked as soon as the first two cells are
  filled rather than on submit, so a wrong network code is caught immediately.
*/
function prefixProblem(value: string): string | null {
  if (value.length >= 1 && value[0] !== "0") return "A mobile number starts with 07.";
  if (value.length >= 2 && value[1] !== "7") return "A mobile number starts with 07.";
  return null;
}

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const localError = prefixProblem(phone);
  const shownError = error ?? localError;
  const valid = PHONE_PATTERN.test(phone);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !valid) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Couldn't sign you in.");
        return;
      }
      // refresh() so the app layout re-reads the cookie it just received.
      router.replace("/");
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  const slotClass = `h-11 w-7 border-y border-r border-line-soft bg-ink font-mono text-sm text-text shadow-none first:rounded-l-xl first:border-l last:rounded-r-xl data-[active=true]:z-10 data-[active=true]:border-brand data-[active=true]:ring-0 ${
    shownError ? "border-rose data-[active=true]:border-rose" : ""
  }`;

  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-16">
      <div className="w-full max-w-sm">
        <LogoLockup className="mx-auto h-9 w-auto" />
        <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
          Outreach pipeline
        </p>

        <form
          onSubmit={submit}
          className="mt-8 rounded-2xl border border-line bg-surface p-5"
        >
          <label
            htmlFor="phone"
            className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted"
          >
            Your mobile number
          </label>

          <div className="mt-2">
            <InputOTP
              id="phone"
              value={phone}
              onChange={(next) => {
                setPhone(next);
                setError(null);
              }}
              maxLength={PHONE_LENGTH}
              pattern={REGEXP_ONLY_DIGITS}
              inputMode="numeric"
              autoComplete="tel"
              autoFocus
              disabled={busy}
              aria-invalid={shownError ? true : undefined}
              aria-describedby={shownError ? "login-error" : undefined}
              containerClassName="justify-between gap-1.5"
            >
              <InputOTPGroup>
                {[0, 1, 2].map((i) => (
                  <InputOTPSlot key={i} index={i} className={slotClass} />
                ))}
              </InputOTPGroup>
              <InputOTPGroup>
                {[3, 4, 5].map((i) => (
                  <InputOTPSlot key={i} index={i} className={slotClass} />
                ))}
              </InputOTPGroup>
              <InputOTPGroup>
                {[6, 7, 8, 9].map((i) => (
                  <InputOTPSlot key={i} index={i} className={slotClass} />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>

          <button
            type="submit"
            disabled={busy || !valid}
            className="mt-4 w-full rounded-xl bg-brand px-6 py-3.5 font-display text-sm font-bold text-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-muted"
          >
            {busy ? "Checking…" : "Continue"}
          </button>

          {shownError ? (
            <p id="login-error" role="alert" className="mt-3 text-xs text-rose">
              {shownError}
            </p>
          ) : (
            <p className="mt-3 text-center font-mono text-[10px] tracking-[0.14em] text-muted/70">
              07X XXX XXXX
            </p>
          )}
        </form>

        <p className="mt-4 text-center text-xs text-muted">
          Signing in keeps you signed in for a year.
        </p>
      </div>
    </main>
  );
}

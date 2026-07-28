"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogoLockup } from "@/components/Logo";

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim() }),
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
          <input
            id="phone"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setError(null);
            }}
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            autoFocus
            placeholder="07XXXXXXXX"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "login-error" : undefined}
            className={`mt-2 w-full rounded-xl border bg-ink px-4 py-3.5 font-mono text-sm tracking-wider placeholder:font-sans placeholder:tracking-normal placeholder:text-muted/70 focus:outline-none ${
              error ? "border-rose focus:border-rose" : "border-line-soft focus:border-brand"
            }`}
          />

          <button
            type="submit"
            disabled={busy || phone.trim().length < 9}
            className="mt-3 w-full rounded-xl bg-brand px-6 py-3.5 font-display text-sm font-bold text-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-muted"
          >
            {busy ? "Checking…" : "Continue"}
          </button>

          {error && (
            <p id="login-error" role="alert" className="mt-3 text-xs text-rose">
              {error}
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

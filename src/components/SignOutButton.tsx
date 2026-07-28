"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";

/**
 * Clears the session cookie and sends you back to the door. Used twice: in the
 * desktop sidebar footer, and in the Today header on mobile, where the bottom
 * tab bar has no room for a sixth control.
 */
export function SignOutButton({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    if (busy) return;
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      // The shell reads the cookie on the server, so the cache has to go too.
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={busy}
      title="Sign out"
      aria-label="Sign out"
      className={className}
    >
      <LogOut className="size-3.5" aria-hidden />
      {children}
    </button>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

const RUNNING = process.env.APP_VERSION;
const POLL_MS = 5 * 60 * 1000;
const FOCUS_THROTTLE_MS = 60 * 1000;

/*
  The desktop app hides to the tray instead of quitting, so a window can stay
  open for days on the code it loaded at launch and never see a new feature.
  This notices a newer deploy and offers a reload. It never reloads on its own:
  someone could be halfway through an SOP.
*/
export function UpdatePrompt() {
  const [latest, setLatest] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const lastCheck = useRef(0);

  useEffect(() => {
    if (!RUNNING || RUNNING === "dev") return;
    let cancelled = false;

    async function check() {
      lastCheck.current = Date.now();
      try {
        const response = await fetch("/api/version", { cache: "no-store" });
        // A redirect means the session lapsed and we got the login page, not a version.
        if (!response.ok || response.redirected) return;
        const { version } = (await response.json()) as { version?: string };
        if (!cancelled && version && version !== RUNNING) setLatest(version);
      } catch {
        // Offline or mid-deploy; the next check will catch up.
      }
    }
    function onReturn() {
      if (document.visibilityState === "visible" && Date.now() - lastCheck.current > FOCUS_THROTTLE_MS) void check();
    }

    const timer = window.setInterval(() => void check(), POLL_MS);
    window.addEventListener("focus", onReturn);
    document.addEventListener("visibilitychange", onReturn);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", onReturn);
      document.removeEventListener("visibilitychange", onReturn);
    };
  }, []);

  if (!latest || latest === dismissed) return null;
  return (
    <div
      role="status"
      className="fixed right-4 bottom-20 z-50 flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-well border border-line bg-surface-3 py-2.5 pr-2.5 pl-4 text-xs shadow-float md:bottom-4"
    >
      <span className="text-text">A new version of Reach is available.</span>
      <div className="flex shrink-0 gap-1">
        <Button size="sm" variant="ghost" onClick={() => setDismissed(latest)}>Later</Button>
        <Button size="sm" onClick={() => window.location.reload()}><RefreshCwIcon />Reload</Button>
      </div>
    </div>
  );
}

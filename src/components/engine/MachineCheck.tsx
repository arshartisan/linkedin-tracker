"use client";

import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { EngineHealth } from "@/lib/engine";

const CHECK_LABEL: Record<string, string> = {
  supabase: "Connection to Reach",
  claude: "Claude",
  claude_cli: "Claude CLI",
  upwork: "Upwork login",
  disk: "Disk space",
};

function uptime(s: number): string {
  if (s < 3600) return `${Math.round(s / 60)} min`;
  if (s < 86400) return `${(s / 3600).toFixed(1)} h`;
  return `${(s / 86400).toFixed(1)} days`;
}

/** The result of "Check machine": the live answer from the Windows machine, or why it didn't answer. */
export function MachineCheck({ result, at, onClose }: { result: EngineHealth; at: number; onClose: () => void }) {
  const good = result.reachable && result.report.ok;
  return (
    <section
      role="status"
      aria-label="Machine check"
      className={cn(
        "rounded-card border px-4 py-3 text-sm",
        good ? "border-brand-edge bg-brand-soft text-brand-tint"
          : result.reachable ? "border-amber-400/30 bg-amber-400/10 text-amber-300"
            : "border-[#4c2324] bg-rose-soft text-[#febfc6]",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p>
            <b>{good ? "Machine answered: all good" : result.reachable ? "Machine answered: needs attention" : "Machine didn't answer"}</b>
            <span className="ml-2 text-xs opacity-80">
              {new Date(at).toLocaleTimeString()} · {result.ms} ms
            </span>
          </p>
          {result.reachable ? (
            <>
              <p className="mt-1 text-xs opacity-90">
                {result.report.worker_id} v{result.report.version} · {result.report.status}
                {result.report.detail ? ` — ${result.report.detail}` : ""} · up {uptime(result.report.uptime_s)}
                {result.report.paused ? " · paused" : ""} · Chrome {result.report.chrome_running ? "open" : "closed"}
              </p>
              <ul className="mt-2 grid gap-x-6 gap-y-0.5 text-xs sm:grid-cols-2">
                {Object.entries(result.report.checks).map(([name, c]) => (
                  <li key={name} className="flex min-w-0 gap-2">
                    <span aria-hidden className={c.ok ? "text-brand" : "text-rose"}>{c.ok ? "✓" : "✕"}</span>
                    <span className="shrink-0">{CHECK_LABEL[name] ?? name}</span>
                    <span className="truncate opacity-75">
                      {c.detail}{c.at ? ` (${new Date(c.at).toLocaleTimeString()})` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-1 text-xs">{result.reason}</p>
          )}
        </div>
        <Button variant="ghost" size="icon-sm" aria-label="Close machine check" onClick={onClose}><XIcon /></Button>
      </div>
    </section>
  );
}

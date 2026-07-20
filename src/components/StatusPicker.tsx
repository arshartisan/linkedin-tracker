"use client";

import { STATUSES, STATUS_LABEL, type ConnectStatus } from "@/lib/types";

const TONE: Record<ConnectStatus, string> = {
  pending: "bg-surface-2 text-muted",
  accepted: "bg-teal-soft text-teal",
  ignored: "bg-rose-soft text-rose",
};

export function StatusPicker({
  value,
  onChange,
}: {
  value: ConnectStatus;
  onChange: (next: ConnectStatus) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Connection status"
      className="flex shrink-0 rounded-lg border border-line-soft bg-ink/40 p-0.5"
    >
      {STATUSES.map((status) => {
        const active = status === value;
        return (
          <button
            key={status}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(status)}
            className={`rounded-[6px] px-2.5 py-1 text-[11px] font-medium transition-colors ${
              active ? TONE[status] : "text-muted/70 hover:text-text"
            }`}
          >
            {STATUS_LABEL[status]}
          </button>
        );
      })}
    </div>
  );
}

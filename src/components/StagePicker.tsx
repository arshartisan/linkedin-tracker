"use client";

import { STAGES, STAGE_LABEL, STAGE_TONE, type Stage } from "@/lib/types";

/**
 * Six stages don't fit a segmented control on a phone, so this is a native
 * select wearing the chip's clothes — no popover code, no portal, and it uses
 * the OS picker on mobile.
 */
export function StagePicker({
  value,
  onChange,
}: {
  value: Stage;
  onChange: (next: Stage) => void;
}) {
  return (
    <div className="relative shrink-0">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Stage)}
        aria-label="Pipeline stage"
        className={`appearance-none rounded-lg py-1.5 pl-2.5 pr-7 text-[11px] font-medium transition-colors focus:outline-none ${STAGE_TONE[value]}`}
      >
        {STAGES.map((stage) => (
          <option key={stage} value={stage} className="bg-surface text-text">
            {STAGE_LABEL[stage]}
          </option>
        ))}
      </select>
      <svg
        viewBox="0 0 24 24"
        className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 opacity-70"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        aria-hidden
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  );
}

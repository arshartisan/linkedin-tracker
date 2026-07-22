"use client";

import { ChevronDownIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { STAGES, STAGE_LABEL, STAGE_TONE, type Stage } from "@/lib/types";

/**
 * The stage chip is also the control that changes it. A dropdown (rather than a
 * segmented row) keeps six stages inside a chip's footprint on any screen.
 */
export function StagePicker({
  value,
  onChange,
}: {
  value: Stage;
  onChange: (next: Stage) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Pipeline stage: ${STAGE_LABEL[value]}`}
        className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg py-1.5 pl-2.5 pr-2 text-[11px] font-medium transition-opacity outline-none hover:opacity-90 ${STAGE_TONE[value]}`}
      >
        {STAGE_LABEL[value]}
        <ChevronDownIcon className="size-3 opacity-70" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuLabel className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
          Stage
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(next) => onChange(next as Stage)}
        >
          {STAGES.map((stage) => (
            <DropdownMenuRadioItem key={stage} value={stage} className="text-xs">
              {STAGE_LABEL[stage]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

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
import {
  BIZ_STAGES,
  BIZ_STAGE_LABEL,
  BIZ_STAGE_TONE,
  type BizStage,
} from "@/lib/biz";

/**
 * The LinkedIn StagePicker's twin, on the local-business stage list. Kept
 * separate rather than generic: the two pipelines share a shape today but they
 * are different pieces of work, and folding them together would mean every
 * change to one has to be argued about in terms of the other.
 */
export function BizStagePicker({
  value,
  onChange,
}: {
  value: BizStage;
  onChange: (next: BizStage) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Pipeline stage: ${BIZ_STAGE_LABEL[value]}`}
        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full py-1.5 pr-2 pl-3 text-[11px] font-bold transition-opacity outline-none hover:opacity-90 ${BIZ_STAGE_TONE[value]}`}
      >
        {BIZ_STAGE_LABEL[value]}
        <ChevronDownIcon className="size-3 opacity-70" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel className="label">
          Stage
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(next) => onChange(next as BizStage)}
        >
          {BIZ_STAGES.map((stage) => (
            <DropdownMenuRadioItem key={stage} value={stage} className="text-xs">
              {BIZ_STAGE_LABEL[stage]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

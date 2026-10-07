"use client";

import { useId } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  COMPANY_OUTREACH_CHANNEL_LABEL,
  type CompanyOutreachChannel,
} from "@/lib/types";

const descriptions: Record<CompanyOutreachChannel, string> = {
  direct_email: "Contacted by email.",
  linkedin_message: "Sent a direct message on LinkedIn.",
  whatsapp: "Sent a message on WhatsApp.",
  messenger: "Sent a message on Messenger.",
};

export function CompanyOutreachChannels({
  value,
  onChange,
}: {
  value: CompanyOutreachChannel[];
  onChange: (channels: CompanyOutreachChannel[]) => void;
}) {
  const id = useId();

  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 text-xs font-semibold text-muted">Reached through</legend>
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {(Object.keys(COMPANY_OUTREACH_CHANNEL_LABEL) as CompanyOutreachChannel[]).map(
          (channel) => {
            const checked = value.includes(channel);
            const checkboxId = `${id}-${channel}`;

            return (
              <label
                key={channel}
                htmlFor={checkboxId}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-xl border border-line-soft bg-well p-3 transition-colors hover:border-line has-[:focus-visible]:border-ring",
                  checked && "border-brand/50 bg-brand-soft/20"
                )}
              >
                <Checkbox
                  id={checkboxId}
                  checked={checked}
                  aria-labelledby={`${checkboxId}-label`}
                  aria-describedby={`${checkboxId}-description`}
                  onCheckedChange={(nextChecked) =>
                    onChange(
                      nextChecked === true
                        ? [...value.filter((item) => item !== channel), channel]
                        : value.filter((item) => item !== channel)
                    )
                  }
                  className="mt-0.5 size-5 rounded-md bg-background shadow-none"
                />
                <span className="min-w-0">
                  <span id={`${checkboxId}-label`} className="block text-sm font-semibold text-text">
                    {COMPANY_OUTREACH_CHANNEL_LABEL[channel]}
                  </span>
                  <span id={`${checkboxId}-description`} className="mt-1 block text-xs leading-relaxed text-muted">
                    {descriptions[channel]}
                  </span>
                </span>
              </label>
            );
          }
        )}
      </div>
    </fieldset>
  );
}

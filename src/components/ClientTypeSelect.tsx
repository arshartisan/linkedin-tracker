"use client";

import * as Select from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { CLIENT_TYPE_LABEL, CLIENT_TYPE_TONE, hasClientLabel, type ClientType } from "@/lib/types";

export function ClientTypeSelect({ value, onChange, filter = false }: {
  value: ClientType | "all";
  onChange: (value: ClientType | "all") => void;
  filter?: boolean;
}) {
  if (!filter) {
    const current = value === "all" ? "unclassified" : value;
    return (
      <fieldset className="flex flex-wrap gap-3" aria-label="Client labels">
        <legend className="sr-only">Client labels — select either or both</legend>
        {(["enterprise", "potential"] as const).map((label) => (
          <label key={label} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs ${hasClientLabel(current, label) ? CLIENT_TYPE_TONE[label] : CLIENT_TYPE_TONE.unclassified}`}>
            <Checkbox checked={hasClientLabel(current, label)} onCheckedChange={(checked) => {
              const enterprise = label === "enterprise" ? checked === true : hasClientLabel(current, "enterprise");
              const potential = label === "potential" ? checked === true : hasClientLabel(current, "potential");
              onChange(enterprise && potential ? "enterprise_potential" : enterprise ? "enterprise" : potential ? "potential" : "unclassified");
            }} />
            {CLIENT_TYPE_LABEL[label]}
          </label>
        ))}
      </fieldset>
    );
  }
  return (
    <Select.Root value={value} onValueChange={(next) => onChange(next as ClientType | "all")}>
      <Select.Trigger aria-label={filter ? "Filter by client type" : "Client type"} className="w-full sm:w-auto"><Select.Value /></Select.Trigger>
      <Select.Content align="start">
        <Select.Group>
          <Select.GroupLabel>Client type</Select.GroupLabel>
          {filter && <Select.Item value="all">All client types</Select.Item>}
          {(Object.keys(CLIENT_TYPE_LABEL) as ClientType[]).map((type) => (
            <Select.Item key={type} value={type}><span className="flex items-center gap-2"><span aria-hidden className={`size-2 rounded-full border ${CLIENT_TYPE_TONE[type]}`} />{CLIENT_TYPE_LABEL[type]}</span></Select.Item>
          ))}
        </Select.Group>
      </Select.Content>
    </Select.Root>
  );
}

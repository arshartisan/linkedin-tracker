"use client";

import * as Select from "@/components/ui/select";
import { CLIENT_TYPE_LABEL, CLIENT_TYPE_TONE, type ClientType } from "@/lib/types";

export function ClientTypeSelect({ value, onChange, filter = false }: {
  value: ClientType | "all";
  onChange: (value: ClientType | "all") => void;
  filter?: boolean;
}) {
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

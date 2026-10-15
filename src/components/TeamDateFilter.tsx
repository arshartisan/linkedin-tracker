"use client";

import { CalendarDaysIcon } from "lucide-react";
import * as Select from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import type { DatePreset } from "@/lib/team";

export const DATE_PRESETS = {
  today: "Today",
  yesterday: "Yesterday",
  "7": "Last 7 days",
  "14": "Last 14 days",
  "30": "Last 30 days",
  "90": "Last 90 days",
  custom: "Custom range",
} as const;
export function TeamDateFilter({ value, onChange, custom, onCustomChange, today }: {
  value: DatePreset;
  onChange: (value: DatePreset) => void;
  custom: { from: string; to: string };
  onCustomChange: (value: { from: string; to: string }) => void;
  today: string;
}) {
  return <div className="flex flex-wrap items-end gap-2">
    <Select.Root value={value} onValueChange={(next) => onChange(next as DatePreset)}>
      <Select.Trigger aria-label="Team date range"><CalendarDaysIcon aria-hidden className="size-3.5 text-muted" /><Select.Value /></Select.Trigger>
      <Select.Content align="end"><Select.Group><Select.GroupLabel>Date range</Select.GroupLabel>
        {Object.entries(DATE_PRESETS).map(([key, label]) => <Select.Item key={key} value={key}>{label}</Select.Item>)}
      </Select.Group></Select.Content>
    </Select.Root>
    {value === "custom" && <>
      <label className="flex flex-col gap-1 text-xs text-muted">From<Input type="date" aria-label="Start date" value={custom.from} max={custom.to || today} onChange={(e) => { if (e.target.value && e.target.value <= custom.to) onCustomChange({ ...custom, from: e.target.value }); }} className="h-9 w-auto text-xs [color-scheme:dark]" /></label>
      <label className="flex flex-col gap-1 text-xs text-muted">To<Input type="date" aria-label="End date" value={custom.to} min={custom.from} max={today} onChange={(e) => { if (e.target.value && e.target.value >= custom.from && e.target.value <= today) onCustomChange({ ...custom, to: e.target.value }); }} className="h-9 w-auto text-xs [color-scheme:dark]" /></label>
    </>}
  </div>;
}

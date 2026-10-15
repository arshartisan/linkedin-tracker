"use client";

import { UsersIcon } from "lucide-react";
import * as Select from "@/components/ui/select";
import { USER_IDS, USER_LABEL, type UserId } from "@/lib/types";

export type MemberScope = UserId | "all";

export function MemberFilter({ value, onChange }: { value: MemberScope; onChange: (value: MemberScope) => void }) {
  return (
    <Select.Root value={value} onValueChange={(next) => onChange(next as MemberScope)}>
      <Select.Trigger aria-label="Filter by team member"><UsersIcon aria-hidden className="size-3.5 text-muted" /><Select.Value /></Select.Trigger>
      <Select.Content align="start">
        <Select.Group>
          <Select.GroupLabel>Logged by</Select.GroupLabel>
          <Select.Item value="all">All members</Select.Item>
          {USER_IDS.map((id) => <Select.Item key={id} value={id}>{USER_LABEL[id]}</Select.Item>)}
        </Select.Group>
      </Select.Content>
    </Select.Root>
  );
}

"use client";

import * as React from "react";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { ScrollArea, Select as SelectPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

// AlignUI's compact select, adapted to the app's tokens and installed primitives.
const Root = SelectPrimitive.Root;
const Value = SelectPrimitive.Value;
const Group = SelectPrimitive.Group;

function Trigger({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn(
        "group/select flex h-9 min-w-0 shrink-0 cursor-pointer items-center gap-2 rounded-lg bg-secondary py-2 pr-2 pl-3 text-left text-xs text-text shadow-sm ring-1 ring-line-soft ring-inset outline-none transition-colors hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-ring/60 disabled:pointer-events-none disabled:opacity-50 data-[placeholder]:text-muted [&>span]:truncate",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDownIcon className="ml-auto size-4 shrink-0 text-muted transition-transform duration-200 group-data-[state=open]/select:rotate-180" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function Content({ className, children, sideOffset = 8, position = "popper", ...props }: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        position={position}
        sideOffset={sideOffset}
        collisionPadding={8}
        className={cn(
          "relative z-50 max-h-(--radix-select-content-available-height) min-w-(--radix-select-trigger-width) overflow-hidden rounded-2xl border border-line-soft bg-surface text-text shadow-lg",
          className,
        )}
        {...props}
      >
        <ScrollArea.Root type="auto">
          <SelectPrimitive.Viewport asChild>
            <ScrollArea.Viewport className="max-h-[196px] w-full scroll-py-2 p-2" style={{ overflowY: undefined }}>
              {children}
            </ScrollArea.Viewport>
          </SelectPrimitive.Viewport>
          <ScrollArea.Scrollbar orientation="vertical" className="flex w-2 p-0.5">
            <ScrollArea.Thumb className="flex-1 rounded-full bg-line" />
          </ScrollArea.Scrollbar>
        </ScrollArea.Root>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

function Item({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "relative flex cursor-pointer items-center gap-2 rounded-lg py-2 pr-9 pl-2 text-xs outline-none select-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-surface-2",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="absolute top-1/2 right-2 -translate-y-1/2 text-muted">
        <CheckIcon className="size-4" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}

function GroupLabel({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return <SelectPrimitive.Label className={cn("px-2 pt-1 pb-2 text-[11px] font-medium text-muted", className)} {...props} />;
}

export { Root, Trigger, Value, Content, Group, GroupLabel, Item };

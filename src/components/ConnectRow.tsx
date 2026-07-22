"use client";

import { useState } from "react";
import {
  ExternalLinkIcon,
  MoreHorizontalIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import { useData } from "./DataProvider";
import { StagePicker } from "./StagePicker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatShort, formatTime } from "@/lib/date";
import { parseTags, profileSlug } from "@/lib/linkedin";
import { isStale, MAX_FOLLOWUPS, nextAction, type Action } from "@/lib/pipeline";
import type { Connect } from "@/lib/types";

/** "2 days late" reads as pressure; "in 2 days" reads as a plan. */
function timing(action: Action): { text: string; late: boolean } {
  if (action.overdue > 1) return { text: `${action.overdue}d late`, late: true };
  if (action.overdue === 1) return { text: "1d late", late: true };
  if (action.overdue === 0) return { text: "due today", late: false };
  if (action.overdue === -1) return { text: "tomorrow", late: false };
  return { text: formatShort(action.dueOn), late: false };
}

export function ConnectRow({
  connect,
  index = 0,
  /** The queue already knows the action; rows elsewhere work it out themselves. */
  action = nextAction(connect),
  showAction = true,
}: {
  connect: Connect;
  index?: number;
  action?: Action | null;
  showAction?: boolean;
}) {
  const { update, remove, setStage, complete } = useData();
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(connect.note);
  const [tags, setTags] = useState(connect.tags.join(", "));
  const [confirmDelete, setConfirmDelete] = useState(false);

  const slug = profileSlug(connect.profile_url);
  const due = action && action.overdue >= 0;
  const showCta = showAction && due;
  // Both follow-ups spent and still nothing — the only move left is to close it.
  const exhausted = showAction && !action && isStale(connect);

  async function saveDetails() {
    setEditing(false);
    const nextTags = parseTags(tags);
    const changed =
      note.trim() !== connect.note ||
      nextTags.join(",") !== connect.tags.join(",");
    if (changed) await update(connect.id, { note: note.trim(), tags: nextTags });
  }

  return (
    <li
      className="row-in rounded-xl border border-line-soft bg-surface px-4 py-3.5 transition-colors hover:border-line"
      style={{ animationDelay: `${Math.min(index, 12) * 22}ms` }}
    >
      <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">
              {connect.name || slug || "Unnamed"}
            </span>
            <span className="tabular shrink-0 font-mono text-[11px] text-muted">
              {formatTime(connect.created_at)}
            </span>
            {connect.stage === "messaged" && connect.followups > 0 && (
              <span
                className="tabular shrink-0 font-mono text-[10px] text-muted"
                title={`${connect.followups} of ${MAX_FOLLOWUPS} follow-ups sent`}
              >
                {"•".repeat(connect.followups)}
                {"◦".repeat(MAX_FOLLOWUPS - connect.followups)}
              </span>
            )}
          </div>

          <a
            href={connect.profile_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-0.5 inline-flex max-w-full items-center gap-1 truncate font-mono text-xs text-muted transition-colors hover:text-amber"
          >
            <span className="truncate">/in/{slug ?? connect.profile_url}</span>
            <svg
              viewBox="0 0 24 24"
              className="h-3 w-3 shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <path d="M7 17 17 7M9 7h8v8" />
            </svg>
          </a>

          {!editing && (connect.tags.length > 0 || connect.note) && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {connect.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted"
                >
                  {tag}
                </span>
              ))}
              {connect.note && (
                <span className="text-xs text-muted">{connect.note}</span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <StagePicker
            value={connect.stage}
            onChange={(stage) => setStage(connect, stage)}
          />

          {/* Delete still costs two clicks — the first only arms the menu item. */}
          <DropdownMenu onOpenChange={(open) => !open && setConfirmDelete(false)}>
            <DropdownMenuTrigger
              aria-label="Connect actions"
              className="rounded-md p-1.5 text-muted transition-colors outline-none hover:bg-surface-2 hover:text-text data-[state=open]:bg-surface-2 data-[state=open]:text-text"
            >
              <MoreHorizontalIcon className="size-4" aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                className="text-xs"
                onSelect={() => setEditing((v) => !v)}
              >
                <PencilIcon />
                {editing ? "Close details" : "Edit note and tags"}
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="text-xs">
                <a
                  href={connect.profile_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLinkIcon />
                  Open profile
                </a>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                className="text-xs"
                onSelect={(e) => {
                  if (!confirmDelete) {
                    e.preventDefault();
                    setConfirmDelete(true);
                    return;
                  }
                  remove(connect.id);
                }}
              >
                <Trash2Icon />
                {confirmDelete ? "Really delete?" : "Delete"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {showCta && action && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line-soft pt-3">
          <span className="text-xs text-muted">{action.label}</span>
          <span
            className={`tabular font-mono text-[10px] uppercase tracking-wide ${
              timing(action).late ? "text-rose" : "text-muted/70"
            }`}
          >
            {timing(action).text}
          </span>

          <div className="ml-auto flex items-center gap-2">
            {action.kind === "qualify" && (
              <button
                type="button"
                onClick={() => setStage(connect, "closed")}
                className="rounded-lg px-2.5 py-1.5 text-[11px] text-muted transition-colors hover:bg-surface-2 hover:text-rose"
              >
                Not a fit
              </button>
            )}
            <button
              type="button"
              onClick={() => complete(connect, action)}
              className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold text-ink transition-opacity hover:opacity-90 ${
                action.kind === "qualify" ? "bg-teal" : "bg-amber"
              }`}
            >
              {action.cta}
            </button>
          </div>
        </div>
      )}

      {exhausted && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line-soft pt-3">
          <span className="text-xs text-muted">
            No reply after {MAX_FOLLOWUPS} follow-ups.
          </span>
          <button
            type="button"
            onClick={() => setStage(connect, "closed")}
            className="ml-auto rounded-lg bg-surface-2 px-3 py-1.5 text-[11px] font-semibold text-muted transition-colors hover:text-rose"
          >
            Close it out
          </button>
        </div>
      )}

      {editing && (
        <div className="mt-3 grid gap-2 border-t border-line-soft pt-3 sm:grid-cols-[1fr_minmax(0,220px)]">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={saveDetails}
            placeholder="Note — what you said, or what to follow up on"
            className="rounded-lg border border-line-soft bg-ink px-3 py-2 text-sm placeholder:text-muted/60 focus:border-amber focus:outline-none"
          />
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            onBlur={saveDetails}
            placeholder="Tags, comma separated"
            className="rounded-lg border border-line-soft bg-ink px-3 py-2 font-mono text-xs placeholder:text-muted/60 focus:border-amber focus:outline-none"
          />
        </div>
      )}
    </li>
  );
}

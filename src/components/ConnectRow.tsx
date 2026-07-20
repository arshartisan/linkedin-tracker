"use client";

import { useState } from "react";
import { useData } from "./DataProvider";
import { StatusPicker } from "./StatusPicker";
import { formatTime } from "@/lib/date";
import { parseTags, profileSlug } from "@/lib/linkedin";
import type { Connect } from "@/lib/types";

export function ConnectRow({ connect, index = 0 }: { connect: Connect; index?: number }) {
  const { update, remove } = useData();
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(connect.note);
  const [tags, setTags] = useState(connect.tags.join(", "));
  const [confirmDelete, setConfirmDelete] = useState(false);

  const slug = profileSlug(connect.profile_url);

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
          <StatusPicker
            value={connect.status}
            onChange={(status) => update(connect.id, { status })}
          />

          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            aria-label={editing ? "Close details" : "Edit note and tags"}
            className="rounded-md p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-text"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              aria-hidden
            >
              <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3Z" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => (confirmDelete ? remove(connect.id) : setConfirmDelete(true))}
            onBlur={() => setConfirmDelete(false)}
            className={`rounded-md px-1.5 py-1.5 text-[11px] transition-colors ${
              confirmDelete
                ? "bg-rose-soft text-rose"
                : "text-muted hover:bg-surface-2 hover:text-rose"
            }`}
          >
            {confirmDelete ? (
              "Delete?"
            ) : (
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                aria-hidden
              >
                <path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" />
              </svg>
            )}
            <span className="sr-only">Remove this connect</span>
          </button>
        </div>
      </div>

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

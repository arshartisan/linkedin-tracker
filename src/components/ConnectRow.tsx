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
import { FIELD } from "@/components/ui/layout";
import { formatShort, formatTime } from "@/lib/date";
import { normaliseUrl, parseTags, profileSlug } from "@/lib/linkedin";
import { isStale, MAX_FOLLOWUPS, nextAction, type Action } from "@/lib/pipeline";
import type { Connect } from "@/lib/types";
import { OUTREACH_CHANNEL_LABEL } from "@/lib/types";

/** "2 days late" reads as pressure; "in 2 days" reads as a plan. */
function timing(action: Action): { text: string; late: boolean } {
  if (action.overdue > 1) return { text: `${action.overdue}d late`, late: true };
  if (action.overdue === 1) return { text: "1d late", late: true };
  if (action.overdue === 0) return { text: "due today", late: false };
  if (action.overdue === -1) return { text: "tomorrow", late: false };
  return { text: formatShort(action.dueOn), late: false };
}

/**
 * A row is a card in its own right: lists here are long and often grouped by
 * day, so wrapping each group in an outer panel would stack four radii deep.
 * The row carries the lift instead, and the wells appear one level in - the
 * action panel and the editor.
 */
export const ROW =
  "row-in rounded-well border border-line-soft bg-surface px-4 py-3.5 transition-colors hover:border-line";

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
  const [name, setName] = useState(connect.name);
  const [upworkUrl, setUpworkUrl] = useState(connect.upwork_url);
  const [profileUrl, setProfileUrl] = useState(connect.profile_url);
  const [email, setEmail] = useState(connect.email);
  const [projectTitle, setProjectTitle] = useState(connect.project_title);
  const [projectDescription, setProjectDescription] = useState(connect.project_description);
  const [clientReviews, setClientReviews] = useState(connect.client_reviews);
  const [channels, setChannels] = useState(connect.outreach_channels);
  const [note, setNote] = useState(connect.note);
  const [tags, setTags] = useState(connect.tags.join(", "));
  const [confirmDelete, setConfirmDelete] = useState(false);

  const slug = profileSlug(connect.profile_url);
  const due = action && action.overdue >= 0;
  const showCta = showAction && due;
  // Both follow-ups spent and still nothing - the only move left is to close it.
  const exhausted = showAction && !action && isStale(connect);

  async function saveDetails() {
    const nextTags = parseTags(tags);
    const nextProfileUrl = normaliseUrl(profileUrl);
    const nextChannels = [...new Set(channels)];
    const changed =
      name.trim() !== connect.name ||
      upworkUrl.trim() !== connect.upwork_url ||
      nextProfileUrl !== connect.profile_url ||
      email.trim() !== connect.email ||
      projectTitle.trim() !== connect.project_title ||
      projectDescription.trim() !== connect.project_description ||
      clientReviews.trim() !== connect.client_reviews ||
      nextChannels.join(",") !== connect.outreach_channels.join(",") ||
      note.trim() !== connect.note ||
      nextTags.join(",") !== connect.tags.join(",");
    if (changed) {
      await update(connect.id, {
        name: name.trim(),
        upwork_url: upworkUrl.trim(),
        profile_url: nextProfileUrl,
        email: email.trim(),
        project_title: projectTitle.trim(),
        project_description: projectDescription.trim(),
        client_reviews: clientReviews.trim(),
        outreach_channels: nextChannels,
        note: note.trim(),
        tags: nextTags,
      });
    }
  }

  /**
   * The editor closes when focus leaves it, not when either field blurs -
   * closing on a field blur unmounts the panel as you move from note to tags,
   * so the second field can never be reached.
   */
  function leaveEditor(e: React.FocusEvent<HTMLDivElement>) {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setEditing(false);
    void saveDetails();
  }

  return (
    <li className={ROW} style={{ animationDelay: `${Math.min(index, 12) * 22}ms` }}>
      <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-semibold">
              {connect.name || slug || "Unnamed"}
            </span>
            <span className="tabular shrink-0 text-[11px] text-muted">
              {formatTime(connect.created_at)}
            </span>
            {connect.stage === "messaged" && connect.followups > 0 && (
              <span
                className="tabular shrink-0 text-[10px] text-muted"
                title={`${connect.followups} of ${MAX_FOLLOWUPS} follow-ups sent`}
              >
                {"•".repeat(connect.followups)}
                {"◦".repeat(MAX_FOLLOWUPS - connect.followups)}
              </span>
            )}
          </div>

          {connect.project_title && (
            <p className="mt-2 text-sm font-medium text-text">{connect.project_title}</p>
          )}
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
            {connect.upwork_url && (
              <a href={connect.upwork_url} target="_blank" rel="noopener noreferrer" className="font-mono hover:text-brand">
                Upwork job ↗
              </a>
            )}
            {connect.profile_url && (
              <a href={connect.profile_url} target="_blank" rel="noopener noreferrer" className="font-mono hover:text-brand">
                LinkedIn ↗
              </a>
            )}
            {connect.email && <span>{connect.email}</span>}
          </div>

          {connect.outreach_channels.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {connect.outreach_channels.map((channel) => (
                <span key={channel} className="rounded-full bg-brand-soft px-2.5 py-0.5 text-[10px] font-semibold text-brand-dim">
                  {OUTREACH_CHANNEL_LABEL[channel]}
                </span>
              ))}
            </div>
          )}

          <a
            href={connect.profile_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex max-w-full items-center gap-1 truncate font-mono text-xs text-muted transition-colors hover:text-brand"
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
                  className="rounded-full bg-surface-2 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-muted uppercase"
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

          {/* Delete still costs two clicks - the first only arms the menu item. */}
          <DropdownMenu onOpenChange={(open) => !open && setConfirmDelete(false)}>
            <DropdownMenuTrigger
              aria-label="Connect actions"
              className="flex size-[30px] items-center justify-center rounded-full bg-secondary text-secondary-foreground shadow-raised transition-[background-color,color,scale] duration-150 ease-out-strong outline-none hover:bg-surface-2 active:scale-[0.96] data-[state=open]:bg-surface-2"
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
        <div className="well mt-3 flex flex-wrap items-center gap-2 px-3.5 py-2.5">
          <span className="text-xs text-muted">{action.label}</span>
          <span
            className={`tabular text-[10px] font-semibold tracking-wide uppercase ${
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
                className="inline-flex h-[26px] items-center rounded-full px-[9px] text-[12px] font-medium leading-none text-muted transition-[background-color,color,scale] duration-150 ease-out-strong hover:bg-white/6 hover:text-rose active:scale-[0.96]"
              >
                Not a fit
              </button>
            )}
            <button
              type="button"
              onClick={() => complete(connect, action)}
              className="inline-flex h-[26px] items-center rounded-full bg-primary px-[9px] text-[12px] font-medium leading-none text-primary-foreground shadow-primary transition-[background-color,scale] duration-150 ease-out-strong hover:bg-primary-hover active:scale-[0.96]"
            >
              {action.cta}
            </button>
          </div>
        </div>
      )}

      {exhausted && (
        <div className="well mt-3 flex flex-wrap items-center gap-2 px-3.5 py-2.5">
          <span className="text-xs text-muted">
            No reply after {MAX_FOLLOWUPS} follow-ups.
          </span>
          <button
            type="button"
            onClick={() => setStage(connect, "closed")}
            className="ml-auto inline-flex h-[26px] items-center rounded-full bg-secondary px-[9px] text-[12px] font-medium leading-none text-secondary-foreground shadow-raised transition-[background-color,color,scale] duration-150 ease-out-strong hover:bg-surface-2 hover:text-rose active:scale-[0.96]"
          >
            Close it out
          </button>
        </div>
      )}

      {editing && (
        <div
          onBlur={leaveEditor}
          className="mt-3 grid gap-2 border-t border-line-soft pt-3 sm:grid-cols-2"
        >
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Client name" className={FIELD} />
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email found" className={FIELD} />
          <input value={upworkUrl} onChange={(e) => setUpworkUrl(e.target.value)} placeholder="Upwork job link" className={`${FIELD} font-mono text-xs placeholder:font-sans placeholder:text-sm`} />
          <input value={profileUrl} onChange={(e) => setProfileUrl(e.target.value)} placeholder="LinkedIn profile link" className={`${FIELD} font-mono text-xs placeholder:font-sans placeholder:text-sm`} />
          <input value={projectTitle} onChange={(e) => setProjectTitle(e.target.value)} placeholder="Project title" className={FIELD} />
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Tags, comma separated" className={`${FIELD} font-mono text-xs placeholder:font-sans placeholder:text-sm`} />
          <textarea value={projectDescription} onChange={(e) => setProjectDescription(e.target.value)} placeholder="Project description" className={`${FIELD} min-h-20`} />
          <textarea value={clientReviews} onChange={(e) => setClientReviews(e.target.value)} placeholder="Past client reviews" className={`${FIELD} min-h-20`} />
          <div className="flex flex-wrap gap-3 sm:col-span-2">
            {Object.entries(OUTREACH_CHANNEL_LABEL).map(([channel, label]) => {
              const value = channel as keyof typeof OUTREACH_CHANNEL_LABEL;
              return (
                <label key={channel} className="flex items-center gap-2 text-xs text-muted">
                  <input
                    type="checkbox"
                    checked={channels.includes(value)}
                    onChange={(e) =>
                      setChannels((current) =>
                        e.target.checked
                          ? [...current, value]
                          : current.filter((item) => item !== value)
                      )
                    }
                  />
                  {label}
                </label>
              );
            })}
          </div>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note - what you said, or what to follow up on"
            className={FIELD}
          />
        </div>
      )}
    </li>
  );
}

"use client";

import { useState } from "react";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { useData } from "./DataProvider";
import { FIELD } from "@/components/ui/layout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { formatTime } from "@/lib/date";
import {
  COMPANY_OUTREACH_CHANNEL_LABEL,
  type Company,
  type CompanyOutreachChannel,
} from "@/lib/types";

export function CompanyRow({ company, index = 0 }: { company: Company; index?: number }) {
  const { updateCompany, removeCompany } = useData();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(company.company_name);
  const [email, setEmail] = useState(company.email);
  const [websiteUrl, setWebsiteUrl] = useState(company.website_url);
  const [linkedinUrl, setLinkedinUrl] = useState(company.linkedin_url);
  const [channels, setChannels] = useState(company.outreach_channels);
  const [note, setNote] = useState(company.note);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function save() {
    const nextChannels = [...new Set(channels)];
    const patch = {
      company_name: name.trim(),
      email: email.trim(),
      website_url: websiteUrl.trim(),
      linkedin_url: linkedinUrl.trim(),
      outreach_channels: nextChannels,
      note: note.trim(),
    };
    if (
      patch.company_name === company.company_name &&
      patch.email === company.email &&
      patch.website_url === company.website_url &&
      patch.linkedin_url === company.linkedin_url &&
      patch.note === company.note &&
      nextChannels.join(",") === company.outreach_channels.join(",")
    ) {
      return;
    }
    setSaving(true);
    try {
      await updateCompany(company.id, patch);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setSaving(true);
    try {
      await removeCompany(company.id);
    } finally {
      setSaving(false);
    }
  }

  return (
    <li
      className="row-in rounded-well border border-line-soft bg-surface px-4 py-3.5 transition-colors hover:border-line"
      style={{ animationDelay: `${Math.min(index, 12) * 22}ms` }}
    >
      {editing ? (
        <div className="grid gap-2.5 sm:grid-cols-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Company name"
            className={FIELD}
            autoFocus
          />
          <input
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            placeholder="Company website"
            className={`${FIELD} font-mono text-xs placeholder:font-sans placeholder:text-sm`}
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Emails"
            className={FIELD}
          />
          <input
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
            placeholder="LinkedIn company profile"
            className={`${FIELD} font-mono text-xs placeholder:font-sans placeholder:text-sm`}
          />
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note"
            className={FIELD}
          />
          <div className="sm:col-span-2">
            <p className="mb-2 text-xs font-semibold text-muted">Reached through</p>
            <div className="flex flex-wrap gap-3">
              {(Object.keys(COMPANY_OUTREACH_CHANNEL_LABEL) as CompanyOutreachChannel[]).map(
                (channel) => (
                  <label key={channel} className="flex cursor-pointer items-center gap-2 text-xs text-muted">
                    <Checkbox
                      checked={channels.includes(channel)}
                      onCheckedChange={(checked) =>
                        setChannels((current) =>
                          checked
                            ? [...current, channel]
                            : current.filter((item) => item !== channel)
                        )
                      }
                    />
                    {COMPANY_OUTREACH_CHANNEL_LABEL[channel]}
                  </label>
                )
              )}
            </div>
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <Button
              variant="default"
              size="sm"
              type="button"
              onClick={() => void save()}
              disabled={!name.trim() || saving}
              className="rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-ink disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-full px-3 py-1.5 text-xs font-semibold text-muted hover:text-text"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate font-semibold">{company.company_name || "Unnamed company"}</span>
              <span className="tabular shrink-0 text-[11px] text-muted">
                {formatTime(company.created_at)}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
              {company.email && <a href={`mailto:${company.email}`} className="hover:text-brand">{company.email}</a>}
              {company.website_url && (
                <a href={company.website_url} target="_blank" rel="noopener noreferrer" className="font-mono hover:text-brand">
                  Website ↗
                </a>
              )}
              {company.linkedin_url && (
                <a href={company.linkedin_url} target="_blank" rel="noopener noreferrer" className="font-mono hover:text-brand">
                  LinkedIn company ↗
                </a>
              )}
            </div>
            {company.outreach_channels.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {company.outreach_channels.map((channel) => (
                  <span key={channel} className="rounded-full bg-brand-soft px-2.5 py-0.5 text-[10px] font-semibold text-brand-dim">
                    {COMPANY_OUTREACH_CHANNEL_LABEL[channel]}
                  </span>
                ))}
              </div>
            )}
            {company.note && <p className="mt-2 text-xs text-muted">{company.note}</p>}
          </div>
          <div className="flex items-center gap-1">
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => setEditing(true)} aria-label={`Edit ${company.company_name}`} className="text-muted hover:bg-surface-2 hover:text-text">
              <PencilIcon className="size-4" />
            </Button>
            {confirmDelete ? (
              <Button type="button" variant="ghost" size="xs" onClick={() => void remove()} disabled={saving} className="text-rose hover:bg-rose-soft">
                Delete
              </Button>
            ) : (
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => setConfirmDelete(true)} aria-label={`Delete ${company.company_name}`} className="text-muted hover:bg-rose-soft hover:text-rose">
                <Trash2Icon className="size-4" />
              </Button>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

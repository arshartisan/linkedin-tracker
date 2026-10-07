"use client";

import { useState } from "react";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { useData } from "./DataProvider";
import { FIELD } from "@/components/ui/layout";
import { Button } from "@/components/ui/button";
import { CompanyOutreachChannels } from "./CompanyOutreachChannels";
import { formatShort, formatTime } from "@/lib/date";
import {
  COMPANY_OUTREACH_CHANNEL_LABEL,
  type Company,
} from "@/lib/types";

export function CompanyRow({ company, index = 0, table = false }: { company: Company; index?: number; table?: boolean }) {
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
  const [error, setError] = useState<string | null>(null);

  function edit() {
    setName(company.company_name);
    setEmail(company.email);
    setWebsiteUrl(company.website_url);
    setLinkedinUrl(company.linkedin_url);
    setChannels(company.outreach_channels);
    setNote(company.note);
    setError(null);
    setConfirmDelete(false);
    setEditing(true);
  }

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
      setEditing(false);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateCompany(company.id, patch);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the company.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setSaving(true);
    setError(null);
    try {
      await removeCompany(company.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the company.");
    } finally {
      setSaving(false);
    }
  }

  if (table && !editing) {
    return (
      <tr className="border-b border-line-soft text-xs transition-colors last:border-b-0 hover:bg-surface/60">
        <td className="px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span aria-hidden className="flex size-7 shrink-0 items-center justify-center rounded-control border border-line bg-surface-2 text-xs font-medium text-brand-tint">
              {company.company_name.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <span className="block max-w-64 truncate text-[13px] font-medium">{company.company_name || "Unnamed company"}</span>
              {company.note && <span className="mt-0.5 block max-w-64 truncate text-[11px] text-muted" title={company.note}>{company.note}</span>}
            </div>
          </div>
        </td>
        <td className="px-4 py-3 text-muted">{company.email ? <a href={`mailto:${company.email}`} className="hover:text-text">{company.email}</a> : "—"}</td>
        <td className="px-4 py-3">
          <div className="flex gap-3 text-muted">
            {company.website_url && <a href={company.website_url} target="_blank" rel="noopener noreferrer" className="hover:text-text">Website ↗</a>}
            {company.linkedin_url && <a href={company.linkedin_url} target="_blank" rel="noopener noreferrer" className="hover:text-text">LinkedIn ↗</a>}
            {!company.website_url && !company.linkedin_url && "—"}
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap gap-1">
            {company.outreach_channels.map((channel) => <span key={channel} className="rounded-full border border-brand-edge bg-brand-soft px-2 py-0.5 text-[11px] text-brand-tint">{COMPANY_OUTREACH_CHANNEL_LABEL[channel]}</span>)}
            {company.outreach_channels.length === 0 && <span className="text-muted">—</span>}
          </div>
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-muted">{formatShort(company.created_at.slice(0, 10))}</td>
        <td className="px-3 py-3">
          <div className="flex justify-end gap-1">
            <Button type="button" variant="ghost" size="icon-sm" onClick={edit} aria-label={`Edit ${company.company_name}`}><PencilIcon className="size-3.5" /></Button>
            {confirmDelete ? <><Button type="button" variant="ghost" size="xs" onClick={() => void remove()} disabled={saving} className="text-rose">Delete</Button><Button type="button" variant="ghost" size="xs" onClick={() => setConfirmDelete(false)}>Cancel</Button></> : <Button type="button" variant="ghost" size="icon-sm" onClick={() => setConfirmDelete(true)} aria-label={`Delete ${company.company_name}`} className="hover:text-rose"><Trash2Icon className="size-3.5" /></Button>}
          </div>
          {error && <p role="alert" className="mt-2 max-w-40 text-rose">{error}</p>}
        </td>
      </tr>
    );
  }

  const content = (
    <>
      {editing ? (
        <div className="grid gap-2.5 sm:grid-cols-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Company name"
            aria-label="Company name"
            className={FIELD}
            autoFocus
          />
          <input
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            placeholder="Company website"
            aria-label="Company website"
            className={`${FIELD} font-mono text-xs placeholder:font-sans placeholder:text-sm`}
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Emails"
            aria-label="Company email"
            className={FIELD}
          />
          <input
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
            placeholder="LinkedIn company profile"
            aria-label="LinkedIn company profile"
            className={`${FIELD} font-mono text-xs placeholder:font-sans placeholder:text-sm`}
          />
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note"
            aria-label="Company note"
            className={FIELD}
          />
          <div className="sm:col-span-2">
            <CompanyOutreachChannels value={channels} onChange={setChannels} />
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <Button
              variant="default"
              size="sm"
              type="button"
              onClick={() => void save()}
              disabled={!name.trim() || saving}
              className="px-3 py-1.5 text-xs disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => { setEditing(false); setError(null); }}
              disabled={saving}
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
            <Button type="button" variant="ghost" size="icon-sm" onClick={edit} aria-label={`Edit ${company.company_name}`} className="text-muted hover:bg-surface-2 hover:text-text">
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
      {error && <p role="alert" className="mt-2 text-xs text-rose">{error}</p>}
    </>
  );

  return table ? (
    <tr className="border-b border-line-soft bg-surface/60"><td colSpan={6} className="p-4">{content}</td></tr>
  ) : (
    <li className="row-in rounded-well border border-line-soft bg-surface px-4 py-3.5 transition-colors hover:border-line" style={{ animationDelay: `${Math.min(index, 12) * 22}ms` }}>{content}</li>
  );
}

"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FIELD } from "@/components/ui/layout";
import { EMPTY_STARTUP, findStartupDuplicate, STARTUP_CHANNEL_LABEL, type Startup, type StartupChannel, type StartupDetails } from "@/lib/startup";
import { USER_LABEL } from "@/lib/types";

export function StartupForm({ startup, rows, onSave, onCancel }: {
  startup?: Startup;
  rows: Startup[];
  onSave: (details: StartupDetails) => Promise<void>;
  onCancel: () => void;
}) {
  const formId = useId();
  const [draft, setDraft] = useState<StartupDetails>(startup ?? { ...EMPTY_STARTUP, founder_linkedin_urls: [""] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const duplicate = findStartupDuplicate(rows, draft, startup?.id);
  function change<K extends keyof StartupDetails>(key: K, value: StartupDetails[K]) {
    setDraft((previous) => ({ ...previous, [key]: value }));
    setError(null);
  }
  function field(key: "name" | "website_url" | "yc_url" | "email" | "linkedin_url" | "facebook_url" | "x_url" | "instagram_url", label: string, placeholder: string) {
    return <label className="grid min-w-0 gap-1.5 text-xs text-muted" key={key} htmlFor={`${formId}-${key}`}>
      {label}
      <input id={`${formId}-${key}`} className={FIELD} value={draft[key]} placeholder={placeholder}
        required={key === "name"} type={key === "email" ? "email" : "text"} inputMode={key.endsWith("_url") ? "url" : undefined}
        autoFocus={key === "name"} onChange={(event) => change(key, event.target.value)} />
    </label>;
  }

  return <form className="rounded-card border border-line-soft bg-surface p-4 sm:p-5" aria-label={startup ? "Edit startup" : "Add startup"}
    onSubmit={async (event) => {
      event.preventDefault();
      if (saving || duplicate) return;
      setSaving(true); setError(null);
      try { await onSave(draft); }
      catch (err) { setError(err instanceof Error ? err.message : "Could not save startup."); }
      finally { setSaving(false); }
    }}>
    <fieldset disabled={saving} className="grid min-w-0 gap-5">
      <legend className="mb-4 text-sm font-medium">{startup ? `Edit ${startup.name}` : "New startup"}</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {field("name", "Startup name *", "e.g. Acme")}
        {field("email", "Email", "hello@acme.com")}
        {field("website_url", "Website", "https://acme.com")}
        {field("yc_url", "YC page", "https://www.ycombinator.com/companies/acme")}
      </div>
      <fieldset className="min-w-0">
        <legend className="mb-2 text-xs font-medium text-muted">Founders’ LinkedIn profiles</legend>
        <div className="grid gap-2">
          {draft.founder_linkedin_urls.map((url, index) => <div key={index} className="flex min-w-0 items-center gap-2">
            <input className={FIELD} aria-label={`Founder ${index + 1} LinkedIn profile`} value={url} inputMode="url" placeholder="https://www.linkedin.com/in/founder"
              onChange={(event) => change("founder_linkedin_urls", draft.founder_linkedin_urls.map((value, position) => position === index ? event.target.value : value))} />
            <Button type="button" variant="ghost" size="sm" aria-label={`Remove founder ${index + 1}`} onClick={() => change("founder_linkedin_urls", draft.founder_linkedin_urls.filter((_, position) => position !== index))}>Remove</Button>
          </div>)}
        </div>
        <Button type="button" variant="secondary" size="sm" className="mt-2" onClick={() => change("founder_linkedin_urls", [...draft.founder_linkedin_urls, ""])}>Add founder</Button>
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-2">
        {field("linkedin_url", "Startup LinkedIn", "https://www.linkedin.com/company/acme")}
        {field("facebook_url", "Facebook", "https://facebook.com/acme")}
        {field("x_url", "X", "https://x.com/acme")}
        {field("instagram_url", "Instagram", "https://instagram.com/acme")}
        <label className="grid gap-1.5 text-xs text-muted sm:col-span-2" htmlFor={`${formId}-socials`}>Other social links (one per line)
          <textarea id={`${formId}-socials`} rows={2} className={FIELD} value={draft.other_social_urls.join("\n")} placeholder="https://..." onChange={(event) => change("other_social_urls", event.target.value.split("\n"))} />
        </label>
      </div>
      <fieldset>
        <legend className="mb-2 text-xs font-medium text-muted">Reached through</legend>
        <p className="mb-3 text-xs text-muted">Select the methods you have used to contact this startup. Leave empty if you have not contacted them yet.</p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(STARTUP_CHANNEL_LABEL) as StartupChannel[]).map((channel) => <label key={channel} htmlFor={`${formId}-channel-${channel}`} className="flex cursor-pointer items-center gap-2 rounded-control border border-line-soft bg-well px-3 py-2 text-xs has-[[data-state=checked]]:border-brand/50">
            <Checkbox id={`${formId}-channel-${channel}`} checked={draft.outreach_channels.includes(channel)} onCheckedChange={(checked) => change("outreach_channels", checked === true ? [...draft.outreach_channels.filter((value) => value !== channel), channel] : draft.outreach_channels.filter((value) => value !== channel))} />
            {STARTUP_CHANNEL_LABEL[channel]}
          </label>)}
        </div>
      </fieldset>
      <label className="grid gap-1.5 text-xs text-muted" htmlFor={`${formId}-note`}>Notes
        <textarea id={`${formId}-note`} rows={2} className={FIELD} value={draft.note} placeholder="Contact details, conversation notes, or next steps" onChange={(event) => change("note", event.target.value)} />
      </label>
      {duplicate && <p role="alert" className="rounded-control border border-brand-edge bg-brand-soft p-3 text-xs text-brand-tint">Already tracked: {duplicate.name}, added by {USER_LABEL[duplicate.owner]}. The startup name or a LinkedIn profile matches. Use the existing startup.</p>}
      {error && <p role="alert" className="text-sm text-rose">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={!draft.name.trim() || Boolean(duplicate)}>{saving ? "Saving…" : startup ? "Save changes" : "Add startup"}</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </fieldset>
  </form>;
}

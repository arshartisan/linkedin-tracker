"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { DraftStatus } from "@/components/DraftStatus";
import { draftKey, useFormDraft } from "@/hooks/use-form-draft";
import { FIELD } from "@/components/ui/layout";
import { EMPTY_CONTACT, findContactDuplicate, type Contact, type ContactDetails } from "@/lib/contact";
import { USER_LABEL, type UserId } from "@/lib/types";

type Field = keyof ContactDetails;

export function ContactForm({ me, contact, rows, onSave, onCancel }: {
  me: UserId;
  contact?: Contact;
  rows: Contact[];
  onSave: (details: ContactDetails) => Promise<void>;
  onCancel: () => void;
}) {
  const formId = useId();
  const [draft, setDraft] = useState<ContactDetails>(contact ?? EMPTY_CONTACT);
  // Only a new contact is a draft; edits to an existing one save or cancel as before.
  const saved = useFormDraft({ key: contact ? null : draftKey(me, "contact"), value: draft, empty: EMPTY_CONTACT, restore: setDraft });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const duplicate = findContactDuplicate(rows, draft.email, contact?.email);

  function field(key: Field, label: string, placeholder: string, options: { type?: string; inputMode?: "url" | "tel" | "email"; autoComplete?: string } = {}) {
    const required = key === "name" || key === "email";
    return <label className="grid min-w-0 gap-1.5 text-xs text-muted" htmlFor={`${formId}-${key}`}>
      {label}{required && " *"}
      <input id={`${formId}-${key}`} className={FIELD} value={draft[key]} placeholder={placeholder} required={required}
        type={options.type ?? "text"} inputMode={options.inputMode} autoComplete={options.autoComplete ?? "off"} autoFocus={key === "name"}
        onChange={(event) => { setDraft((previous) => ({ ...previous, [key]: event.target.value })); setError(null); }} />
    </label>;
  }

  return <form className="rounded-card border border-line-soft bg-surface p-4 sm:p-5" aria-label={contact ? "Edit contact" : "Add contact"}
    onSubmit={async (event) => {
      event.preventDefault();
      if (saving || duplicate) return;
      setSaving(true); setError(null);
      try { await onSave(draft); saved.clear(); }
      catch (err) { setError(err instanceof Error ? err.message : "Could not save contact."); }
      finally { setSaving(false); }
    }}>
    <fieldset disabled={saving} className="grid min-w-0 gap-5">
      <legend className="mb-4 text-sm font-medium">{contact ? `Edit ${contact.name}` : "New contact"}</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {field("name", "Name", "e.g. Jane Doe")}
        {field("email", "Email", "jane@acme.com", { type: "email", inputMode: "email" })}
        {field("phone", "Mobile number", "+1 555 123 4567", { type: "tel", inputMode: "tel" })}
        {field("country", "Country", "e.g. United States")}
        <div className="sm:col-span-2">{field("social_url", "Social media link", "https://www.linkedin.com/in/jane", { inputMode: "url" })}</div>
      </div>
      {duplicate && <p role="alert" className="rounded-control border border-brand-edge bg-brand-soft p-3 text-xs text-brand-tint">Already saved: {duplicate.name} ({duplicate.email}), added by {USER_LABEL[duplicate.owner]}. Each email can only be saved once.</p>}
      {error && <p role="alert" className="text-sm text-rose">{error}</p>}
      <DraftStatus dirty={saved.dirty} restoredAt={saved.restoredAt} onDiscard={() => { saved.discard(); setError(null); }} />
      <div className="flex gap-2">
        <Button type="submit" disabled={!draft.name.trim() || !draft.email.trim() || Boolean(duplicate)}>{saving ? "Saving…" : contact ? "Save changes" : "Add contact"}</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </fieldset>
  </form>;
}

"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { FIELD } from "@/components/ui/layout";
import { cn } from "@/lib/utils";
import { USER_LABEL, type UserId } from "@/lib/types";
import { ago, engineStore, type EngineSetting } from "@/lib/engine";

/** Signs that the profile is still the starter template, so drafts would quote made-up case studies. */
const PLACEHOLDER_MARKS = ["YOUR NAME", "https://...", "Logistics startup: built a shipment-tracking dashboard"];

/**
 * The text Claude uses to describe you in every email and lead message: name, services,
 * case studies, tone. Stored in Supabase so it can be edited here; the worker reads it
 * each time it writes a message.
 */
export function ProfileEditor({ me }: { me: UserId }) {
  const [saved, setSaved] = useState<EngineSetting | null>(null);
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // `loading` starts true; Retry sets it again before calling this.
  async function load() {
    try {
      const row = await engineStore.setting("my_profile");
      setSaved(row);
      setValue(row?.value ?? "");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the profile.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const first = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(first);
  }, []);

  const dirty = value !== (saved?.value ?? "");
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function save() {
    setSaving(true);
    try {
      const row = await engineStore.saveSetting("my_profile", value, me);
      setSaved(row);
      setValue(row.value);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the profile.");
    } finally {
      setSaving(false);
    }
  }

  const placeholder = PLACEHOLDER_MARKS.some((mark) => value.includes(mark));

  return (
    <section className="card overflow-hidden">
      <div className="border-b border-line-soft px-4 py-2.5 text-xs text-muted">
        Who you are, what you do, real case studies and your tone. Claude reads this every time it writes an email or a lead message,
        and only claims what it says here.
      </div>
      <div className="flex flex-col gap-3 p-4">
        {error && (
          <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-rose">
            {error}<Button variant="secondary" size="sm" onClick={() => { setLoading(true); void load(); }}>Retry</Button>
          </div>
        )}
        {!loading && !error && !saved && (
          <p className="text-xs text-muted">
            Nothing saved here yet. The worker uploads its <code>templates/my_profile.md</code> the next time it starts,
            and uses that file until then. You can also write the profile here and save it.
          </p>
        )}
        {placeholder && (
          <p role="alert" className="rounded-card border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-300">
            This still looks like the starter template. Replace the name, link and example case studies with your own,
            or drafts will quote results you never had.
          </p>
        )}
        <textarea aria-label="Your profile" value={value} disabled={loading} readOnly={saving} aria-busy={saving}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); if (dirty) void save(); } }}
          placeholder={loading ? "Loading…" : "# My profile\n\nName: …\n\n## What I do\n- …\n\n## Case studies\n- …\n\n## Tone\n…"}
          className={cn(FIELD, "min-h-[420px] resize-y font-mono text-[13px] leading-relaxed")} />
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm" disabled={!dirty || saving || loading} onClick={() => void save()}>
            {saving ? "Saving…" : "Save profile"}
          </Button>
          {dirty && (
            <Button variant="ghost" size="sm" disabled={saving} onClick={() => setValue(saved?.value ?? "")}>Discard changes</Button>
          )}
          <span aria-live="polite" className="text-xs text-muted">
            {dirty ? "Unsaved changes" : saved
              ? `Saved ${ago(saved.updated_at)}${saved.updated_by ? ` by ${USER_LABEL[saved.updated_by]}` : " by the worker"}. Used from the next message the worker writes.`
              : ""}
          </span>
        </div>
      </div>
    </section>
  );
}

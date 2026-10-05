"use client";

import { useMemo, useRef, useState } from "react";
import { useData } from "./DataProvider";
import { Card, FIELD, PrimaryButton } from "@/components/ui/layout";
import { isLinkedInUrl, isUpworkUrl, nameFromUrl, parseTags } from "@/lib/linkedin";
import { formatShort, relativeDay } from "@/lib/date";
import { DUPLICATE_MESSAGE } from "@/lib/store";
import { OUTREACH_CHANNEL_LABEL, type OutreachChannel, USER_LABEL } from "@/lib/types";

export function AddUpwork() {
  const { me, add, findDuplicate } = useData();
  const [upworkUrl, setUpworkUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [name, setName] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [clientReviews, setClientReviews] = useState("");
  const [email, setEmail] = useState("");
  const [channels, setChannels] = useState<OutreachChannel[]>([]);
  const [note, setNote] = useState("");
  const [tags, setTags] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const urlRef = useRef<HTMLInputElement>(null);

  const trimmedUpworkUrl = upworkUrl.trim();
  const trimmedLinkedinUrl = linkedinUrl.trim();
  const valid = isUpworkUrl(trimmedUpworkUrl);
  const duplicate = useMemo(() => {
    if (!valid) return null;
    return (
      findDuplicate(trimmedUpworkUrl, "upwork") ??
      (isLinkedInUrl(trimmedLinkedinUrl)
        ? findDuplicate(trimmedLinkedinUrl, "profile")
        : null)
    );
  }, [findDuplicate, trimmedLinkedinUrl, trimmedUpworkUrl, valid]);
  const derivedName = isLinkedInUrl(trimmedLinkedinUrl)
    ? nameFromUrl(trimmedLinkedinUrl)
    : "";
  const blocked = Boolean(duplicate);
  const raced = error === DUPLICATE_MESSAGE;

  function reset() {
    setUpworkUrl("");
    setLinkedinUrl("");
    setName("");
    setProjectTitle("");
    setProjectDescription("");
    setClientReviews("");
    setEmail("");
    setChannels([]);
    setNote("");
    setTags("");
    setShowDetails(false);
    urlRef.current?.focus();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) {
      setError("Paste a valid Upwork job link.");
      return;
    }
    if (blocked) {
      setError(DUPLICATE_MESSAGE);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await add({
        profile_url: trimmedLinkedinUrl,
        upwork_url: trimmedUpworkUrl,
        name: name.trim() || derivedName,
        project_title: projectTitle,
        project_description: projectDescription,
        client_reviews: clientReviews,
        email,
        outreach_channels: channels,
        note,
        tags: parseTags(tags),
      });
      reset();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card as="div" className="p-4 sm:p-5">
      <form onSubmit={submit}>
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <input
            ref={urlRef}
            value={upworkUrl}
            onChange={(e) => {
              setUpworkUrl(e.target.value);
              setError(null);
            }}
            placeholder="Paste the Upwork job link"
            aria-label="Upwork job link"
            aria-invalid={blocked || raced || undefined}
            aria-describedby={duplicate || raced ? "duplicate-warning" : undefined}
            autoComplete="off"
            spellCheck={false}
            className={`${FIELD} min-w-0 flex-1 py-3.5 font-mono text-[13px] placeholder:font-sans placeholder:text-sm ${
              blocked || raced ? "border-rose/60 focus:border-rose" : ""
            }`}
          />
          <PrimaryButton type="submit" disabled={!valid || blocked || raced || saving} className="shrink-0 sm:self-center">
            <span aria-hidden>+</span>
            {saving ? "Logging…" : "Log job"}
          </PrimaryButton>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
          <button type="button" onClick={() => setShowDetails((v) => !v)} className="text-xs font-semibold text-muted transition-colors hover:text-text">
            {showDetails ? "Hide job and outreach details" : "Add client, research and outreach details"}
          </button>
          {error && !raced && <span className="text-xs text-rose">{error}</span>}
        </div>

        {duplicate ? (
          <div id="duplicate-warning" role="alert" className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-well border border-rose/25 bg-rose-soft/35 px-3.5 py-2.5 text-xs">
            <span className="text-rose">
              {duplicate.owner === me.id ? "You already logged this job or client" : `${USER_LABEL[duplicate.owner]} already logged this job or client`}{" "}
              ({relativeDay(duplicate.sent_on)?.toLowerCase() ?? formatShort(duplicate.sent_on)}).
            </span>
            <a href={duplicate.upwork_url || duplicate.profile_url} target="_blank" rel="noopener noreferrer" className="ml-auto rounded-full bg-ink/50 px-2.5 py-1 font-medium text-muted transition-colors hover:text-text">
              Open existing record
            </a>
          </div>
        ) : (
          raced && <div id="duplicate-warning" role="alert" className="mt-3 rounded-well border border-rose/25 bg-rose-soft/35 px-3.5 py-2.5 text-xs text-rose">{DUPLICATE_MESSAGE} Reload to see who has them.</div>
        )}

        {showDetails && (
          <div className="mt-3 grid gap-2.5 border-t border-line-soft pt-3.5 sm:grid-cols-3">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Client name" className={FIELD} />
            <input value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="LinkedIn profile URL" className={`${FIELD} font-mono text-xs placeholder:font-sans placeholder:text-sm`} />
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email found" type="email" className={FIELD} />
            <input value={projectTitle} onChange={(e) => setProjectTitle(e.target.value)} placeholder="Project title" className={FIELD} />
            <textarea value={projectDescription} onChange={(e) => setProjectDescription(e.target.value)} placeholder="Project description" className={`${FIELD} min-h-20 sm:col-span-2`} />
            <textarea value={clientReviews} onChange={(e) => setClientReviews(e.target.value)} placeholder="Past client reviews" className={`${FIELD} min-h-20 sm:col-span-2`} />
            <div className="sm:col-span-3">
              <p className="mb-2 text-xs font-semibold text-muted">Approach sent through</p>
              <div className="flex flex-wrap gap-3">
                {(Object.keys(OUTREACH_CHANNEL_LABEL) as OutreachChannel[]).map((channel) => (
                  <label key={channel} className="flex items-center gap-2 text-xs text-muted">
                    <input type="checkbox" checked={channels.includes(channel)} onChange={(e) => setChannels((current) => e.target.checked ? [...current, channel] : current.filter((item) => item !== channel))} />
                    {OUTREACH_CHANNEL_LABEL[channel]}
                  </label>
                ))}
              </div>
            </div>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note" className={FIELD} />
            <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Tags, comma separated" className={`${FIELD} font-mono text-xs placeholder:font-sans placeholder:text-sm`} />
          </div>
        )}
      </form>
    </Card>
  );
}

export function AddConnect() {
  const { me, add, findDuplicate } = useData();
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [tags, setTags] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = isLinkedInUrl(url.trim());
  const duplicate = useMemo(
    () => (valid ? findDuplicate(url.trim(), "profile") : null),
    [findDuplicate, url, valid]
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) {
      setError("That doesn't look like a LinkedIn profile link.");
      return;
    }
    if (duplicate) {
      setError(DUPLICATE_MESSAGE);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await add({
        profile_url: url.trim(),
        upwork_url: "",
        name: name.trim() || nameFromUrl(url.trim()),
        note,
        tags: parseTags(tags),
      });
      setUrl("");
      setName("");
      setNote("");
      setTags("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card as="div" className="p-4 sm:p-5">
      <form onSubmit={submit}>
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <input
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setError(null);
            }}
            placeholder="Paste the LinkedIn profile link"
            aria-label="LinkedIn profile link"
            className={`${FIELD} min-w-0 flex-1 py-3.5 font-mono text-[13px] placeholder:font-sans placeholder:text-sm`}
          />
          <PrimaryButton type="submit" disabled={!valid || Boolean(duplicate) || saving} className="shrink-0 sm:self-center">
            <span aria-hidden>+</span>
            {saving ? "Logging…" : "Log connect"}
          </PrimaryButton>
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (optional)" className={`${FIELD} flex-1`} />
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note" className={`${FIELD} flex-1`} />
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Tags, comma separated" className={`${FIELD} flex-1 font-mono text-xs placeholder:font-sans placeholder:text-sm`} />
        </div>
        {duplicate && <p className="mt-2 text-xs text-rose">{duplicate.owner === me.id ? "You already logged this LinkedIn profile." : `${USER_LABEL[duplicate.owner]} already logged this LinkedIn profile.`}</p>}
        {error && !duplicate && <p className="mt-2 text-xs text-rose">{error}</p>}
      </form>
    </Card>
  );
}

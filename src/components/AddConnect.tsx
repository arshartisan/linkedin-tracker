"use client";

import { useMemo, useRef, useState } from "react";
import { useData } from "./DataProvider";
import { Card, FIELD, PrimaryButton } from "@/components/ui/layout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CompanyOutreachChannels } from "./CompanyOutreachChannels";
import { ClientTypeSelect } from "./ClientTypeSelect";
import { Check, ExternalLink } from "lucide-react";
import { isLinkedInUrl, isUpworkUrl, nameFromUrl, normaliseUrl, parseTags } from "@/lib/linkedin";
import { formatShort, relativeDay } from "@/lib/date";
import { DUPLICATE_MESSAGE } from "@/lib/store";
import {
  OUTREACH_CHANNEL_LABEL,
  type CompanyOutreachChannel,
  type OutreachChannel,
  type ClientType,
  USER_LABEL,
} from "@/lib/types";

export function AddUpwork() {
  const { me, add, findDuplicate } = useData();
  const [upworkUrl, setUpworkUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [name, setName] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [clientReviews, setClientReviews] = useState("");
  const [clientType, setClientType] = useState<ClientType>("unclassified");
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
    setClientType("unclassified");
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
        client_type: clientType,
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

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted">Client labels — select either or both</span>
          <ClientTypeSelect value={clientType} onChange={(value) => { if (value !== "all") setClientType(value); }} />
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

/** LinkedIn caps a connection note at 300 characters. */
const INVITE_NOTE_LIMIT = 300;

/**
 * Assisted manual sending: the tracker never touches LinkedIn. It opens the
 * profile and copies the note, the user clicks Connect themselves, and only
 * "Mark as sent" writes a row - so the daily tally counts real invites only.
 */
export function AddConnect() {
  const { me, add, findDuplicate } = useData();
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [inviteNote, setInviteNote] = useState("");
  const [note, setNote] = useState("");
  const [tags, setTags] = useState("");
  const [opened, setOpened] = useState(false);
  const [copied, setCopied] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trimmedUrl = url.trim();
  const valid = isLinkedInUrl(trimmedUrl);
  const duplicate = useMemo(
    () => (valid ? findDuplicate(trimmedUrl, "profile") : null),
    [findDuplicate, trimmedUrl, valid]
  );
  const derivedName = valid ? nameFromUrl(trimmedUrl) : "";
  const ready = valid && !duplicate;
  const noteTooLong = inviteNote.trim().length > INVITE_NOTE_LIMIT;

  async function openProfile() {
    if (!ready || noteTooLong) return;
    window.open(normaliseUrl(trimmedUrl), "_blank", "noopener,noreferrer");
    setOpened(true);
    if (!inviteNote.trim()) {
      setCopied(null);
      return;
    }
    try {
      await navigator.clipboard.writeText(inviteNote.trim());
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

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
        profile_url: trimmedUrl,
        upwork_url: "",
        name: name.trim() || derivedName,
        note,
        tags: parseTags(tags),
      });
      setUrl("");
      setName("");
      setInviteNote("");
      setNote("");
      setTags("");
      setOpened(false);
      setCopied(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card as="div" className="p-4 sm:p-5">
      <form onSubmit={submit}>
        <input
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setOpened(false);
            setCopied(null);
            setError(null);
          }}
          placeholder="Paste the LinkedIn profile link"
          aria-label="LinkedIn profile link"
          autoComplete="off"
          spellCheck={false}
          className={`${FIELD} w-full py-3.5 font-mono text-[13px] placeholder:font-sans placeholder:text-sm`}
        />
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={derivedName || "Name (optional)"} aria-label="Name" className={`${FIELD} flex-1`} />
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Tracker note" aria-label="Tracker note" className={`${FIELD} flex-1`} />
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Tags, comma separated" aria-label="Tags" className={`${FIELD} flex-1 font-mono text-xs placeholder:font-sans placeholder:text-sm`} />
        </div>
        <label className="mt-2.5 grid gap-1.5 text-xs text-muted">
          <span className="flex justify-between gap-3">
            Invitation note (optional, copied when you open the profile)
            <span className={noteTooLong ? "text-rose" : undefined}>{inviteNote.trim().length}/{INVITE_NOTE_LIMIT}</span>
          </span>
          <textarea value={inviteNote} onChange={(e) => setInviteNote(e.target.value)} rows={2} placeholder="Hi, I came across your work on…" className={FIELD} />
        </label>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button type="button" variant={opened ? "secondary" : "default"} disabled={!ready || noteTooLong} onClick={openProfile}>
            <ExternalLink aria-hidden />
            {opened ? "Open profile again" : "Open & connect"}
          </Button>
          <Button type="submit" variant={opened ? "default" : "secondary"} disabled={!ready || saving}>
            <Check aria-hidden />
            {saving ? "Logging…" : "Mark as sent"}
          </Button>
          <p className="text-xs text-muted sm:ml-1" aria-live="polite">
            {!ready
              ? "Nothing is logged until you mark the invite as sent."
              : !opened
                ? "Opens the profile in a new tab. Click Connect there, then come back."
                : copied
                  ? "Note copied. On LinkedIn choose “Add a note”, paste it, send, then mark as sent."
                  : copied === false
                    ? "Couldn’t copy the note. Copy it manually, then mark as sent."
                    : "Sent the invite on LinkedIn? Mark it as sent."}
          </p>
        </div>
        {duplicate && <p className="mt-2 text-xs text-rose">{duplicate.owner === me.id ? "You already logged this LinkedIn profile." : `${USER_LABEL[duplicate.owner]} already logged this LinkedIn profile.`}</p>}
        {error && !duplicate && <p className="mt-2 text-xs text-rose">{error}</p>}
      </form>
    </Card>
  );
}

export function AddCompany() {
  const { addCompany } = useData();
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [channels, setChannels] = useState<CompanyOutreachChannel[]>([]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setCompanyName("");
    setEmail("");
    setWebsiteUrl("");
    setLinkedinUrl("");
    setChannels([]);
    setNote("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyName.trim()) {
      setError("Add a company name.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await addCompany({
        company_name: companyName,
        email,
        website_url: websiteUrl,
        linkedin_url: linkedinUrl,
        outreach_channels: channels,
        note,
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
        <div className="grid gap-2.5 sm:grid-cols-[1.1fr_1fr_1.2fr_1.2fr_auto]">
          <input
            value={companyName}
            onChange={(e) => {
              setCompanyName(e.target.value);
              setError(null);
            }}
            placeholder="Company name"
            aria-label="Company name"
            className={FIELD}
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
            aria-label="Company emails"
            className={FIELD}
          />
          <input
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
            placeholder="LinkedIn company profile"
            aria-label="LinkedIn company profile"
            className={`${FIELD} font-mono text-xs placeholder:font-sans placeholder:text-sm`}
          />
          <PrimaryButton type="submit" disabled={!companyName.trim() || saving}>
            <span aria-hidden>+</span>
            {saving ? "Logging…" : "Log company"}
          </PrimaryButton>
        </div>

        <div className="mt-3 grid gap-2.5">
          <CompanyOutreachChannels value={channels} onChange={setChannels} />
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note"
            aria-label="Company note"
            className={FIELD}
          />
        </div>
        {error && <p className="mt-2 text-xs text-rose">{error}</p>}
      </form>
    </Card>
  );
}

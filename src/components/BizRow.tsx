"use client";

import { useState } from "react";
import {
  ExternalLinkIcon,
  MoreHorizontalIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import { useBiz } from "./BizProvider";
import { useData } from "./DataProvider";
import { BizStagePicker } from "./BizStagePicker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatShort } from "@/lib/date";
import { parseTags } from "@/lib/linkedin";
import {
  categoryLabel,
  domainOf,
  formatPhone,
  researchLinks,
  toE164,
  waLink,
  type Business,
} from "@/lib/biz";
import {
  MAX_BIZ_FOLLOWUPS,
  bizStagePatch,
  isBizStale,
  nextBizAction,
  type BizAction,
} from "@/lib/biz-pipeline";
import { messageFor, varsFor } from "@/lib/biz-message";

/** "2 days late" reads as pressure; "in 2 days" reads as a plan. */
function timing(action: BizAction): { text: string; late: boolean } {
  if (action.overdue > 1) return { text: `${action.overdue}d late`, late: true };
  if (action.overdue === 1) return { text: "1d late", late: true };
  if (action.overdue === 0) return { text: "due today", late: false };
  if (action.overdue === -1) return { text: "tomorrow", late: false };
  return { text: formatShort(action.dueOn), late: false };
}

const CHIP =
  "inline-flex items-center gap-1 rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-muted transition-colors hover:text-brand";

const FIELD =
  "rounded-lg border border-line-soft bg-ink px-3 py-2 text-sm placeholder:text-muted/60 focus:border-brand focus:outline-none";

export function BizRow({
  business,
  index = 0,
  /** The queue already knows the action; rows elsewhere work it out themselves. */
  action = nextBizAction(business),
  showAction = true,
}: {
  business: Business;
  index?: number;
  action?: BizAction | null;
  showAction?: boolean;
}) {
  const { update, remove, setStage, cityById } = useBiz();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const city = cityById(business.city);
  const due = action && action.overdue >= 0;
  const showCta = showAction && due;
  // Both follow-ups spent and still nothing - the only move left is to close it.
  const exhausted = showAction && !action && isBizStale(business);

  return (
    <li
      className="row-in rounded-xl border border-line-soft bg-surface px-4 py-3.5 transition-colors hover:border-line"
      style={{ animationDelay: `${Math.min(index, 12) * 22}ms` }}
    >
      <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">{business.name || "Unnamed"}</span>
            {business.stage === "contacted" && business.followups > 0 && (
              <span
                className="tabular shrink-0 font-mono text-[10px] text-muted"
                title={`${business.followups} of ${MAX_BIZ_FOLLOWUPS} follow-ups sent`}
              >
                {"•".repeat(business.followups)}
                {"◦".repeat(MAX_BIZ_FOLLOWUPS - business.followups)}
              </span>
            )}
          </div>

          <div className="mt-0.5 font-mono text-xs text-muted">
            {categoryLabel(business.category)} · {city?.name ?? business.city}
          </div>

          {/*
            Only the channels that exist get a chip. A row with nothing but a
            name is the normal state straight off a search result, and padding
            it with four greyed-out placeholders would make the ones that *are*
            filled in harder to spot down a long list.
          */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {business.whatsapp && (
              <a
                href={waLink(business.whatsapp)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md bg-brand-soft px-1.5 py-0.5 font-mono text-[10px] text-brand transition-opacity hover:opacity-80"
              >
                WhatsApp {formatPhone(business.whatsapp)}
              </a>
            )}
            {business.website && (
              <a href={business.website} target="_blank" rel="noopener noreferrer" className={CHIP}>
                {domainOf(business.website) ?? "website"}
              </a>
            )}
            {business.facebook && (
              <a href={business.facebook} target="_blank" rel="noopener noreferrer" className={CHIP}>
                facebook
              </a>
            )}
            {business.maps_url && (
              <a href={business.maps_url} target="_blank" rel="noopener noreferrer" className={CHIP}>
                maps
              </a>
            )}
            {business.phone && !business.whatsapp && (
              <a href={`tel:${business.phone}`} className={CHIP}>
                {business.phone}
              </a>
            )}
            {business.email && (
              <a href={`mailto:${business.email}`} className={CHIP}>
                {business.email}
              </a>
            )}
          </div>

          {!editing && (business.tags.length > 0 || business.note) && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {business.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted"
                >
                  {tag}
                </span>
              ))}
              {business.note && <span className="text-xs text-muted">{business.note}</span>}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <BizStagePicker
            value={business.stage}
            onChange={(stage) => setStage(business, stage)}
          />

          {/* Delete still costs two clicks - the first only arms the menu item. */}
          <DropdownMenu onOpenChange={(open) => !open && setConfirmDelete(false)}>
            <DropdownMenuTrigger
              aria-label="Business actions"
              className="rounded-md p-1.5 text-muted transition-colors outline-none hover:bg-surface-2 hover:text-text data-[state=open]:bg-surface-2 data-[state=open]:text-text"
            >
              <MoreHorizontalIcon className="size-4" aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem className="text-xs" onSelect={() => setEditing((v) => !v)}>
                <PencilIcon />
                {editing ? "Close details" : "Edit details"}
              </DropdownMenuItem>
              {business.website && (
                <DropdownMenuItem asChild className="text-xs">
                  <a href={business.website} target="_blank" rel="noopener noreferrer">
                    <ExternalLinkIcon />
                    Open website
                  </a>
                </DropdownMenuItem>
              )}
              {business.facebook && (
                <DropdownMenuItem asChild className="text-xs">
                  <a href={business.facebook} target="_blank" rel="noopener noreferrer">
                    <ExternalLinkIcon />
                    Open Facebook
                  </a>
                </DropdownMenuItem>
              )}
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
                  remove(business.id);
                }}
              >
                <Trash2Icon />
                {confirmDelete ? "Really delete?" : "Delete"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {showCta && action && action.kind === "research" && (
        <ResearchPanel business={business} action={action} />
      )}

      {showCta && action && action.kind !== "research" && (
        <MessagePanel business={business} action={action} />
      )}

      {exhausted && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line-soft pt-3">
          <span className="text-xs text-muted">
            No reply after {MAX_BIZ_FOLLOWUPS} follow-ups.
          </span>
          <button
            type="button"
            onClick={() => setStage(business, "closed")}
            className="ml-auto rounded-lg bg-surface-2 px-3 py-1.5 text-[11px] font-semibold text-muted transition-colors hover:text-rose"
          >
            Close it out
          </button>
        </div>
      )}

      {editing && (
        <DetailsEditor
          business={business}
          onSave={(patch) => update(business.id, patch)}
          onClose={() => setEditing(false)}
        />
      )}
    </li>
  );
}

/**
 * The research step, which is the one this section exists for: open the three
 * places a small business hides its number, and paste back what you find.
 *
 * The number field is the whole panel. Saving it is what moves the row into the
 * messaging lane, and "No number" is the honest other outcome - some shops have
 * a Maps pin and nothing else.
 */
function ResearchPanel({ business, action }: { business: Business; action: BizAction }) {
  const { update, setStage, cityById } = useBiz();
  const [number, setNumber] = useState(business.whatsapp);
  const [error, setError] = useState<string | null>(null);

  const city = cityById(business.city);
  const links = researchLinks(business.name, city ?? {
    id: business.city,
    name: business.city,
    region: "",
    dial: "",
    sort: 0,
    active: true,
  });
  const dial = city?.dial ?? "";

  async function save() {
    const e164 = toE164(number, dial);
    if (!e164) {
      setError("That isn't enough digits for a phone number.");
      return;
    }
    setError(null);
    // One write, not two: the number and the stage move together, so a failed
    // round trip can't leave a row at `found` with a number already on it. The
    // stage half goes through bizStagePatch so the milestone stamp is the same
    // one every other route to `researched` produces.
    await update(business.id, {
      whatsapp: e164,
      ...bizStagePatch("researched", { ...business, whatsapp: e164 }),
    });
  }

  return (
    <div className="mt-3 border-t border-line-soft pt-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted">{action.label}</span>
        <span
          className={`tabular font-mono text-[10px] uppercase tracking-wide ${
            timing(action).late ? "text-rose" : "text-muted/70"
          }`}
        >
          {timing(action).text}
        </span>
      </div>

      {/* In this order they resolve most of them - site, then page, then a
          plain search for whatever is left. */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {business.website && (
          <a
            href={business.website}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md bg-surface-2 px-2 py-1 text-[11px] text-muted transition-colors hover:text-brand"
          >
            Their website
          </a>
        )}
        <a
          href={business.facebook || links.facebook}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md bg-surface-2 px-2 py-1 text-[11px] text-muted transition-colors hover:text-brand"
        >
          {business.facebook ? "Their Facebook" : "Find on Facebook"}
        </a>
        <a
          href={links.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md bg-surface-2 px-2 py-1 text-[11px] text-muted transition-colors hover:text-brand"
        >
          Search “whatsapp”
        </a>
        <a
          href={links.google}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md bg-surface-2 px-2 py-1 text-[11px] text-muted transition-colors hover:text-brand"
        >
          Search contact
        </a>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <input
          value={number}
          onChange={(e) => {
            setNumber(e.target.value);
            setError(null);
          }}
          placeholder={dial ? `WhatsApp number (local or +${dial}…)` : "WhatsApp number"}
          inputMode="tel"
          aria-label="WhatsApp number"
          className={`${FIELD} min-w-0 flex-1 font-mono text-xs placeholder:font-sans placeholder:text-sm`}
        />
        <button
          type="button"
          onClick={save}
          disabled={!number.trim()}
          className="rounded-lg bg-brand px-3 py-2 text-[11px] font-semibold text-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-muted"
        >
          {action.cta}
        </button>
        <button
          type="button"
          onClick={() => setStage(business, "unreachable")}
          className="rounded-lg px-2.5 py-2 text-[11px] text-muted transition-colors hover:bg-surface-2 hover:text-rose"
        >
          No number
        </button>
      </div>

      {error && <p className="mt-1.5 text-xs text-rose">{error}</p>}
      {!error && number.trim() && toE164(number, dial) && (
        <p className="tabular mt-1.5 font-mono text-[10px] text-muted/70">
          Saves as {toE164(number, dial)}
          {!dial && " - add a dialling code to this city if that looks wrong."}
        </p>
      )}
    </div>
  );
}

/**
 * The messaging steps. The template is filled in and dropped into a textarea
 * rather than fired straight at wa.me: the copy needs a human read before it
 * goes to a real shop owner, and the one thing worse than no outreach is
 * outreach that obviously came out of a machine.
 */
function MessagePanel({ business, action }: { business: Business; action: BizAction }) {
  const { setStage, complete, cityById } = useBiz();
  const { me } = useData();
  const city = cityById(business.city);
  const kind = action.kind as "pitch" | "followup" | "qualify";
  const [text, setText] = useState(() =>
    messageFor(kind, business, varsFor(business, city, me.name))
  );

  const t = timing(action);

  return (
    <div className="mt-3 border-t border-line-soft pt-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted">{action.label}</span>
        <span
          className={`tabular font-mono text-[10px] uppercase tracking-wide ${
            t.late ? "text-rose" : "text-muted/70"
          }`}
        >
          {t.text}
        </span>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        aria-label="WhatsApp message"
        className={`${FIELD} mt-2 w-full resize-y text-xs leading-relaxed`}
      />

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {business.whatsapp ? (
          <a
            href={waLink(business.whatsapp, text)}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-surface-2 px-3 py-1.5 text-[11px] font-semibold text-brand transition-colors hover:bg-surface-3"
          >
            Open WhatsApp
          </a>
        ) : (
          <span className="text-[11px] text-rose">
            No number on this one - add it from the stage menu.
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          {action.kind === "qualify" && (
            <button
              type="button"
              onClick={() => setStage(business, "closed")}
              className="rounded-lg px-2.5 py-1.5 text-[11px] text-muted transition-colors hover:bg-surface-2 hover:text-rose"
            >
              Not a fit
            </button>
          )}
          <button
            type="button"
            onClick={() => complete(business, action)}
            className="rounded-lg bg-brand px-3 py-1.5 text-[11px] font-semibold text-ink transition-opacity hover:opacity-90"
          >
            {action.cta}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Everything you might have dug up, in the order you tend to find it. Saved on
 * blur, like the note editor next door, so there is no button to forget.
 */
function DetailsEditor({
  business,
  onSave,
  onClose,
}: {
  business: Business;
  onSave: (patch: Partial<Business>) => Promise<void>;
  onClose: () => void;
}) {
  const { cityById } = useBiz();
  const dial = cityById(business.city)?.dial ?? "";
  const [form, setForm] = useState({
    name: business.name,
    website: business.website,
    facebook: business.facebook,
    maps_url: business.maps_url,
    whatsapp: business.whatsapp,
    phone: business.phone,
    email: business.email,
    address: business.address,
    note: business.note,
    tags: business.tags.join(", "),
  });

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function save() {
    const tags = parseTags(form.tags);
    // The number goes through toE164 here too, so a hand-edit can't put a shape
    // into the column that wa.me will refuse to open.
    const whatsapp = form.whatsapp.trim() ? toE164(form.whatsapp, dial) ?? "" : "";
    const patch = {
      name: form.name.trim(),
      website: form.website.trim(),
      facebook: form.facebook.trim(),
      maps_url: form.maps_url.trim(),
      whatsapp,
      phone: form.phone.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
      note: form.note.trim(),
      tags,
    };
    const changed =
      Object.entries(patch).some(([key, value]) =>
        key === "tags"
          ? (value as string[]).join(",") !== business.tags.join(",")
          : value !== business[key as keyof Business]
      );
    if (changed) await onSave(patch);
  }

  return (
    <div className="mt-3 grid gap-2 border-t border-line-soft pt-3 sm:grid-cols-2">
      <input value={form.name} onChange={set("name")} onBlur={save} placeholder="Name" className={FIELD} />
      <input value={form.whatsapp} onChange={set("whatsapp")} onBlur={save} placeholder="WhatsApp number" inputMode="tel" className={`${FIELD} font-mono text-xs placeholder:font-sans placeholder:text-sm`} />
      <input value={form.website} onChange={set("website")} onBlur={save} placeholder="Website" className={FIELD} />
      <input value={form.facebook} onChange={set("facebook")} onBlur={save} placeholder="Facebook page" className={FIELD} />
      <input value={form.phone} onChange={set("phone")} onBlur={save} placeholder="Phone" className={FIELD} />
      <input value={form.email} onChange={set("email")} onBlur={save} placeholder="Email" className={FIELD} />
      <input value={form.maps_url} onChange={set("maps_url")} onBlur={save} placeholder="Maps link" className={FIELD} />
      <input value={form.address} onChange={set("address")} onBlur={save} placeholder="Address" className={FIELD} />
      <input value={form.note} onChange={set("note")} onBlur={save} placeholder="Note" className={`${FIELD} sm:col-span-2`} />
      <input value={form.tags} onChange={set("tags")} onBlur={save} placeholder="Tags, comma separated" className={`${FIELD} font-mono text-xs placeholder:font-sans placeholder:text-sm sm:col-span-2`} />
      <button
        type="button"
        onClick={onClose}
        className="justify-self-start text-xs text-muted transition-colors hover:text-text sm:col-span-2"
      >
        Done
      </button>
    </div>
  );
}

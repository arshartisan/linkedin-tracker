import { cn } from "@/lib/utils";

/**
 * The layout language, as parts.
 *
 * Every screen is built from the same four things: a page, cards lifted off it,
 * wells recessed into those cards, and pill-shaped controls. Keeping them here
 * rather than as repeated utility strings is what stops the fifth screen from
 * quietly inventing a sixth radius.
 */

// ---------------------------------------------------------------------------
// Page scaffolding
// ---------------------------------------------------------------------------

export function Page({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-7 sm:py-8", className)}>
      {children}
    </div>
  );
}

/**
 * Title on the left, controls on the right, a rule of whitespace under it.
 * `lead` is the one sentence explaining what the screen is for - most screens
 * want one, and the ones that don't pass nothing rather than inventing a
 * different header.
 */
export function PageHeader({
  title,
  lead,
  actions,
  children,
}: {
  title: string;
  lead?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <header className="mb-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-[28px] leading-tight font-extrabold sm:text-[32px]">
            {title}
          </h1>
          {lead && <p className="mt-1 text-sm text-muted">{lead}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </header>
  );
}

// ---------------------------------------------------------------------------
// Surfaces
// ---------------------------------------------------------------------------

/** A panel lifted off the page. The outermost box on any screen. */
export function Card({
  children,
  className,
  as: Tag = "section",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "section" | "div" | "article" | "li";
}) {
  return <Tag className={cn("card", className)}>{children}</Tag>;
}

/**
 * A block recessed *into* a card. Darker than the card it sits in, which is
 * what makes the nesting read as depth rather than as another tile.
 */
export function Well({
  children,
  className,
  interactive = false,
  as: Tag = "div",
  style,
}: {
  children: React.ReactNode;
  className?: string;
  /** Adds the hover lift. For wells that are clickable or carry a control. */
  interactive?: boolean;
  as?: "div" | "li" | "section";
  /** For staggered row-in delays, which have to be per-index. */
  style?: React.CSSProperties;
}) {
  return (
    <Tag className={cn("well", interactive && "well-interactive", className)} style={style}>
      {children}
    </Tag>
  );
}

// ---------------------------------------------------------------------------
// Type
// ---------------------------------------------------------------------------

/** The small uppercase caption. Section headings, stat labels, group headers. */
export function Label({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("label", className)}>{children}</div>;
}

/**
 * A section heading above a list, with its count beside it. The count is part
 * of the heading rather than a badge: it is describing the thing below, not
 * demanding attention on its own.
 */
export function SectionHeading({
  children,
  count,
  hint,
  className,
}: {
  children: React.ReactNode;
  count?: number;
  hint?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-3", className)}>
      <h2 className="label flex items-baseline gap-2">
        {children}
        {count !== undefined && count > 0 && (
          <span className="tabular text-muted/55">{count}</span>
        )}
      </h2>
      {hint && <p className="mt-1 text-xs text-muted/75">{hint}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Figures
// ---------------------------------------------------------------------------

/**
 * A figure with its caption *underneath* it, the way the wallet balances read.
 * Label-above would put the small text where the eye lands first, which is
 * backwards for a number that is the point of the block.
 */
export function Stat({
  value,
  caption,
  tone = "text",
  size = "md",
  className,
}: {
  value: React.ReactNode;
  caption: React.ReactNode;
  tone?: "text" | "brand" | "dim" | "rose";
  size?: "md" | "lg";
  className?: string;
}) {
  const tones = {
    text: "text-text",
    brand: "text-brand",
    dim: "text-brand-dim",
    rose: "text-rose",
  };
  return (
    <div className={cn("min-w-0", className)}>
      <div
        className={cn(
          "tabular font-display leading-none font-extrabold",
          size === "lg" ? "text-[32px]" : "text-2xl",
          tones[tone]
        )}
      >
        {value}
      </div>
      <div className="mt-1.5 truncate text-xs text-muted">{caption}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

const PILL =
  "inline-flex items-center justify-center gap-1.5 rounded-full font-semibold transition-all disabled:cursor-not-allowed";

/** The one solid call to action. Lime, because that is what the app's yes looks like. */
export function PrimaryButton({
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        PILL,
        "bg-brand px-5 py-2.5 text-sm text-ink hover:opacity-90 disabled:bg-surface-2 disabled:text-muted disabled:opacity-100",
        className
      )}
    />
  );
}

/**
 * A pill-track segmented control. The selected segment is a *raised* pill in
 * the card tone, so the control reads the way a physical switch does - the
 * chosen one sits proud of the track rather than merely being coloured in.
 */
export function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
  className,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("inline-flex shrink-0 rounded-full bg-well p-1", className)}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "tabular rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-all",
              selected
                ? "bg-surface-2 text-text shadow-raised"
                : "text-muted hover:text-text"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * A quiet metadata pill - "42 Transactions", "Updated 2 hours ago". Always
 * secondary information; anything that needs reading first should not be one.
 */
export function Chip({
  children,
  icon,
  tone = "muted",
  className,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  tone?: "muted" | "brand" | "rose";
  className?: string;
}) {
  const tones = {
    muted: "bg-surface-2 text-muted",
    brand: "bg-brand-soft text-brand",
    rose: "bg-rose-soft text-rose",
  };
  return (
    <span
      className={cn(
        "inline-flex min-w-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
        tones[tone],
        className
      )}
    >
      {icon}
      <span className="truncate">{children}</span>
    </span>
  );
}

/** The shared input shape. Recessed, like everything else inside a card. */
export const FIELD =
  "w-full rounded-control border border-line-soft bg-well px-3.5 py-2.5 text-sm text-text placeholder:text-muted/60 focus:border-brand-edge focus:outline-none transition-colors";

// ---------------------------------------------------------------------------
// States
// ---------------------------------------------------------------------------

export function EmptyState({
  title,
  children,
  className,
}: {
  title: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-card border border-dashed border-line px-6 py-14 text-center",
        className
      )}
    >
      <p className="font-display text-lg font-bold">{title}</p>
      {children && (
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted">{children}</p>
      )}
    </div>
  );
}

/**
 * The delta pill - a percentage with the direction drawn into it. Green up,
 * rose down, matching the way the numbers on a finance dashboard read at a
 * glance without anyone parsing a sign.
 */
export function Delta({
  change,
  className,
}: {
  /** A ratio: 0.05 renders as +5%. Null renders nothing. */
  change: number | null;
  className?: string;
}) {
  if (change === null) return null;
  const up = change >= 0;
  const percent = Math.abs(Math.round(change * 100));
  return (
    <span
      className={cn(
        "tabular inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold",
        up ? "bg-brand-soft text-brand" : "bg-rose-soft text-rose",
        className
      )}
    >
      <svg
        viewBox="0 0 24 24"
        className="size-3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        {up ? <path d="M4 17 11 10l3 3 6-6M15 7h5v5" /> : <path d="M4 7l7 7 3-3 6 6M15 17h5v-5" />}
      </svg>
      {percent}%
      <span className="sr-only">{up ? "up" : "down"} on the previous period</span>
    </span>
  );
}

"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { ClientScore as Score } from "@/lib/engine";

const usd = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : n >= 10_000 ? `$${Math.round(n / 1000)}K`
    : n >= 1000 ? `$${(n / 1000).toFixed(1)}K` : `$${Math.round(n)}`;

const TIER_STYLE: Record<string, string> = {
  A: "border-brand-edge bg-brand-soft text-brand-tint",
  B: "border-brand-edge/60 bg-brand-soft/50 text-brand-tint",
  C: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  D: "border-[#4c2324] bg-rose-soft text-[#febfc6]",
  New: "border-line bg-well text-muted",
};

/** Small tier badge for lists: "A 78". */
export function TierBadge({ tier, score, className }: { tier: string; score: number | string; className?: string }) {
  return (
    <span title={`Client score ${score}/100, tier ${tier}`}
      className={cn("inline-flex shrink-0 items-center gap-1 rounded border px-1.5 text-[10px] font-medium tabular-nums", TIER_STYLE[tier] ?? TIER_STYLE.New, className)}>
      {tier}<span className="opacity-75">{score}</span>
    </span>
  );
}

/** Groups the spend timeline into bars: months when the history is short, years when it is long. */
function buckets(timeline: Score["timeline"]): { label: string; usd: number; jobs: number }[] {
  if (!timeline.length) return [];
  const [first, last] = [timeline[0].month, timeline[timeline.length - 1].month];
  const span = (Number(last.slice(0, 4)) - Number(first.slice(0, 4))) * 12 + Number(last.slice(5)) - Number(first.slice(5)) + 1;
  const byYear = span > 24;
  const out = new Map<string, { label: string; usd: number; jobs: number }>();
  // Fill every period between first and last so gaps in spending show as gaps.
  let [y, m] = [Number(first.slice(0, 4)), Number(first.slice(5))];
  for (let i = 0; i < span; i++) {
    const key = byYear ? String(y) : `${y}-${String(m).padStart(2, "0")}`;
    if (!out.has(key)) {
      out.set(key, { label: byYear ? key : new Date(y, m - 1).toLocaleDateString(undefined, { month: "short", year: "numeric" }), usd: 0, jobs: 0 });
    }
    if (++m > 12) { m = 1; y++; }
  }
  for (const t of timeline) {
    const b = out.get(byYear ? t.month.slice(0, 4) : t.month);
    if (b) { b.usd += t.usd; b.jobs += t.jobs; }
  }
  return [...out.values()];
}

function SpendChart({ score }: { score: Score }) {
  const [hover, setHover] = useState<number | null>(null);
  const bars = buckets(score.timeline);
  if (!bars.length) {
    return <p className="text-xs text-muted">The job history on this page doesn&apos;t show amounts with dates, so there is no spending chart.</p>;
  }
  const max = Math.max(...bars.map((b) => b.usd));
  const H = 96;
  const shown = hover !== null ? bars[hover] : null;
  return (
    <figure className="m-0">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-3 text-xs">
        <span className="text-text">Spending in the visible job history</span>
        <span className="text-muted tabular-nums" aria-live="polite">
          {shown ? `${shown.label}: ${usd(shown.usd)} · ${shown.jobs} job${shown.jobs === 1 ? "" : "s"}`
            : `${usd(score.history_usd)} across ${score.timeline.reduce((n, t) => n + t.jobs, 0)} dated jobs`}
        </span>
      </figcaption>
      <div className="mt-2 flex gap-2">
        <div className="flex flex-col justify-between text-right text-[10px] tabular-nums text-muted" style={{ height: H }}>
          <span>{usd(max)}</span><span>$0</span>
        </div>
        <div className="min-w-0 flex-1">
          <div role="img" aria-label={`Bar chart of spending per period, highest ${usd(max)}`}
            className="flex items-end gap-[2px] border-b border-line" style={{ height: H }} onMouseLeave={() => setHover(null)}>
            {bars.map((b, index) => (
              <div key={b.label} className="group flex h-full min-w-0 flex-1 items-end" onMouseEnter={() => setHover(index)}>
                <div className={cn("w-full rounded-t-[4px] transition-colors", hover === index ? "bg-brand" : "bg-brand-dim",
                  bars.length <= 12 && "mx-auto max-w-8")}
                  style={{ height: b.usd ? Math.max(2, (b.usd / max) * H) : 0 }} />
              </div>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-muted">
            <span>{bars[0].label}</span>{bars.length > 1 && <span>{bars[bars.length - 1].label}</span>}
          </div>
        </div>
      </div>
      {score.metrics.spent_usd ? (
        <p className="mt-1.5 text-[11px] text-muted">
          Upwork reports {usd(score.metrics.spent_usd)} spent in total. The chart only covers jobs whose amount and date are visible on the page.
        </p>
      ) : null}
    </figure>
  );
}

/** The client's potential: score, why, the rate they pay against yours, and spending over time. */
export function ClientScore({ score }: { score: Score }) {
  const { rate_paid: paid, target_rate: target } = score.metrics;
  const scale = Math.max(paid ?? 0, target) * 1.15;
  return (
    <section aria-label="Client potential" className="well flex flex-col gap-4 rounded-card border border-line-soft p-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="flex items-baseline gap-1">
          <span className="text-[34px] font-semibold leading-none tabular-nums">{score.score}</span>
          <span className="text-xs text-muted">/ 100</span>
        </p>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-sm">
            <span className={cn("rounded border px-1.5 py-px text-[11px] font-medium", TIER_STYLE[score.tier] ?? TIER_STYLE.New)}>
              {score.tier === "New" ? "New" : `Tier ${score.tier}`}
            </span>
            {score.verdict}
          </p>
          {(score.strengths.length > 0 || score.weaknesses.length > 0) && (
            <ul className="mt-1 text-xs text-muted">
              {score.strengths.map((t) => <li key={t}><span aria-hidden className="text-brand">+</span> {t}</li>)}
              {score.weaknesses.map((t) => <li key={t}><span aria-hidden className="text-rose">−</span> {t}</li>)}
            </ul>
          )}
        </div>
      </div>

      <table className="w-full border-separate border-spacing-y-1 text-xs">
        <caption className="sr-only">How the score adds up</caption>
        <tbody>
          {score.parts.map((p) => (
            <tr key={p.label}>
              <th scope="row" className="w-[1%] whitespace-nowrap pr-3 text-left font-normal text-muted">{p.label}</th>
              <td className="w-[28%] min-w-16">
                <div className="h-1.5 overflow-hidden rounded-full bg-line-soft">
                  <div className="h-full rounded-full bg-brand-dim" style={{ width: `${(p.points / p.max) * 100}%` }} />
                </div>
              </td>
              <td className="w-[1%] whitespace-nowrap px-2 text-right tabular-nums">{p.points}<span className="text-muted">/{p.max}</span></td>
              <td className="text-muted">{p.note}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {paid ? (
        <div className="text-xs">
          <p className="flex justify-between"><span className="text-text">Hourly rate they pay</span>
            <span className="tabular-nums text-muted">${paid.toFixed(2)}/h paid · ${target}/h your target</span></p>
          <div className="relative mt-2 h-2 rounded-full bg-line-soft" role="img"
            aria-label={`They pay ${paid.toFixed(2)} dollars an hour on average; your target is ${target}`}>
            <div className="h-full rounded-full bg-brand-dim" style={{ width: `${(paid / scale) * 100}%` }} />
            <div className="absolute -top-1 h-4 w-0.5 bg-text" style={{ left: `${(target / scale) * 100}%` }} />
          </div>
          <p className="mt-1 text-[11px] text-muted">The white mark is your target rate.</p>
        </div>
      ) : null}

      <SpendChart score={score} />
    </section>
  );
}

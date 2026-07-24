"use client";

import { useId, useState } from "react";
import { monotonePath, project } from "@/lib/chart";
import { formatShort } from "@/lib/date";

export type TrendPoint = { day: string; count: number };

/**
 * The chart draws in a fixed 0–100 square and is stretched to fill its box by
 * `preserveAspectRatio="none"`. That keeps one coordinate system for both the
 * SVG geometry and the HTML overlay — a point at x=40 is at `left: 40%` — and
 * `vector-effect="non-scaling-stroke"` stops the stretch from smearing the
 * stroke or the baseline's dashes.
 */
const VIEW = 100;

export function TrendChart({
  points,
  goal,
  className = "",
}: {
  points: TrendPoint[];
  goal: number;
  className?: string;
}) {
  const gradientId = useId();
  const [hover, setHover] = useState<number | null>(null);

  const { xs, ys, goalY } = project(
    points.map((p) => p.count),
    goal,
    VIEW
  );
  const line = monotonePath(ys, xs);

  if (points.length < 2) {
    return (
      <div
        className={`flex h-52 items-center justify-center rounded-xl border border-dashed border-line ${className}`}
      >
        <p className="text-sm text-muted">Not enough days logged yet.</p>
      </div>
    );
  }

  const area = `${line} L ${xs[xs.length - 1]} ${VIEW} L ${xs[0]} ${VIEW} Z`;
  const last = points.length - 1;
  const active = hover ?? last;
  const activePoint = points[active];

  function moveTo(clientX: number, element: HTMLElement) {
    const box = element.getBoundingClientRect();
    if (box.width === 0) return;
    const ratio = (clientX - box.left) / box.width;
    const index = Math.round(ratio * (points.length - 1));
    setHover(Math.min(Math.max(index, 0), points.length - 1));
  }

  const total = points.reduce((sum, p) => sum + p.count, 0);

  return (
    <div className={className}>
      <div
        className="relative h-52 w-full touch-none sm:h-60"
        role="img"
        aria-label={`Connects per day over the last ${points.length} days, ${total} in total, against a daily target of ${goal}.`}
        tabIndex={0}
        onPointerMove={(e) => moveTo(e.clientX, e.currentTarget)}
        onPointerLeave={() => setHover(null)}
        onBlur={() => setHover(null)}
        onKeyDown={(e) => {
          if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
          e.preventDefault();
          const step = e.key === "ArrowLeft" ? -1 : 1;
          setHover((current) =>
            Math.min(Math.max((current ?? last) + step, 0), last)
          );
        }}
      >
        <svg
          viewBox={`0 0 ${VIEW} ${VIEW}`}
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full overflow-visible"
          aria-hidden
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.30" />
              <stop offset="55%" stopColor="var(--brand)" stopOpacity="0.08" />
              <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
            </linearGradient>
          </defs>

          <path d={area} fill={`url(#${gradientId})`} className="fade-in" />

          {/* The target, as a line you can be above or below at a glance. */}
          <line
            x1="0"
            x2={VIEW}
            y1={goalY}
            y2={goalY}
            stroke="var(--line)"
            strokeWidth="1"
            strokeDasharray="3 4"
            vectorEffect="non-scaling-stroke"
          />

          {hover !== null && (
            <line
              x1={xs[hover]}
              x2={xs[hover]}
              y1="0"
              y2={VIEW}
              stroke="var(--brand-edge)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          )}

          <path
            d={line}
            fill="none"
            stroke="var(--brand)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            pathLength={1}
            className="draw-line"
          />
        </svg>

        {/*
          The dots ride on top as HTML. Inside the SVG they would be stretched
          into ellipses by `preserveAspectRatio="none"`, and the readout would
          be stuck rendering text at the same distortion.
        */}
        <span
          className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand ring-4 ring-brand/15 transition-[left,top] duration-150"
          style={{
            left: `${xs[active]}%`,
            top: `${ys[active]}%`,
            boxShadow: "var(--shadow-brand)",
          }}
        />

        <div
          className="pointer-events-none absolute -translate-y-full pb-3 transition-[left] duration-150"
          style={{
            left: `${xs[active]}%`,
            top: `${ys[active]}%`,
            // Near the ends the card would hang off the panel, so it stops
            // being centred and tucks back inside instead.
            transform: `translate(${
              xs[active] < 15 ? "0%" : xs[active] > 85 ? "-100%" : "-50%"
            }, -100%)`,
          }}
        >
          <div className="rounded-lg border border-line bg-surface-3 px-2.5 py-1.5 shadow-[var(--shadow-float)]">
            <div className="tabular font-mono text-[10px] whitespace-nowrap text-muted">
              {formatShort(activePoint.day)}
            </div>
            <div className="tabular font-display text-sm font-bold whitespace-nowrap">
              <span
                className={
                  activePoint.count >= goal ? "text-brand" : "text-text"
                }
              >
                {activePoint.count}
              </span>
              <span className="font-mono text-[10px] font-normal text-muted">
                {" "}
                / {goal}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/*
        Four evenly spaced dates — a label per day would be an unreadable comb.
        Deduplicated because on a very short range the quarter marks collide,
        and the same day twice is both a wrong axis and a duplicate key.
      */}
      <div className="mt-2 flex justify-between font-mono text-[10px] text-muted">
        {[...new Set([0, Math.round(last / 3), Math.round((last * 2) / 3), last])].map(
          (i) => (
            <span key={i}>{formatShort(points[i].day)}</span>
          )
        )}
      </div>
    </div>
  );
}

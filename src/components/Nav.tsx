"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useData } from "./DataProvider";
import { dayKey } from "@/lib/date";

const LINKS = [
  { href: "/", label: "Today" },
  { href: "/queue", label: "Queue" },
  { href: "/leads", label: "Leads" },
  { href: "/history", label: "History" },
  { href: "/stats", label: "Stats" },
] as const;

type Label = (typeof LINKS)[number]["label"];

function Icon({ name, className }: { name: Label; className?: string }) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (name) {
    case "Today":
      return (
        <svg {...common}>
          <path d="M6 4v16M12 4v16M18 4v16" />
        </svg>
      );
    case "Queue":
      return (
        <svg {...common}>
          <path d="M4 7h11M4 12h11M4 17h7" />
          <path d="m16 16 2 2 4-4" />
        </svg>
      );
    case "Leads":
      return (
        <svg {...common}>
          <path d="M12 3.5 14.4 9l5.6.5-4.3 3.9 1.3 5.6L12 16l-5 3 1.3-5.6L4 9.5 9.6 9Z" />
        </svg>
      );
    case "History":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.6-3.6" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="M4 19V9M10 19V5M16 19v-6M22 19H2" />
        </svg>
      );
  }
}

export function Nav() {
  const pathname = usePathname();
  const { connects, queue, goal, loading } = useData();
  const today = dayKey();
  const sentToday = connects.filter((c) => c.sent_on === today).length;
  const hit = sentToday >= goal;

  // Only the queue carries a count — a badge on everything is a badge on nothing.
  const badge = (label: Label) =>
    label === "Queue" && queue.due.length > 0 ? queue.due.length : null;

  return (
    <>
      {/* Desktop rail */}
      <nav className="hidden w-56 shrink-0 flex-col border-r border-line bg-surface/60 px-4 py-7 md:flex">
        <Link href="/" className="mb-9 block px-2">
          <span className="font-display text-2xl font-extrabold tracking-tight">
            Reach
          </span>
          <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
            Outreach pipeline
          </span>
        </Link>

        <ul className="flex flex-col gap-1">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            const count = badge(link.label);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                    active
                      ? "bg-surface-2 text-text"
                      : "text-muted hover:bg-surface-2/60 hover:text-text"
                  }`}
                >
                  <Icon name={link.label} className="h-[18px] w-[18px]" />
                  {link.label}
                  {count !== null && (
                    <span className="tabular ml-auto rounded-full bg-amber px-1.5 py-0.5 font-mono text-[10px] font-bold text-ink">
                      {count}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-auto rounded-xl border border-line-soft bg-surface-2/50 px-3.5 py-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
            Today
          </div>
          <div className="tabular mt-1.5 flex items-baseline gap-1.5">
            <span
              className={`font-display text-2xl font-bold ${
                hit ? "text-teal" : "text-text"
              }`}
            >
              {loading ? "—" : sentToday}
            </span>
            <span className="font-mono text-xs text-muted">/ {goal}</span>
          </div>
        </div>
      </nav>

      {/* Mobile tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-ink/95 backdrop-blur md:hidden">
        {LINKS.map((link) => {
          const active = pathname === link.href;
          const count = badge(link.label);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={`relative flex flex-1 flex-col items-center gap-1 py-3 text-[10px] ${
                active ? "text-amber" : "text-muted"
              }`}
            >
              <Icon name={link.label} className="h-5 w-5" />
              {link.label}
              {count !== null && (
                <span className="tabular absolute right-[22%] top-1.5 min-w-[15px] rounded-full bg-amber px-1 text-center font-mono text-[9px] font-bold leading-[15px] text-ink">
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

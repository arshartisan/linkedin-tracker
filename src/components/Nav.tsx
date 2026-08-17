"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useData } from "./DataProvider";
import { useBiz } from "./BizProvider";
import { LogoLockup, LogoMark } from "./Logo";
import { SignOutButton } from "./SignOutButton";
import { dayKey } from "@/lib/date";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";

/*
  Two pipelines, two groups. LinkedIn is one-to-one outreach to people; Local is
  a sweep of businesses in a handful of cities. They share nothing but the
  person doing them, which is why they are separate lists rather than one list
  with a filter on top - and why Team, which counts both, sits under both.
*/
type IconName =
  | "today"
  | "history"
  | "queue"
  | "leads"
  | "grid"
  | "list"
  | "stats"
  | "swap";

type NavLink = { href: string; label: string; icon: IconName };

const LINKEDIN: NavLink[] = [
  { href: "/", label: "Today", icon: "today" },
  { href: "/history", label: "History", icon: "history" },
  { href: "/queue", label: "Queue", icon: "queue" },
  { href: "/leads", label: "Leads", icon: "leads" },
];

const LOCAL: NavLink[] = [
  { href: "/local", label: "Prospect", icon: "grid" },
  { href: "/local/queue", label: "Queue", icon: "queue" },
  { href: "/local/pipeline", label: "Pipeline", icon: "list" },
  { href: "/local/leads", label: "Leads", icon: "leads" },
];

const TEAM: NavLink = { href: "/stats", label: "Team", icon: "stats" };

function Icon({ name, className }: { name: IconName; className?: string }) {
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
    case "today":
      return (
        <svg {...common}>
          <path d="M6 4v16M12 4v16M18 4v16" />
        </svg>
      );
    case "queue":
      return (
        <svg {...common}>
          <path d="M4 7h11M4 12h11M4 17h7" />
          <path d="m16 16 2 2 4-4" />
        </svg>
      );
    case "leads":
      return (
        <svg {...common}>
          <path d="M12 3.5 14.4 9l5.6.5-4.3 3.9 1.3 5.6L12 16l-5 3 1.3-5.6L4 9.5 9.6 9Z" />
        </svg>
      );
    case "history":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.6-3.6" />
        </svg>
      );
    // The sweep grid, drawn as one: cells to fill in.
    case "grid":
      return (
        <svg {...common}>
          <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
          <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
          <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
          <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
        </svg>
      );
    case "list":
      return (
        <svg {...common}>
          <path d="M9 6h11M9 12h11M9 18h11" />
          <circle cx="4.5" cy="6" r="1" />
          <circle cx="4.5" cy="12" r="1" />
          <circle cx="4.5" cy="18" r="1" />
        </svg>
      );
    case "swap":
      return (
        <svg {...common}>
          <path d="M4 8h13m0 0-3.5-3.5M17 8l-3.5 3.5" />
          <path d="M20 16H7m0 0 3.5-3.5M7 16l3.5 3.5" />
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
  const { me, mine, queue, goal, loading } = useData();
  const { queue: bizQueue } = useBiz();
  const today = dayKey();
  const sentToday = mine.filter((c) => c.sent_on === today).length;
  const hit = sentToday >= goal;

  const inLocal = pathname.startsWith("/local");

  /*
    Only the two queues carry a count - a badge on everything is a badge on
    nothing. On the LinkedIn side only the openers count: accepts waiting on a
    first message are the work that goes cold, and follow-ups can wait a day.
    On the Local side the same logic makes it research plus anything due, since
    an un-researched business is the one nobody has started.
  */
  const pitches = queue.due.filter((d) => d.action.kind === "pitch").length;
  const localToDo = bizQueue.research.length + bizQueue.due.length;

  function badge(link: NavLink): number | null {
    if (link.href === "/queue") return pitches > 0 ? pitches : null;
    if (link.href === "/local/queue") return localToDo > 0 ? localToDo : null;
    return null;
  }

  const menu = (links: NavLink[]) => (
    <SidebarMenu>
      {links.map((link) => {
        const active = pathname === link.href;
        const count = badge(link);
        return (
          <SidebarMenuItem key={link.href}>
            <SidebarMenuButton
              asChild
              isActive={active}
              tooltip={link.label}
              /*
                The active row is the one place lime appears in the rail, and it
                gets a clipped bar on the leading edge - which survives the
                collapse to icons, where the label that would otherwise carry
                the state is gone.
              */
              className="relative h-10 gap-3 px-3 text-muted transition-colors hover:bg-white/5 hover:text-text data-[active=true]:bg-white/8 data-[active=true]:text-brand data-[active=true]:shadow-[inset_0_1px_0_0_rgb(255_255_255/0.07)] data-[active=true]:before:absolute data-[active=true]:before:top-1/2 data-[active=true]:before:left-0 data-[active=true]:before:h-5 data-[active=true]:before:w-[3px] data-[active=true]:before:-translate-y-1/2 data-[active=true]:before:rounded-r-full data-[active=true]:before:bg-brand"
            >
              <Link href={link.href} aria-current={active ? "page" : undefined}>
                <Icon name={link.icon} />
                <span>{link.label}</span>
              </Link>
            </SidebarMenuButton>
            {count !== null && (
              <SidebarMenuBadge className="tabular rounded-full bg-brand px-1.5 font-mono text-[10px] font-bold text-ink peer-data-[size=default]/menu-button:top-2.5 peer-data-[active=true]/menu-button:text-ink peer-hover/menu-button:text-ink">
                {count}
              </SidebarMenuBadge>
            )}
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );

  /*
    Mobile carries one section at a time. Nine tabs across a phone would be
    unreadable, so the bar shows whichever section you are in and ends with a
    switch to the other - the two are worked in separate sittings anyway.
  */
  const mobileLinks: NavLink[] = inLocal ? LOCAL : [...LINKEDIN, TEAM];
  const swap: NavLink = inLocal
    ? { href: "/", label: "LinkedIn", icon: "swap" }
    : { href: "/local", label: "Local", icon: "swap" };

  return (
    <>
      {/*
        Desktop rail - fixed, so the list scrolls under it instead of with it.
        The panel itself is glass: a translucent surface over the page, blurred
        and slightly saturated so the list scrolling beneath reads as movement
        rather than detail. shadcn paints `bg-sidebar` on its inner element, so
        the tint is applied through it; the inset highlight is the lit edge
        that keeps the rail from dissolving into the ink beside it.
      */}
      <Sidebar
        collapsible="icon"
        className="border-line **:data-[sidebar=sidebar]:bg-surface/55 **:data-[sidebar=sidebar]:shadow-[inset_-1px_0_0_0_rgb(255_255_255/0.05),inset_1px_0_0_0_rgb(255_255_255/0.03)] **:data-[sidebar=sidebar]:backdrop-blur-2xl **:data-[sidebar=sidebar]:backdrop-saturate-150"
      >
        {/*
          Collapsed to icons the lockup has no room to sit beside the trigger,
          so the header turns into a column: mark on top, trigger under it.
        */}
        <SidebarHeader className="px-2 py-5 group-data-[collapsible=icon]:px-0">
          <div className="flex items-center justify-between gap-2 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-3">
            <Link href="/" className="flex min-w-0 flex-col gap-1.5 px-1 items-start">
              {/* The lockup carries the wordmark; collapsed, only the plate fits. */}
              <LogoLockup className="h-8 w-auto group-data-[collapsible=icon]:hidden" />
              <LogoMark className="hidden size-8 shrink-0 rounded-[7px] group-data-[collapsible=icon]:block" />
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted group-data-[collapsible=icon]:hidden">
                Outreach pipeline
              </span>
            </Link>
            <SidebarTrigger className="shrink-0 text-muted hover:text-text" />
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted/60">
              LinkedIn
            </SidebarGroupLabel>
            <SidebarGroupContent>{menu(LINKEDIN)}</SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted/60">
              Local
            </SidebarGroupLabel>
            <SidebarGroupContent>{menu(LOCAL)}</SidebarGroupContent>
          </SidebarGroup>

          {/* Team counts both pipelines, so it sits under both rather than in one. */}
          <SidebarGroup className="mt-auto">
            <SidebarGroupContent>{menu([TEAM])}</SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        {/* Collapsed to icons there is no room for the tally, so it steps aside. */}
        <SidebarFooter className="p-4 group-data-[collapsible=icon]:hidden">
          {/* Frosted, like the rail - the tally is a pane, not a solid tile. */}
          <div className="rounded-xl border border-white/8 bg-white/6 px-3.5 py-3 shadow-[inset_0_1px_0_0_rgb(255_255_255/0.07)] backdrop-blur-md">
            {/*
              Whose tally this is. With three people sharing the tracker the
              name has to sit next to the number, or you can't tell at a glance
              whether you're looking at your own day.
            */}
            <div className="flex items-center justify-between gap-2">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                {me.name} · Today
              </div>
              <SignOutButton className="-mr-1 shrink-0 rounded-md p-1 text-muted transition-colors hover:text-rose disabled:opacity-50" />
            </div>
            <div className="tabular mt-1.5 flex items-baseline gap-1.5">
              <span
                className={`font-display text-2xl font-bold ${hit ? "text-brand" : "text-text"
                  }`}
              >
                {loading ? "-" : sentToday}
              </span>
              <span className="font-mono text-xs text-muted">/ {goal}</span>
            </div>
          </div>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      {/* Mobile tab bar - the same glass, sitting over content that scrolls under it. */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-white/8 bg-ink/70 shadow-[inset_0_1px_0_0_rgb(255_255_255/0.06)] backdrop-blur-2xl backdrop-saturate-150 md:hidden">
        {mobileLinks.map((link) => {
          const active = pathname === link.href;
          const count = badge(link);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={`relative flex flex-1 flex-col items-center gap-1 py-3 text-[10px] ${active ? "text-brand" : "text-muted"
                }`}
            >
              <Icon name={link.icon} className="h-5 w-5" />
              {link.label}
              {count !== null && (
                <span className="tabular absolute top-1.5 right-[22%] min-w-[15px] rounded-full bg-brand px-1 text-center font-mono text-[9px] font-bold leading-[15px] text-ink">
                  {count}
                </span>
              )}
            </Link>
          );
        })}

        {/* The way out of this section, and the only tab that isn't a screen. */}
        <Link
          href={swap.href}
          className="relative flex flex-1 flex-col items-center gap-1 border-l border-white/8 py-3 text-[10px] text-muted"
        >
          <Icon name={swap.icon} className="h-5 w-5" />
          {swap.label}
          {(inLocal ? pitches : localToDo) > 0 && (
            <span
              className="absolute top-2.5 right-[26%] size-1.5 rounded-full bg-brand"
              aria-label="Work waiting in the other section"
            />
          )}
        </Link>
      </nav>
    </>
  );
}

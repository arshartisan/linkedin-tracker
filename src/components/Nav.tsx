"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useData } from "./DataProvider";
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
} from "@/components/ui/sidebar";

/*
  One pipeline: one-to-one LinkedIn outreach to people. Team sits apart from it
  because it counts everyone's work rather than being another screen of yours.
*/
type IconName = "today" | "history" | "queue" | "leads" | "stats";

type NavLink = { href: string; label: string; icon: IconName };

const LINKEDIN: NavLink[] = [
  { href: "/", label: "Today", icon: "today" },
  { href: "/history", label: "History", icon: "history" },
  { href: "/queue", label: "Queue", icon: "queue" },
  { href: "/leads", label: "Leads", icon: "leads" },
];

const TEAM: NavLink = { href: "/stats", label: "Team", icon: "stats" };

function Icon({ name, className }: { name: IconName; className?: string }) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
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
  const today = dayKey();
  const sentToday = mine.filter((c) => c.sent_on === today).length;
  const hit = sentToday >= goal;
  const pct = goal > 0 ? Math.min(1, sentToday / goal) : 0;

  /*
    Only the queue carries a count - a badge on everything is a badge on
    nothing. Only the openers count: accepts waiting on a first message are the
    work that goes cold, and follow-ups can wait a day.
  */
  const pitches = queue.due.filter((d) => d.action.kind === "pitch").length;

  function badge(link: NavLink): number | null {
    return link.href === "/queue" && pitches > 0 ? pitches : null;
  }

  const menu = (links: NavLink[]) => (
    /*
      Collapsed, shadcn pins each button to `size-8!` - a fixed 32px in a 48px
      rail. A fixed-width child in a stretch column lands at the start of the
      cross axis, so it has to be centred explicitly or the icons sit off to one
      side of the rail.
    */
    <SidebarMenu className="gap-1 group-data-[collapsible=icon]:items-center">
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
                The active row is a card lifted out of the rail - the same
                move the content area makes, so the nav reads as part of one
                system. It is the only lit thing in the sidebar, which is why
                it needs no colour beyond the icon to be found.
              */
              className="h-10 gap-3 rounded-control px-3 text-[13px] font-semibold text-muted transition-all hover:bg-surface/70 hover:text-text data-[active=true]:bg-surface data-[active=true]:text-text data-[active=true]:shadow-raised data-[active=true]:[&_svg]:text-brand"
            >
              <Link href={link.href} aria-current={active ? "page" : undefined}>
                <Icon name={link.icon} />
                <span>{link.label}</span>
              </Link>
            </SidebarMenuButton>
            {count !== null && (
              <SidebarMenuBadge className="tabular rounded-full bg-brand px-1.5 text-[10px] font-bold text-ink peer-data-[size=default]/menu-button:top-2.5 peer-data-[active=true]/menu-button:text-ink peer-hover/menu-button:text-ink">
                {count}
              </SidebarMenuBadge>
            )}
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );

  const mobileLinks: NavLink[] = [...LINKEDIN, TEAM];

  return (
    <>
      {/*
        The rail sits flush with the page rather than floating over it as its
        own glass pane. That is the whole shift: depth now comes from the cards
        lifting *off* a single quiet background, so a second translucent plane
        here would compete with the thing it is meant to frame.
      */}
      <Sidebar
        collapsible="icon"
        className="border-line-soft **:data-[sidebar=sidebar]:bg-ink"
      >
        <SidebarHeader className="px-3 py-5 group-data-[collapsible=icon]:px-0">
          <Link
            href="/"
            className="flex min-w-0 items-center gap-2.5 px-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
          >
            {/* The lockup carries the wordmark; collapsed, only the plate fits. */}
            <LogoLockup className="h-7 w-auto group-data-[collapsible=icon]:hidden" />
            <LogoMark className="hidden size-8 shrink-0 rounded-[9px] group-data-[collapsible=icon]:block" />
          </Link>
        </SidebarHeader>

        <SidebarContent className="px-2 group-data-[collapsible=icon]:px-0">
          <SidebarGroup className="py-1 group-data-[collapsible=icon]:px-0">
            <SidebarGroupLabel className="label px-3 text-[10px] text-muted/55">
              LinkedIn
            </SidebarGroupLabel>
            <SidebarGroupContent>{menu(LINKEDIN)}</SidebarGroupContent>
          </SidebarGroup>

          {/* Team counts everyone, so it sits apart from your own screens. */}
          <SidebarGroup className="mt-auto py-1 group-data-[collapsible=icon]:px-0">
            <SidebarGroupLabel className="label px-3 text-[10px] text-muted/55">
              Shared
            </SidebarGroupLabel>
            <SidebarGroupContent>{menu([TEAM])}</SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        {/* Collapsed to icons there is no room for the tally, so it steps aside. */}
        <SidebarFooter className="p-3 group-data-[collapsible=icon]:hidden">
          <div className="card px-3.5 py-3">
            <div className="flex items-center justify-between gap-2">
              <span className="label text-[10px]">{me.name} · Today</span>
              <SignOutButton className="-mr-1 shrink-0 rounded-full p-1 text-muted transition-colors hover:text-rose disabled:opacity-50" />
            </div>

            <div className="tabular mt-2 flex items-baseline gap-1.5">
              <span
                className={`font-display text-[26px] leading-none font-extrabold ${
                  hit ? "text-brand" : "text-text"
                }`}
              >
                {loading ? "-" : sentToday}
              </span>
              <span className="text-xs text-muted">/ {goal}</span>
            </div>

            {/*
              A single quiet bar rather than the full tally: the sidebar needs
              to answer "am I close" in peripheral vision, and the tally proper
              lives on Today where it can be read properly.
            */}
            <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-well">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  hit ? "bg-brand" : "bg-brand/45"
                }`}
                style={{ width: `${Math.max(pct * 100, sentToday > 0 ? 4 : 0)}%` }}
              />
            </div>
          </div>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      {/* Mobile tab bar - sits over content that scrolls under it. */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line-soft bg-ink/85 backdrop-blur-xl md:hidden">
        {mobileLinks.map((link) => {
          const active = pathname === link.href;
          const count = badge(link);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={`relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold ${
                active ? "text-brand" : "text-muted"
              }`}
            >
              <Icon name={link.icon} className="h-5 w-5" />
              {link.label}
              {count !== null && (
                <span className="tabular absolute top-1 right-[22%] min-w-3.75 rounded-full bg-brand px-1 text-center text-[9px] leading-3.75 font-bold text-ink">
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

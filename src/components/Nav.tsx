"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useData } from "./DataProvider";
import { dayKey } from "@/lib/date";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";

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
      {/* Desktop rail — fixed, so the list scrolls under it instead of with it. */}
      <Sidebar collapsible="icon" className="border-line">
        <SidebarHeader className="px-2 py-5 group-data-[collapsible=icon]:px-0">
          <div className="flex items-center justify-between gap-2 group-data-[collapsible=icon]:justify-center">
            <Link
              href="/"
              className="block min-w-0 px-2 group-data-[collapsible=icon]:hidden"
            >
              <span className="font-display text-2xl font-extrabold tracking-tight">
                Reach
              </span>
              <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                Outreach pipeline
              </span>
            </Link>
            <SidebarTrigger className="shrink-0 text-muted hover:text-text" />
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {LINKS.map((link) => {
                  const active = pathname === link.href;
                  const count = badge(link.label);
                  return (
                    <SidebarMenuItem key={link.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={link.label}
                        className="h-10 gap-3 px-3 text-muted data-[active=true]:text-text hover:text-text"
                      >
                        <Link
                          href={link.href}
                          aria-current={active ? "page" : undefined}
                        >
                          <Icon name={link.label} />
                          <span>{link.label}</span>
                        </Link>
                      </SidebarMenuButton>
                      {count !== null && (
                        <SidebarMenuBadge className="tabular rounded-full bg-amber px-1.5 font-mono text-[10px] font-bold text-ink peer-data-[size=default]/menu-button:top-2.5 peer-data-[active=true]/menu-button:text-ink peer-hover/menu-button:text-ink">
                          {count}
                        </SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        {/* Collapsed to icons there is no room for the tally, so it steps aside. */}
        <SidebarFooter className="p-4 group-data-[collapsible=icon]:hidden">
          <div className="rounded-xl border border-line-soft bg-surface-2/50 px-3.5 py-3">
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
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

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

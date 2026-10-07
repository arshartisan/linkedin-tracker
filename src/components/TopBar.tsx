"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useData } from "./DataProvider";
import { SignOutButton } from "./SignOutButton";
import { SidebarTrigger } from "@/components/ui/sidebar";

const outreachTabs = [
  { href: "/", label: "Today" },
  { href: "/history", label: "History" },
  { href: "/queue", label: "Queue" },
  { href: "/leads", label: "Leads" },
];
const workspaceTabs = [
  { href: "/companies", label: "Companies" },
  { href: "/upwork", label: "Jobs" },
  { href: "/stats", label: "Team" },
];

export function TopBar() {
  const { me } = useData();
  const pathname = usePathname();
  const tabs = workspaceTabs.some((tab) => tab.href === pathname) ? workspaceTabs : outreachTabs;
  const title = tabs.find((tab) => tab.href === pathname)?.label ?? "Workspace";

  return (
    <header className="sticky top-0 z-30 border-b border-line-soft bg-ink/95 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-2.5 px-4 sm:px-6">
        <SidebarTrigger className="size-[30px] shrink-0 rounded-full bg-secondary text-muted shadow-raised hover:text-text" />
        <span className="truncate text-base font-medium">{title}</span>
        <span className="hidden items-center gap-1.5 rounded-full border border-line bg-surface-2 px-2 py-0.5 text-[11px] text-text sm:inline-flex">
          <span className="size-1.5 rounded-full bg-emerald-400" />
          Active
        </span>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex h-[30px] items-center gap-1.5 rounded-full bg-secondary py-[5px] pr-2.5 pl-[5px] shadow-raised">
            <span aria-hidden className="flex size-5 items-center justify-center rounded-full bg-brand-soft text-[11px] font-medium text-brand-tint">
              {me.name.charAt(0)}
            </span>
            <span className="text-xs">{me.name}</span>
          </div>
          <SignOutButton className="flex size-[30px] items-center justify-center rounded-full bg-secondary text-muted shadow-raised transition-colors hover:text-rose disabled:opacity-50" />
        </div>
      </div>
      <nav aria-label="Workspace sections" className="flex overflow-x-auto px-4 sm:px-6">
        {tabs.map((tab) => (
          <Link key={tab.href} href={tab.href} aria-current={pathname === tab.href ? "page" : undefined}
            className={"shrink-0 border-b-2 px-3 py-2.5 text-xs transition-colors " + (pathname === tab.href ? "border-brand font-medium text-text" : "border-transparent text-muted hover:text-text")}>
            {tab.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

"use client";

import { useData } from "./DataProvider";
import { LogoLockup } from "./Logo";
import { SignOutButton } from "./SignOutButton";
import { SidebarTrigger } from "@/components/ui/sidebar";

/**
 * The bar across the top of every signed-in screen.
 *
 * It carries the two things that belong to the session rather than to any one
 * page: the way to collapse the rail, and who you are signed in as. Page titles
 * stay in the pages, because each one knows what it is called and a title that
 * lives up here would have to be threaded through a layout to get there.
 *
 * Below md the rail is replaced by the bottom tab bar, which has no room for
 * the lockup - so on mobile this is also where the mark lives.
 */
export function TopBar() {
  const { me } = useData();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line-soft bg-ink/85 px-4 backdrop-blur-xl sm:px-7">
      <SidebarTrigger className="hidden size-9 shrink-0 rounded-full text-muted hover:bg-surface hover:text-text md:flex" />
      <LogoLockup className="h-7 w-auto md:hidden" />

      <div className="ml-auto flex items-center gap-2">
        {/*
          No photos anywhere in this app, so the avatar is the initial. A
          lettered disc is honest about that where a generic silhouette would
          just look like a picture that failed to load.
        */}
        <div className="flex items-center gap-2.5 rounded-full bg-surface py-1 pr-3 pl-1 shadow-raised">
          <span
            aria-hidden
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-extrabold text-ink"
          >
            {me.name.charAt(0)}
          </span>
          <span className="hidden text-[13px] font-semibold sm:block">{me.name}</span>
        </div>

        <SignOutButton
          className="flex size-9 shrink-0 items-center justify-center rounded-full border border-line-soft text-muted transition-colors hover:border-line hover:text-rose disabled:opacity-50"
        />
      </div>
    </header>
  );
}

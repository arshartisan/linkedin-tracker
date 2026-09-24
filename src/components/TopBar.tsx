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
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line-soft bg-ink/85 px-4 backdrop-blur-xl sm:px-6">
      <SidebarTrigger className="hidden size-[30px] shrink-0 rounded-full bg-secondary text-secondary-foreground shadow-raised hover:bg-surface-2 hover:text-text md:flex" />
      <LogoLockup className="h-7 w-auto md:hidden" />

      <div className="ml-auto flex items-center gap-2">
        {/*
          No photos anywhere in this app, so the avatar is the initial. A
          lettered disc is honest about that where a generic silhouette would
          just look like a picture that failed to load.
        */}
        <div className="flex h-[30px] items-center gap-1.5 rounded-full bg-secondary py-[5px] pr-[9px] pl-[5px] shadow-raised">
          <span
            aria-hidden
            className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[11px] font-semibold text-brand-tint outline-1 -outline-offset-1 outline-white/10"
          >
            {me.name.charAt(0)}
          </span>
          <span className="hidden text-[12px] leading-none sm:block">{me.name}</span>
        </div>

        <SignOutButton
          className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground shadow-raised transition-[background-color,color,scale] duration-150 ease-out-strong hover:bg-surface-2 hover:text-rose active:scale-[0.96] disabled:opacity-50"
        />
      </div>
    </header>
  );
}

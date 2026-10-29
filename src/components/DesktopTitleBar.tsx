"use client";

import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { CopyIcon, MinusIcon, SquareIcon, XIcon } from "lucide-react";

/*
  The desktop app (src-tauri) opens a frameless window, so this strip stands in
  for the Windows title bar: drag to move, double-click to maximise, and the
  three window buttons. It's always in the markup but only shown under
  html.desktop - see the script in app/layout.tsx and globals.css.
*/
export function DesktopTitleBar() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    if (!document.documentElement.classList.contains("desktop")) return;
    const win = getCurrentWindow();
    let unlisten: (() => void) | undefined;
    let cancelled = false;

    const sync = () => win.isMaximized().then((value) => !cancelled && setMaximized(value));
    sync();
    win.onResized(sync).then((fn) => {
      if (cancelled) fn();
      else unlisten = fn;
    });
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  const win = () => getCurrentWindow();
  const button =
    "flex h-full w-11 items-center justify-center text-muted transition-colors duration-150 hover:bg-white/[0.06] hover:text-text";

  return (
    <div data-tauri-drag-region className="desktop-titlebar fixed inset-x-0 top-0 z-50 hidden h-(--titlebar-h) items-stretch bg-sidebar select-none">
      <div data-tauri-drag-region className="flex-1" />
      <button type="button" aria-label="Minimise" className={button} onClick={() => win().minimize()}>
        <MinusIcon className="size-4" strokeWidth={1.5} />
      </button>
      <button type="button" aria-label={maximized ? "Restore" : "Maximise"} className={button} onClick={() => win().toggleMaximize()}>
        {maximized
          ? <CopyIcon className="size-3.5 -scale-x-100" strokeWidth={1.5} />
          : <SquareIcon className="size-3.5" strokeWidth={1.5} />}
      </button>
      {/* Hides to the tray - the Rust side intercepts the close. */}
      <button type="button" aria-label="Close" className={button + " hover:bg-[#c42b1c] hover:text-white"} onClick={() => win().close()}>
        <XIcon className="size-4" strokeWidth={1.5} />
      </button>
    </div>
  );
}

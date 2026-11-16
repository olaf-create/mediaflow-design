"use client";

import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { useSyncExternalStore } from "react";
import { cn } from "./utils";
import { readThemeMode, writeThemeMode, type ThemeMode } from "./theme-mode";

// Light / dark / system switch. Persists to localStorage "theme"; THEME_SCRIPT (in <head>) applies
// it before paint and re-applies on the "theme-change" event dispatched here.

const MODES: { mode: ThemeMode; icon: LucideIcon }[] = [
  { mode: "light", icon: Sun },
  { mode: "dark", icon: Moon },
  { mode: "system", icon: Monitor },
];

function getStorage(): Storage | null {
  try {
    return localStorage;
  } catch {
    return null;
  }
}

function read(): ThemeMode {
  return readThemeMode(getStorage());
}

function subscribe(onChange: () => void) {
  window.addEventListener("theme-change", onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener("theme-change", onChange);
    window.removeEventListener("storage", onChange);
  };
}

export type ThemeSwitchLabels = { group: string; light: string; dark: string; system: string };

export function ThemeSwitch({ labels, className }: { labels: ThemeSwitchLabels; className?: string }) {
  const mode = useSyncExternalStore(subscribe, read, () => "system" as ThemeMode);

  function choose(next: ThemeMode) {
    if (!writeThemeMode(next, getStorage())) {
      // Storage blocked: apply directly; the choice lasts until the next page load.
      document.documentElement.classList.toggle(
        "dark",
        next === "dark" || (next === "system" && matchMedia("(prefers-color-scheme: dark)").matches),
      );
      return;
    }
    window.dispatchEvent(new Event("theme-change"));
  }

  return (
    <div role="radiogroup" aria-label={labels.group} className={cn("flex h-8 items-center gap-0.5 rounded-full bg-surface p-0.5 shadow-btn", className)}>
      {MODES.map(({ mode: m, icon: Icon }) => (
        <button
          key={m}
          type="button"
          role="radio"
          aria-checked={mode === m}
          title={labels[m]}
          aria-label={labels[m]}
          onClick={() => choose(m)}
          className={cn(
            "flex size-7 items-center justify-center rounded-full text-ink-3 transition-colors hover:text-ink",
            mode === m && "bg-hover-2 text-ink",
          )}
        >
          <Icon size={15} aria-hidden />
        </button>
      ))}
    </div>
  );
}

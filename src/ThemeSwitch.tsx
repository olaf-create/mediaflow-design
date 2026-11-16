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

// Set when storage refused the last choice: the switch then shows it, and it is re-applied after an
// OS colour-scheme change (THEME_SCRIPT would fall back to the OS). Lasts until the next page load.
let unsaved: ThemeMode | null = null;
const listeners = new Set<() => void>();

function read(): ThemeMode {
  return unsaved ?? readThemeMode(getStorage());
}

function osDark() {
  return matchMedia("(prefers-color-scheme: dark)");
}

function applyUnsaved() {
  if (!unsaved) return;
  document.documentElement.classList.toggle("dark", unsaved === "dark" || (unsaved === "system" && osDark().matches));
}

function subscribe(onChange: () => void) {
  const media = osDark();
  listeners.add(onChange);
  window.addEventListener("theme-change", onChange);
  window.addEventListener("storage", onChange);
  media.addEventListener("change", applyUnsaved);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("theme-change", onChange);
    window.removeEventListener("storage", onChange);
    media.removeEventListener("change", applyUnsaved);
  };
}

export type ThemeSwitchLabels = { group: string; light: string; dark: string; system: string };

export function ThemeSwitch({ labels, className }: { labels: ThemeSwitchLabels; className?: string }) {
  const mode = useSyncExternalStore(subscribe, read, () => "system" as ThemeMode);

  function choose(next: ThemeMode) {
    if (!writeThemeMode(next, getStorage())) {
      // Storage blocked: apply directly (a "theme-change" event would re-read the empty storage).
      unsaved = next;
      applyUnsaved();
      listeners.forEach((l) => l());
      return;
    }
    unsaved = null;
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

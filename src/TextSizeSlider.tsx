"use client";

import { ALargeSmall } from "lucide-react";
import { useSyncExternalStore } from "react";
import { cn } from "./utils";
import {
  TEXT_SIZE_DEFAULT,
  TEXT_SIZE_EVENT,
  TEXT_SIZE_KEY,
  TEXT_SIZE_MAX,
  TEXT_SIZE_MIN,
  readTextSize,
  writeTextSize,
} from "./text-size";

// Text size slider, five levels (2 = normal). Persists to localStorage "textSize"; THEME_SCRIPT (in
// <head>) sets data-text-size on <html> before paint and re-applies on the "text-size-change" event
// dispatched here; css/app-shell.css scales the root font size per level.

function getStorage(): Storage | null {
  try {
    return localStorage;
  } catch {
    return null;
  }
}

// Set when storage refused the last choice; lasts until the next page load (like ThemeSwitch).
let unsaved: number | null = null;
const listeners = new Set<() => void>();

function read(): number {
  return unsaved ?? readTextSize(getStorage());
}

function subscribe(onChange: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === TEXT_SIZE_KEY || e.key === null) onChange();
  };
  listeners.add(onChange);
  window.addEventListener(TEXT_SIZE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener(TEXT_SIZE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/** `valueText` may contain `{level}` and `{max}`, e.g. "Level {level} of {max}". */
export type TextSizeSliderLabels = { label: string; valueText: string };

export function TextSizeSlider({ labels, className }: { labels: TextSizeSliderLabels; className?: string }) {
  const level = useSyncExternalStore(subscribe, read, () => TEXT_SIZE_DEFAULT);

  function choose(next: number) {
    if (!writeTextSize(next, getStorage())) {
      // Storage blocked: apply directly (a "text-size-change" event would re-read the empty storage).
      unsaved = next;
      document.documentElement.dataset.textSize = String(next);
      listeners.forEach((l) => l());
      return;
    }
    unsaved = null;
    window.dispatchEvent(new Event(TEXT_SIZE_EVENT));
  }

  return (
    <label
      title={labels.label}
      className={cn("flex h-8 items-center gap-2 rounded-full bg-surface px-3 shadow-btn", className)}
    >
      <ALargeSmall aria-hidden size={16} className="shrink-0 text-ink-3" />
      <input
        type="range"
        min={TEXT_SIZE_MIN}
        max={TEXT_SIZE_MAX}
        step={1}
        value={level}
        aria-label={labels.label}
        aria-valuetext={labels.valueText.replace("{level}", String(level)).replace("{max}", String(TEXT_SIZE_MAX))}
        onChange={(e) => choose(Number(e.target.value))}
        className="h-1 w-20 cursor-pointer accent-accent"
      />
    </label>
  );
}

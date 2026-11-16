/** Light / dark / system colour mode. Stored in localStorage "theme"; absent means system. */
export type ThemeMode = "light" | "dark" | "system";

const KEY = "theme";

export function readThemeMode(storage: Pick<Storage, "getItem"> | null): ThemeMode {
  try {
    const v = storage?.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

/** Returns false when storage is unavailable or throws (the choice is then not persisted). */
export function writeThemeMode(mode: ThemeMode, storage: Pick<Storage, "setItem" | "removeItem"> | null): boolean {
  if (!storage) return false;
  try {
    if (mode === "system") storage.removeItem(KEY);
    else storage.setItem(KEY, mode);
    return true;
  } catch {
    return false;
  }
}

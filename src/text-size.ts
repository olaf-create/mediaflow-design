/** Text size level 1–5 (2 = normal). Stored in localStorage "textSize"; absent means 2. */
export const TEXT_SIZE_KEY = "textSize";
export const TEXT_SIZE_EVENT = "text-size-change";
export const TEXT_SIZE_MIN = 1;
export const TEXT_SIZE_MAX = 5;
export const TEXT_SIZE_DEFAULT = 2;

export function isTextSize(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= TEXT_SIZE_MIN && value <= TEXT_SIZE_MAX;
}

export function readTextSize(storage: Pick<Storage, "getItem"> | null): number {
  try {
    const v = Number(storage?.getItem(TEXT_SIZE_KEY));
    return isTextSize(v) ? v : TEXT_SIZE_DEFAULT;
  } catch {
    return TEXT_SIZE_DEFAULT;
  }
}

/** Returns false when storage is unavailable or throws (the choice is then not persisted). */
export function writeTextSize(level: number, storage: Pick<Storage, "setItem" | "removeItem"> | null): boolean {
  if (!storage || !isTextSize(level)) return false;
  try {
    if (level === TEXT_SIZE_DEFAULT) storage.removeItem(TEXT_SIZE_KEY);
    else storage.setItem(TEXT_SIZE_KEY, String(level));
    return true;
  } catch {
    return false;
  }
}

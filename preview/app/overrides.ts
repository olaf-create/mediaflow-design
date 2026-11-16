import { validateEdit } from "../server/brand-css";

export type Edits = Record<"root" | "dark" | "theme", Record<string, string>>;

type Block = keyof Edits;

/** Only values that would also be saved: an invalid one would break the whole <style>. */
const valid = (block: Block, m: Record<string, string>) =>
  Object.entries(m).filter(([name, value]) => validateEdit({ block, name, value }) === null);

const decls = (entries: [string, string][]) => entries.map(([k, v]) => `${k}:${v};`).join("");

/**
 * CSS for the live preview of unsaved edits. Light and dark edits are scoped to their mode.
 * Radii come from `@theme inline`, which bakes the values into the utility classes, so the
 * matching `.rounded-*` class is overridden as well.
 */
export function buildOverrideCss(e: Edits): string {
  let css = "";
  const root = valid("root", e.root);
  const dark = valid("dark", e.dark);
  const theme = valid("theme", e.theme);
  if (root.length) css += `:root:not(.dark){${decls(root)}}`;
  if (dark.length) css += `:root.dark{${decls(dark)}}`;
  if (theme.length) {
    css += `:root{${decls(theme)}}`;
    for (const [k, v] of theme) {
      const m = /^--radius-(.+)$/.exec(k);
      if (m) css += `.rounded-${m[1]}{border-radius:${v}}`;
    }
  }
  return css;
}

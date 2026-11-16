export type Edits = Record<"root" | "dark" | "theme", Record<string, string>>;

const decls = (m: Record<string, string>) =>
  Object.entries(m)
    .map(([k, v]) => `${k}:${v};`)
    .join("");

/**
 * CSS for the live preview of unsaved edits. Light and dark edits are scoped to their mode.
 * Radii come from `@theme inline`, which bakes the values into the utility classes, so the
 * matching `.rounded-*` class is overridden as well.
 */
export function buildOverrideCss(e: Edits): string {
  let css = "";
  if (Object.keys(e.root).length) css += `:root:not(.dark){${decls(e.root)}}`;
  if (Object.keys(e.dark).length) css += `:root.dark{${decls(e.dark)}}`;
  if (Object.keys(e.theme).length) {
    css += `:root{${decls(e.theme)}}`;
    for (const [k, v] of Object.entries(e.theme)) {
      const m = /^--radius-(.+)$/.exec(k);
      if (m) css += `.rounded-${m[1]}{border-radius:${v}}`;
    }
  }
  return css;
}

/** Panel groups, extra tokens from Beautiful UI, and the contrast pairs. */

export const TOKEN_GROUPS: { label: string; match: (name: string) => boolean }[] = [
  { label: "Flächen", match: (n) => ["--page", "--canvas", "--surface", "--inset", "--hover", "--hover-2", "--field", "--stripe", "--stripe-bg"].includes(n) },
  { label: "Text", match: (n) => n.startsWith("--ink") },
  { label: "Linien", match: (n) => n.startsWith("--line") },
  { label: "Akzent", match: (n) => n.startsWith("--accent") },
  { label: "Semantik", match: (n) => /^--(green|orange|red)(-|$)/.test(n) },
  { label: "Tooltip", match: (n) => n.startsWith("--tooltip-") },
  { label: "Töne", match: (n) => n.startsWith("--tone-") || n === "--on-tone" },
  { label: "Schatten", match: (n) => n.startsWith("--shadow-") },
  { label: "Radien", match: (n) => n.startsWith("--radius-") },
  { label: "Sonstiges", match: () => true },
];

export const groupOf = (name: string) => TOKEN_GROUPS.find((g) => g.match(name))!.label;

/** Tokens defined only in Beautiful UI (foundation.css) that the panel also offers. */
export const EXTRA_SHADOWS = ["--shadow-btn", "--shadow-card", "--shadow-raised", "--shadow-overlay"];
export const RADII = ["--radius-chip", "--radius-control", "--radius-card", "--radius-window"];

export const TONE_NAMES = ["blue", "pink", "green", "purple", "orange", "sand", "grey"];

export const CONTRAST_PAIRS: [fg: string, bg: string][] = [
  ...["--ink", "--ink-2", "--ink-3"].flatMap((fg) => [
    [fg, "--page"] as [string, string],
    [fg, "--surface"] as [string, string],
  ]),
  ["--accent-ink", "--surface"],
  ...TONE_NAMES.map((t) => [`--tone-${t}-ink`, `--tone-${t}-tint`] as [string, string]),
  ...TONE_NAMES.map((t) => ["--on-tone", `--tone-${t}-ink`] as [string, string]),
  ["--tooltip-fg", "--tooltip-bg"],
];

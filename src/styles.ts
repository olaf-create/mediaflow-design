/**
 * Shared class names on top of the Beautiful UI tokens (css/beautifui/foundation.css).
 * Pages use these instead of ad-hoc colours, so a later switch to the Mediaflow corporate
 * design only changes token values.
 */
export const ui = {
  /** Raised content surface (cards, forms, tables). */
  card: "rounded-card bg-surface shadow-card",
  cardPad: "p-6",
  /** Page title and supporting text. */
  h1: "font-heading text-[28px] font-normal leading-[1.15] text-ink",
  h2: "text-[15px] font-semibold text-ink",
  muted: "text-ink-2",
  /** Form controls. */
  label: "flex flex-col gap-1.5 text-[13px] font-medium text-ink-2",
  /** Field labels and block subheadings on record pages and history: same voice as table headers. */
  fieldLabel: "text-[11.5px] font-semibold uppercase tracking-[0.06em] text-ink",
  field:
    "h-9 rounded-control bg-field px-3 text-[14px] font-normal text-ink shadow-inset-field outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-accent/40 aria-invalid:ring-2 aria-invalid:ring-red/50",
  /** Messages. */
  error: "rounded-control bg-red-tint px-3 py-2 text-[13px] text-red",
  success: "rounded-control bg-green-tint px-3 py-2 text-[13px] text-green",
  /** Tables. */
  table: "w-full border-collapse text-[13.5px]",
  /** Column header: brand label style (uppercase Inter SemiBold, manual §4.2) on a tinted band. */
  th: "h-10 border-b border-line-strong bg-hover px-3 text-left text-[11.5px] font-semibold uppercase tracking-[0.06em] whitespace-nowrap text-ink",
  td: "border-b border-line px-3 py-2.5 align-top text-ink",
  /** Value chips and badges (enum values, filters). */
  chip: "inline-flex h-[22px] items-center rounded-chip bg-hover-2 px-2 text-[12px] font-medium leading-none whitespace-nowrap text-ink",
  /** Toggle chip in a filter row; add `chipOn` when active. */
  filterChip:
    "inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[12.5px] leading-none whitespace-nowrap bg-surface text-ink shadow-btn transition-colors hover:bg-hover",
  filterChipOn: "bg-accent-tint text-accent-ink shadow-none hover:bg-accent-tint",
  /** One-click toggle of a writer (block toggle chips, coverage buttons); add `toggleChipOff` (+ TONE_HOVER) or TONE_OUTLINE when off, TONE_SOLID when on. Long labels wrap. */
  toggleChip:
    "inline-flex min-h-6 max-w-full items-center gap-1 rounded-chip border px-2 py-1 text-left text-[12px] font-medium leading-tight break-words transition-[color,background-color,opacity] outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
  toggleChipOff: "border-line-strong bg-surface text-ink-2 hover:text-ink",
  /** A toggle whose click is still being saved. */
  toggleChipBusy: "cursor-progress opacity-60",
  /** Links styled as buttons (server components cannot use the client Button). */
  linkPrimary:
    "inline-flex items-center gap-1.5 rounded-full bg-ink px-3 h-[27px] text-[13px] font-medium leading-none text-canvas hover:opacity-90",
  linkSecondary:
    "inline-flex items-center gap-1.5 rounded-full bg-surface px-3 h-[27px] text-[13px] font-medium leading-none text-ink shadow-btn hover:bg-inset aria-disabled:pointer-events-none aria-disabled:opacity-50",
  /** Click-to-edit value of a writer: light frame on hover, focus ring for keyboard users. */
  inlineView:
    "-mx-2 -my-1 cursor-pointer rounded-control px-2 py-1 outline-none transition-colors hover:bg-hover hover:ring-1 hover:ring-line focus-visible:ring-2 focus-visible:ring-accent/40",
  link: "text-accent-ink underline-offset-2 hover:underline",
} as const;

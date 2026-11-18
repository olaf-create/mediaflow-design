# Changelog

## Unreleased

Vorschau mit Live-Bearbeitung (`npm run preview`): alle Elemente auf einer Seite, Werte je Modus
einstellen, Kontrastliste, „Speichern“ schreibt nach `css/brand.css`. Nur im Repo, nicht im Paket.

## 1.2.0 — 18.11.2026

Text size scales the root font size instead of zooming `.app-content`: CSS `zoom` broke pointer maths in
drag libraries (SVAR Gantt, FullCalendar, dnd-kit). All package font sizes are now rem (same size at
level 2), so the levels reach every text, header and sidebar included; print stays at the normal size.
The `.app-content` class is no longer needed. New `TextSizeSlider` component (labels via `labels`) and
`readTextSize` / `writeTextSize`; other tabs follow a change without reload.

## 1.1.0 — 16.11.2026

New `ThemeSwitch` component: light/dark/system switch (sun, moon, monitor) that stores the choice in
localStorage "theme" and notifies `THEME_SCRIPT` via the `theme-change` event. Labels via `labels` prop.
Other open tabs follow a change without reload (`THEME_SCRIPT` listens to the `storage` event). With
blocked storage the switch shows the actual choice until the next page load. `color-scheme` follows
the mode, so native checkboxes, selects and scrollbars turn dark too.

## 1.0.0 — 14.11.2026

Extracted from mediaflow-competitive-intelligence (main @ 5bbbf17), no visual changes:
Beautiful UI CSS (vendored 08.11.2026), Mediaflow tokens light/dark and tones, text-size zoom,
`ui.*` classes, tone class sets and `TitleMark`, Button, Beautiful UI primitives, Mediaflow
wordmark, theme script.

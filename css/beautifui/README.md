# Beautiful UI styles (vendored)

Source: https://github.com/slev12397/beautiful-ui (MIT), `app/globals.css` as of 08.11.2026.

The published registry (`https://www.beautifului.dev/r/*.json`) cuts `globals.css` at fixed
line numbers that no longer match upstream, which breaks the CSS. These files are therefore cut
at the section banners instead:

- `foundation.css` — lines 1–423 and 1339–end (tokens, `@theme`, base, FilterTable, InsightCards, StreamText …)
- `sidebar-nav.css` — "COMPONENT-SPECIFIC — SidebarNav" (424–505)
- `records-table.css` — "COMPONENT-SPECIFIC — RecordsTable" (506–1338)

Components live in `src/primitives` and `src/Button.tsx`. Local changes:
SidebarNav uses `lucide-react` instead of the commercial Central icon set. Button accepts a `ref` (11.11.2026).

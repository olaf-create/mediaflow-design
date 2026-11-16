# @mediaflow/design

Mediaflow corporate design for internal Next.js apps, built on
[Beautiful UI](https://www.beautifului.dev) (MIT) and Tailwind 4.

**Rule:** Beautiful UI provides structure and token names; Mediaflow provides values only
(`css/brand.css`). Apps use token classes (`bg-surface`, `text-ink-2`, `shadow-card` …), the
`ui.*` classes and the components from this package — never hard-coded colours. New tokens,
classes or components are added here, not in an app.

Source of the brand values: Mediaflow Design Manual v2 (brand.mediaflow.site, 21.09.2026).
Values marked `[derived]` in `brand.css` are not in the manual.

## Contents

| Path | What |
|---|---|
| `css/index.css` | Entry point: Beautiful UI → brand tokens → app shell (order matters) |
| `css/beautifui/` | Beautiful UI, vendored and cut at the section banners (see its README) |
| `css/brand.css` | Mediaflow tokens, light (`:root`) and dark (`.dark`), tones, `--font-heading` |
| `css/app-shell.css` | Text-size zoom levels for `.app-content` |
| `src/styles.ts` | `ui.*` shared class names (card, field, table, chip, link …) |
| `src/tones.tsx` | `Tone`, `TONE_ICON/CHIP/SOLID/OUTLINE/HOVER`, `TitleMark` |
| `src/Button.tsx` | Pill button (cva): primary, secondary, ghost, accent, success, quiet · xs, sm, md |
| `src/primitives/*` | Beautiful UI components (GlideMenu, SidebarNav, RecordsTable, FilterTable, SearchList) |
| `src/ThemeSwitch.tsx`, `src/theme-mode.ts` | `ThemeSwitch` light/dark/system radio switch (`labels` prop), `readThemeMode`/`writeThemeMode` helpers |
| `src/logo.ts` | Mediaflow wordmark as SVG paths (viewBox `0 0 360.03 71.53`) |
| `src/theme.ts` | `THEME_SCRIPT` (dark mode + text size before paint), `FONT_VARIABLES` |

App-specific mappings (which navigation group gets which tone, area icons) stay in the app.

## Preview

A local page that shows every element of this package and lets you edit the token values live:

```bash
npm install
npm run preview
```

- Left: all values from `css/brand.css` plus the Beautiful UI shadows and radii, edited per mode
  (Hell / Dunkel) with colour pickers, sliders or text fields. Changes show immediately; a contrast
  list flags text/surface pairs below WCAG AA.
- **Speichern** writes only the changed values into `css/brand.css` (comments stay; changed values
  get a `[derived]` mark with the old value). An edit only affects the mode it was made in.
- Then release as described below. `preview/` is not part of the published package.
- `npm test` runs the unit tests for the preview (mainly the `brand.css` rewriter).

## Use in an app

The repository is public so Vercel can install it without a token.

```bash
npm install github:olaf-create/mediaflow-design#v1.0.0
```

Peer dependencies the app must have: `react`, `react-dom`, `tailwindcss` (≥ 4.1),
`@tailwindcss/postcss` (or the Turbopack loader), `clsx`, `tailwind-merge`,
`class-variance-authority`, `lucide-react`.

**globals.css** — `foundation.css` already imports `tailwindcss`, so do not import it again:

```css
@import "@mediaflow/design/css";
/* Tailwind 4 does not scan node_modules: let it find the classes used in this package. */
@source "../../node_modules/@mediaflow/design/src";
```

(The `@source` path is relative to the CSS file.)

**next.config.ts** — the package ships TypeScript source:

```ts
const nextConfig = { transpilePackages: ["@mediaflow/design"] };
```

**vitest.config** (if tests import modules that use the package):

```ts
test: { server: { deps: { inline: ["@mediaflow/design"] } } }
```

**layout.tsx** — fonts are loaded by the app with `next/font` (it cannot run inside a package),
using the variable names from `FONT_VARIABLES`:

```tsx
import { Inter, JetBrains_Mono, PT_Serif } from "next/font/google";
import { THEME_SCRIPT } from "@mediaflow/design";

const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono-face", display: "swap" });
const serif = PT_Serif({ subsets: ["latin", "latin-ext"], weight: ["400"], variable: "--font-pt-serif", display: "swap" });

<html className={`${inter.variable} ${mono.variable} ${serif.variable}`} suppressHydrationWarning>
  <head><script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} /></head>
  <body className="bg-[var(--page)] text-[var(--ink)]">…</body>
</html>
```

Mark the main content area with `className="app-content"` for the text-size levels.

**Components:**

```tsx
import { ui, Button, TONE_CHIP, TitleMark, cn } from "@mediaflow/design";
import GlideMenu from "@mediaflow/design/primitives/GlideMenu";
```

## Changing the design

1. Change it here, add an entry to `CHANGELOG.md`, bump `version` in `package.json`.
2. Semver: changed values = patch · new tokens/classes/components = minor · renamed or removed = major.
3. Tag and push: `git tag v1.1.0 && git push --tags`.
4. In each app: `npm install github:olaf-create/mediaflow-design#v1.1.0`, check the Vercel
   preview, merge. (Renovate/Dependabot can open these PRs automatically.)

Beautiful UI updates come from the upstream repository, cut at the section banners — not from
the beautifului.dev registry, which cuts `globals.css` at stale line numbers. Note every local
change to vendored files in `css/beautifui/README.md`.

## Used by

- mediaflow-competitive-intelligence (since v1.0.0)
- Marketing Management (since v1.0.0)

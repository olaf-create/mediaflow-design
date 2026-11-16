# Design-Vorschau mit Live-Bearbeitung – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `npm run preview` opens a local page showing every element of `@mediaflow/design` with the real CSS and components; a side panel edits token values live per mode (light/dark), and "Speichern" writes only the changed values back into `css/brand.css`.

**Architecture:** A `preview/` folder (not shipped: `files` in `package.json` stays `css`, `src`, `CHANGELOG.md`) holds a Vite + React app. Pure, unit-tested functions parse and rewrite `brand.css` (`preview/server/brand-css.ts`); a dev-only Vite plugin exposes them as `GET /__design/tokens` and `POST /__design/save`. The browser applies edits live through one generated `<style>` element.

**Tech Stack:** Vite 8, `@vitejs/plugin-react` 6, `@tailwindcss/vite` 4.3 (same version as the installed `tailwindcss` 4.3.5), Vitest 5, React 19, TypeScript strict. npm (not pnpm).

**Spec:** `docs/superpowers/specs/2026-11-16-design-preview-design.md`

## Global Constraints

- Only `devDependencies` are added; `dependencies`, `peerDependencies`, `exports` and `files` in `package.json` stay unchanged.
- Never write to `css/beautifui/*` (read-only input for the parser).
- The page uses the package's real CSS (`css/index.css`) and real components from `src/` — no copies or look-alikes.
- `css/index.css` already imports Tailwind via `foundation.css`; do not import `tailwindcss` again.
- UI texts German, code/identifiers/commits English (Conventional Commits, ending with the `Co-Authored-By` line from the repo's commit convention).
- Fonts: load Inter, PT Serif 400 and JetBrains Mono from Google Fonts and set `--font-inter`, `--font-pt-serif`, `--font-mono-face` on `<html>`.
- Dark mode = class `dark` on `<html>`.
- Token names must match `^--[a-z0-9-]+$`; values must not contain `;`, `{`, `}` or `/*`.
- **Grundregel:** an edit only affects the mode it was made in. When a light (`:root`) edit targets a variable that has no declaration in `brand.css .dark`, saving also writes the previously effective dark value into `.dark` — taken from `foundation.css .dark` if declared there, otherwise the old `:root` value — with comment `/* [derived] kept dark value */`. (The spec names the foundation case explicitly; applying it to inherited brand values like `--tone-blue` too is needed so the saved result matches what the live preview showed.)

## Review Focus

1. **Name prefixes** — editing `--tone-blue` must not touch `--tone-blue-tint`, `--tone-blue-ink` or `--color-tone-blue` (the `@theme inline` block has `--color-tone-blue: var(--tone-blue)`). → test in Task 2.
2. **Multi-line values** — foundation `.dark` declares `--shadow-card:` over three lines; parsing and the dark-keep copy must take the whole value. → tests in Tasks 1 and 2.
3. **Repeated saves** — saving the same token twice must not stack `[derived] was …` comments or duplicate the `kept dark value` line. → test in Task 2.
4. **File changed on disk since the page loaded** (e.g. Claude edited `brand.css`) — save re-reads the file and replaces only the edited values; all other lines stay as they are on disk. → test in Task 2 (pure function works on whatever text it gets) and Task 4 (plugin reads fresh on each POST).
5. **Bad input from the text field** (`#zzz`, `red;}`, empty string) — invalid characters are rejected with HTTP 400 and a German message; an empty value is rejected; a syntactically odd but harmless value (`#zzz`) is written as-is (CSS ignores it, the preview shows it). → tests in Tasks 2 and 4.

---

## File Structure

```
preview/
  index.html              page shell, Google Fonts link
  main.tsx                React root
  preview.css             @import "../css/index.css"; @source "../src"; @source "./";
  vite.config.ts          react(), tailwindcss(), designPlugin(); test config
  tsconfig.json           strict, includes preview/** and ../src
  server/
    brand-css.ts          parseBlocks(), applyEdits() — pure
    brand-css.test.ts
    plugin.ts             designPlugin(): GET /__design/tokens, POST /__design/save
    plugin.test.ts
  app/
    color.ts              parseColor(), toHex(), formatColor(), composite(), contrastRatio()
    color.test.ts
    overrides.ts          buildOverrideCss()
    overrides.test.ts
    tokens.ts             TOKEN_GROUPS, EXTRA_TOKENS, CONTRAST_PAIRS
    App.tsx               layout, mode toggle, state, save, beforeunload
    TokenPanel.tsx        groups, editors, reset, contrast list
    Showcase.tsx          all sections
```

Shared types (defined in Task 1, `preview/server/brand-css.ts`, imported by client code too):

```ts
export type Block = "root" | "dark" | "theme";
export type Decl = { block: Block; name: string; value: string; comment: string | null };
export type Blocks = Record<Block, Decl[]>;
export type TokenEdit = { block: Block; name: string; value: string };
```

---

### Task 1: Tooling and `brand.css` parser

**Files:**
- Modify: `package.json` (scripts, devDependencies), `.gitignore` (add `preview/dist`)
- Create: `preview/vite.config.ts`, `preview/tsconfig.json`, `preview/server/brand-css.ts`, `preview/server/brand-css.test.ts`

**Interfaces:**
- Produces: the shared types above; `parseBlocks(css: string): Blocks` — `root` = top-level `:root { }`, `dark` = top-level `.dark { }`, `theme` = `@theme inline { }`. Each declaration in source order, value trimmed with internal whitespace/newlines collapsed to single spaces, `comment` = text of a `/* … */` that follows on the same line after the `;` (trimmed, without delimiters), else `null`. Several declarations per line are separate `Decl`s; a trailing comment on such a line belongs to the last one. Standalone comment lines are ignored. Other blocks (e.g. `.dark .source-avatar`, rules after the token blocks) are ignored.

- [ ] **Step 1: Install dev tooling**

Run: `npm install -D vite@^8.3.8 @vitejs/plugin-react@^6.3.0 @tailwindcss/vite@4.3.5 vitest@^5.1.0 @types/node`
Then add scripts: `"preview": "vite --config preview/vite.config.ts --open"`, `"test": "vitest run --config preview/vite.config.ts"`, and change `"typecheck"` to `"tsc --noEmit && tsc --noEmit -p preview"`.
`preview/vite.config.ts`: `root: "preview"`, plugins `react()`, `tailwindcss()` (plugin from Task 4 added there), `test: { include: ["**/*.test.ts"] }`.

- [ ] **Step 2: Write failing tests in `preview/server/brand-css.test.ts`**

Read fixtures from the real files (`css/brand.css`, `css/beautifui/foundation.css`) via `fs`.

```ts
test("parses brand root with comment", () => {
  const d = parseBlocks(brand).root.find((x) => x.name === "--ink-2")!;
  expect(d).toEqual({ block: "root", name: "--ink-2", value: "#696663", comment: "grey-600, AA on white" });
});
test("parses several declarations on one tone line", () => {
  const r = parseBlocks(brand).root;
  expect(r.find((x) => x.name === "--tone-blue")!.value).toBe("#0e73dc");
  expect(r.find((x) => x.name === "--tone-blue-tint")!.value).toBe("#dcebfc");
  expect(r.find((x) => x.name === "--tone-blue-ink")!.value).toBe("#094b90");
});
test("dark block is separate", () => {
  expect(parseBlocks(brand).dark.find((x) => x.name === "--page")!.value).toBe("#1c1c1b");
  expect(parseBlocks(brand).dark.some((x) => x.name === "--tone-blue")).toBe(false);
});
test("value with parentheses and slash", () => {
  expect(parseBlocks(brand).root.find((x) => x.name === "--shadow-inset-field")!.value)
    .toBe("inset 0 0 0 1px var(--line-strong), inset 0 1px 2px rgb(28 28 27 / 0.06)");
});
test("multi-line value in foundation dark", () => {
  expect(parseBlocks(foundation).dark.find((x) => x.name === "--shadow-card")!.value)
    .toBe("0 0 0 1px oklch(1 0 0 / 0.11), 0 1px 2px oklch(0 0 0 / 0.2), 0 2px 6px oklch(0 0 0 / 0.2)");
});
test("theme block of foundation has radii", () => {
  expect(parseBlocks(foundation).theme.find((x) => x.name === "--radius-card")!.value).toBe("10px");
});
```

- [ ] **Step 3: Run `npm test` — expect FAIL (`parseBlocks` not defined)**

- [ ] **Step 4: Implement `parseBlocks` in `preview/server/brand-css.ts`**

Small hand-written scanner (no PostCSS): find each top-level block by its selector at brace depth 0, then walk its body tracking parentheses and comments to split declarations at `;`.

- [ ] **Step 5: Run `npm test` — expect PASS; `npm run typecheck` — expect no errors**

- [ ] **Step 6: Commit** — `feat(preview): add vite tooling and brand.css parser`

---

### Task 2: Rewriting `brand.css` (`applyEdits`)

**Files:**
- Modify: `preview/server/brand-css.ts`, `preview/server/brand-css.test.ts`

**Interfaces:**
- Consumes: `parseBlocks`, types from Task 1.
- Produces: `applyEdits(brandCss: string, foundationCss: string, edits: TokenEdit[]): { css: string; changed: number }` and `validateEdit(e: TokenEdit): string | null` (German error message or `null`). Throws `Error` with the message of the first invalid edit.

Rules (from the spec, exact):
- Replace only the value between `--name:` and its `;` inside the target block; match the name exactly (next char after the name must be `:` after optional whitespace, previous char must not be `-` or a letter).
- `[derived]` mark when the value actually changes:
  - own comment on the line without `[derived]` → `/* [derived] was <old comment> <old value> */`, e.g. `/* [derived] was grey-500 #82807c */`;
  - single declaration, no comment → append ` /* [derived] was <old value> */`;
  - several declarations on the line → append ` /* [derived] <name> was <old value> */` at line end per changed variable, unless the line already has a `[derived] <name>` comment;
  - comment already contains `[derived]` → comment unchanged.
- Variable missing in the target block → insert `  <name>: <value>; /* [derived] set in preview */` as last line of the block (block `theme` = the `@theme inline` block of `brand.css`).
- Grundregel (Global Constraints): for each `root` edit whose name has no `dark` declaration in `brand.css`, also insert into `.dark` the effective old dark value with `/* [derived] kept dark value */` — only once (skip if `.dark` already declares the name, which also covers repeated saves).
- `changed` = number of edits whose value differed from the current value. Edits equal to the current value are no-ops.

- [ ] **Step 1: Write failing tests**

```ts
test("replaces value and marks manual comment", () => {
  const { css } = applyEdits(brand, foundation, [{ block: "root", name: "--ink-3", value: "#7a7874" }]);
  expect(css).toContain("--ink-3: #7a7874; /* [derived] was grey-500 #82807c */");
  expect(css).toContain("--ink-3: #82807c; /* grey-500 */"); // .dark line untouched
});
test("keeps existing [derived] comment", () => {
  const { css } = applyEdits(brand, foundation, [{ block: "root", name: "--canvas", value: "#eeeeee" }]);
  expect(css).toContain("--canvas: #eeeeee; /* [derived] */");
});
test("line without comment", () => {
  const { css } = applyEdits(brand, foundation, [{ block: "root", name: "--surface", value: "#fffefc" }]);
  expect(css).toContain("--surface: #fffefc; /* [derived] was #ffffff */");
});
test("exact name: --tone-blue does not touch -tint, -ink or --color-tone-blue", () => {
  const { css } = applyEdits(brand, foundation, [{ block: "root", name: "--tone-blue", value: "#1166dd" }]);
  expect(css).toMatch(/--tone-blue: #1166dd;\s+--tone-blue-tint: #dcebfc;\s+--tone-blue-ink: #094b90;.*\/\* \[derived\] --tone-blue was #0e73dc \*\//);
  expect(css).toContain("--color-tone-blue: var(--tone-blue);");
});
test("grundregel: light tone edit keeps old dark value", () => {
  const { css } = applyEdits(brand, foundation, [{ block: "root", name: "--tone-blue", value: "#1166dd" }]);
  expect(parseBlocks(css).dark.find((d) => d.name === "--tone-blue")).toMatchObject({ value: "#0e73dc", comment: "[derived] kept dark value" });
});
test("grundregel: shadow override keeps foundation dark value (multi-line)", () => {
  const { css } = applyEdits(brand, foundation, [{ block: "root", name: "--shadow-card", value: "0 0 0 1px var(--line)" }]);
  const b = parseBlocks(css);
  expect(b.root.find((d) => d.name === "--shadow-card")!.comment).toBe("[derived] set in preview");
  expect(b.dark.find((d) => d.name === "--shadow-card")!.value).toBe("0 0 0 1px oklch(1 0 0 / 0.11), 0 1px 2px oklch(0 0 0 / 0.2), 0 2px 6px oklch(0 0 0 / 0.2)");
});
test("radius goes into @theme inline", () => {
  const { css } = applyEdits(brand, foundation, [{ block: "theme", name: "--radius-card", value: "12px" }]);
  expect(parseBlocks(css).theme.find((d) => d.name === "--radius-card")!.value).toBe("12px");
});
test("dark edit only touches .dark", () => {
  const { css } = applyEdits(brand, foundation, [{ block: "dark", name: "--page", value: "#181818" }]);
  expect(parseBlocks(css).root.find((d) => d.name === "--page")!.value).toBe("#f7f4f1");
});
test("repeated save does not stack comments or dark lines", () => {
  const e = [{ block: "root" as const, name: "--tone-blue", value: "#1166dd" }];
  const once = applyEdits(brand, foundation, e).css;
  const twice = applyEdits(once, foundation, [{ ...e[0], value: "#1055cc" }]).css;
  expect(twice.match(/\[derived\] --tone-blue was/g)).toHaveLength(1);
  expect(parseBlocks(twice).dark.filter((d) => d.name === "--tone-blue")).toHaveLength(1);
});
test("unchanged value is a no-op", () => {
  expect(applyEdits(brand, foundation, [{ block: "root", name: "--ink", value: "#1c1c1b" }])).toEqual({ css: brand, changed: 0 });
});
test("all other lines stay byte-identical", () => {
  const { css } = applyEdits(brand, foundation, [{ block: "root", name: "--ink-3", value: "#7a7874" }]);
  const diff = brand.split("\n").filter((l, i) => l !== css.split("\n")[i]);
  expect(diff).toEqual(["  --ink-3: #82807c; /* grey-500 */"]);
});
test.each([["red;}"], ["a{b"], ["x /* y"], [""], ["   "]])("rejects value %j", (v) => {
  expect(validateEdit({ block: "root", name: "--ink", value: v })).not.toBeNull();
});
test("rejects bad name", () => {
  expect(validateEdit({ block: "root", name: "--Ink;x", value: "#000" })).not.toBeNull();
});
test("accepts odd but harmless value", () => {
  expect(validateEdit({ block: "root", name: "--ink", value: "#zzz" })).toBeNull();
});
```

- [ ] **Step 2: Run `npm test` — expect FAIL**
- [ ] **Step 3: Implement `validateEdit` and `applyEdits`** (edit the text by positions found while scanning; never re-serialize the whole file)
- [ ] **Step 4: Run `npm test` — expect PASS**
- [ ] **Step 5: Commit** — `feat(preview): rewrite brand.css values with derived marks`

---

### Task 3: Colour and contrast helpers

**Files:**
- Create: `preview/app/color.ts`, `preview/app/color.test.ts`

**Interfaces:**
- Produces:
  - `type RGBA = { r: number; g: number; b: number; a: number }` (r/g/b 0–255, a 0–1)
  - `parseColor(v: string): RGBA | null` — `#rgb`, `#rrggbb`, `#rrggbbaa`, `rgb(r g b)`, `rgb(r g b / a)`, `rgb(r, g, b)`, `rgba(r, g, b, a)`; anything else → `null`
  - `toHex(c: RGBA): string` — lowercase `#rrggbb` (alpha dropped)
  - `formatColor(c: RGBA): string` — `#rrggbb` if `a === 1`, else `rgb(r g b / a)` (the style used in `brand.css`)
  - `composite(fg: RGBA, bg: RGBA): RGBA` — alpha blend over an opaque bg
  - `contrastRatio(fg: RGBA, bg: RGBA): number` — WCAG 2.x, fg composited over bg first

- [ ] **Step 1: Failing tests**

```ts
expect(parseColor("#0e73dc")).toEqual({ r: 14, g: 115, b: 220, a: 1 });
expect(parseColor("rgb(14 115 220 / 0.22)")).toEqual({ r: 14, g: 115, b: 220, a: 0.22 });
expect(parseColor("var(--line)")).toBeNull();
expect(parseColor("transparent")).toBeNull();
expect(formatColor({ r: 14, g: 115, b: 220, a: 0.22 })).toBe("rgb(14 115 220 / 0.22)");
expect(contrastRatio(parseColor("#000")!, parseColor("#fff")!)).toBeCloseTo(21, 1);
expect(contrastRatio(parseColor("#696663")!, parseColor("#ffffff")!)).toBeGreaterThanOrEqual(4.5); // "AA on white" claim in brand.css
expect(contrastRatio(parseColor("rgb(0 0 0 / 0)")!, parseColor("#ffffff")!)).toBeCloseTo(1, 2);
```

- [ ] **Step 2: Run — FAIL. Step 3: Implement. Step 4: Run — PASS.**
- [ ] **Step 5: Commit** — `feat(preview): add colour parsing and WCAG contrast`

---

### Task 4: Dev-server plugin and page scaffold

**Files:**
- Create: `preview/server/plugin.ts`, `preview/server/plugin.test.ts`, `preview/index.html`, `preview/main.tsx`, `preview/preview.css`, `preview/app/App.tsx` (placeholder heading „Mediaflow Design – Vorschau“)
- Modify: `preview/vite.config.ts` (add `designPlugin()`)

**Interfaces:**
- Consumes: `parseBlocks`, `applyEdits`, `validateEdit` (Tasks 1–2).
- Produces:
  - `designPlugin(opts?: { repoRoot?: string }): Plugin` — `configureServer` only (dev).
  - `GET /__design/tokens` → `200 { brand: Blocks; foundation: Blocks }` (files read fresh per request).
  - `POST /__design/save` body `{ edits: TokenEdit[] }` → re-reads both files, validates every edit, `applyEdits`, writes `css/brand.css` only if `changed > 0`, returns `200 { changed: number }`; invalid edit → `400 { error: string }` and the file is not written; other methods → 405.
  - `handleSave(repoRoot: string, body: unknown): Promise<{ status: number; json: unknown }>` and `handleTokens(repoRoot: string)` exported for tests (the middleware is a thin wrapper).

- [ ] **Step 1: Failing tests** — copy `css/` into a temp dir per test, then:
  - `handleTokens` returns `brand.root` containing `--page`;
  - `handleSave` with `--ink-3` → status 200, `{ changed: 1 }`, file on disk contains the new value;
  - `handleSave` after the file was modified on disk (append a comment line to the temp `brand.css` before calling) → the appended line is still there;
  - `handleSave` with `value: "red;}"` → status 400, `error` non-empty, file unchanged;
  - `handleSave` with body `{}` → 400.
- [ ] **Step 2: Run — FAIL. Step 3: Implement `plugin.ts` and the page scaffold** (`index.html` loads Google Fonts for Inter 400/500/600, PT Serif 400, JetBrains Mono, and sets the three font variables in a `<style>` on `html`; `preview.css` as in File Structure).
- [ ] **Step 4: Run `npm test` — PASS. Run `npm run preview`, then `curl -s localhost:5173/__design/tokens | head -c 200`** — expect JSON starting with `{"brand":{"root":[`. Page shows the heading in Inter on the ivory page background.
- [ ] **Step 5: Commit** — `feat(preview): add dev-server endpoints and page scaffold`

---

### Task 5: Showcase (all elements)

**Files:**
- Create: `preview/app/Showcase.tsx`
- Modify: `preview/app/App.tsx` (render `<Showcase />` in an `.app-content` main area)

**Interfaces:**
- Consumes: from `../../src`: `ui`, `Button`, `TONE_CHIP`, `TONE_SOLID`, `TONE_OUTLINE`, `TONE_ICON`, `TitleMark`, `MEDIAFLOW_LOGO_PATHS`, `cn`; default exports of `../../src/primitives/{SidebarNav,GlideMenu,FilterTable,SearchList,RecordsTable}`.
- Produces: `Showcase(props: { tokens: { name: string; value: string }[] }): JSX.Element` — `tokens` = currently effective values of the visible mode, for the colour tiles.

Sections in this order, each with a German heading (`ui.h2`): Logo · Farben (tile per colour token: swatch, name, value) · Typografie (`ui.h1` „Seitentitel“, `ui.h2`, body text, `ui.muted`, `ui.fieldLabel`, `ui.link`) · Buttons (each variant × `xs/sm/md`, plus one disabled row) · Chips & Töne (`ui.chip`, `ui.filterChip` off/on, per tone `TONE_CHIP`, `TONE_SOLID`, `TONE_OUTLINE`, `TONE_ICON` icon, `TitleMark`) · Formular (`ui.label` + `ui.field`, one with `aria-invalid`) · Meldungen (`ui.error`, `ui.success`) · Karte (`ui.card ui.cardPad`) · Tabelle (`ui.table/th/td`, 3 rows) · Navigation (SidebarNav in a fixed-height frame) · Menü (GlideMenu with 4 `data-menu-row` rows) · FilterTable · SearchList · RecordsTable (`fill` in a 480px-high frame). No tooltip section (spec).

- [ ] **Step 1: Implement `Showcase.tsx`** (read the props/exports of `src/tones.tsx` and the primitives before using them).
- [ ] **Step 2: Verify** — `npm run typecheck` passes; `npm run preview` shows every section without console errors; toggling `document.documentElement.classList.toggle("dark")` in the console switches all sections to dark.
- [ ] **Step 3: Commit** — `feat(preview): show all design elements`

---

### Task 6: Token panel, live overrides, save

**Files:**
- Create: `preview/app/tokens.ts`, `preview/app/overrides.ts`, `preview/app/overrides.test.ts`, `preview/app/TokenPanel.tsx`
- Modify: `preview/app/App.tsx`

**Interfaces:**
- Consumes: `Blocks`, `TokenEdit` (Task 1); `parseColor`, `formatColor`, `toHex`, `contrastRatio` (Task 3); endpoints (Task 4); `Showcase` (Task 5).
- Produces:
  - `tokens.ts`: `TOKEN_GROUPS: { label: string; match: (name: string) => boolean }[]` in this order — Flächen (`--page --canvas --surface --inset --hover --hover-2 --field --stripe --stripe-bg`), Text (`--ink*`), Linien (`--line*`), Akzent (`--accent*`), Semantik (`--green* --orange* --red*`), Tooltip (`--tooltip-*`), Töne (`--tone-* --on-tone`), Schatten (`--shadow-*`), Radien (`--radius-*`), Sonstiges (rest). `EXTRA_TOKENS`: `--shadow-btn --shadow-card --shadow-raised --shadow-overlay` (blocks root/dark, from foundation unless brand declares them) and `--radius-chip --radius-control --radius-card --radius-window` (block theme). `CONTRAST_PAIRS: [fg: string, bg: string][]` — `--ink`, `--ink-2`, `--ink-3` each on `--page` and `--surface`; `--accent-ink` on `--surface`; per tone `--tone-X-ink` on `--tone-X-tint`; `--on-tone` on each `--tone-X-ink`; `--tooltip-fg` on `--tooltip-bg`.
  - `overrides.ts`: `type Edits = Record<"root" | "dark" | "theme", Record<string, string>>`; `buildOverrideCss(e: Edits): string`.

`buildOverrideCss` output: `:root:not(.dark){--a:v;}` for root edits, `:root.dark{--a:v;}` for dark edits, and for theme edits `:root{--radius-x:v;}` plus `.rounded-chip{border-radius:v}` / `.rounded-control{…}` / `.rounded-card{…}` / `.rounded-window{…}` for the matching radius (needed because `@theme inline` bakes radius values into the utility classes). Empty blocks are omitted.

Panel behaviour:
- On load: `GET /__design/tokens`; token list = brand `root` names ∪ `EXTRA_TOKENS`. Effective values per mode are read with `getComputedStyle(document.documentElement).getPropertyValue(name)` while the mode class is set (read both modes once at load and after save).
- Mode toggle „Hell | Dunkel“ sets the `dark` class; editors show and edit the visible mode (`root` for Hell, `dark` for Dunkel; radii always `theme`).
- A dark token without a `.dark` declaration in `brand.css` shows „geerbt“ next to its name.
- Editor by value: `parseColor` ok → `<input type="color">` + text field (+ opacity slider 0–1 if `a < 1`, output via `formatColor`); radius → range 0–24 px + number; else → text field.
- Changed tokens: dot marker + „↺“ reset per token; header shows count and „Alle verwerfen“.
- „Speichern“ (disabled when nothing changed): `POST` all edits; on 200 clear edits, re-read tokens and effective values, show „Gespeichert (N Werte) – jetzt in Claude ‚als neue Version freigeben‘“; on 400 show the `error` text in `ui.error`.
- Contrast list at the bottom of the panel: every `CONTRAST_PAIRS` entry for the visible mode with ratio (1 decimal, German comma) and badge „AAA“ (≥ 7), „AA“ (≥ 4.5), „AA groß“ (≥ 3), else „zu schwach“ in `ui.error` colours. A translucent bg (e.g. dark tone tints) is first composited over `--surface`, then the fg over that result. Hint only, never blocks saving.
- `beforeunload` warning while unsaved edits exist.

- [ ] **Step 1: Failing tests for `buildOverrideCss`**

```ts
expect(buildOverrideCss({ root: { "--ink": "#111" }, dark: {}, theme: {} })).toBe(":root:not(.dark){--ink:#111;}");
expect(buildOverrideCss({ root: {}, dark: { "--page": "#181818" }, theme: {} })).toBe(":root.dark{--page:#181818;}");
expect(buildOverrideCss({ root: {}, dark: {}, theme: { "--radius-card": "12px" } }))
  .toBe(":root{--radius-card:12px;}.rounded-card{border-radius:12px}");
expect(buildOverrideCss({ root: {}, dark: {}, theme: {} })).toBe("");
```

- [ ] **Step 2: Run — FAIL. Step 3: Implement `tokens.ts`, `overrides.ts`. Step 4: Run — PASS.**
- [ ] **Step 5: Implement `TokenPanel.tsx` and wire `App.tsx`** (panel left, 320px, scrollable; showcase right; one `<style id="design-overrides">` updated from state).
- [ ] **Step 6: Manual check** (commit Step 5 first, so `git checkout css/brand.css` restores the file afterwards; do not use `git stash`):
  1. Change `--accent` in Hell → buttons/links change instantly; switch to Dunkel → dark accent unchanged.
  2. Change `--radius-card` to 20 → cards and RecordsTable frame round instantly.
  3. Change `--ink-2` to `#bbbbbb` → its contrast row shows „zu schwach“.
  4. Speichern → `git diff css/brand.css` shows only the edited lines plus `[derived]` comments and, for `--accent`, nothing in `.dark` (already declared there).
  5. Reload with an unsaved edit → browser asks before leaving.
  6. `git checkout css/brand.css`.
- [ ] **Step 7: `npm test` and `npm run typecheck` — PASS. Commit** — `feat(preview): edit tokens live and save to brand.css`

---

### Task 7: Docs and final check

**Files:**
- Modify: `README.md` (section „Preview“ after „Contents“: `npm install`, `npm run preview`, what Speichern does, that `preview/` is not shipped), `ANLEITUNG.md` (in Schritt 3 a paragraph „Selbst ausprobieren: Vorschau öffnen“ — Claude starts it with „Starte die Design-Vorschau“; edit, Speichern, then Schritt 5), `CLAUDE.md` (Befehle: `npm run preview`, `npm test`; Aufbau: `preview/`), `CHANGELOG.md` (entry „Unreleased — Vorschau mit Live-Bearbeitung (nur Repo, nicht im Paket)“).

- [ ] **Step 1: Update the four files.**
- [ ] **Step 2: Verify packaging** — `npm pack --dry-run` lists no `preview/` files.
- [ ] **Step 3: `npm test`, `npm run typecheck` — PASS.**
- [ ] **Step 4: Commit** — `docs: document the design preview`

# Preview Inspect (Alt-click → highlight tokens) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Alt-clicking an element in the preview showcase highlights its design tokens in the value panel and scrolls to the first.

**Architecture:** Pure logic in `preview/app/inspect.ts` reads the loaded CSS rules, collects `var(--…)` references of rules matching the element and its descendants (state pseudo-classes stripped), resolves custom-property chains and filters to the panel's token names. `App.tsx` handles Alt-hover/Alt-click/Escape and holds the selection; `TokenPanel.tsx` renders the highlight and scrolls.

**Tech Stack:** React 19, Vite, Tailwind 4, Vitest (`npm test` = `vitest run --config preview/vite.config.ts`, environment `node` → DOM-dependent glue stays out of unit tests).

**Spec:** `docs/superpowers/specs/2026-11-16-preview-inspect-design.md`

## Global Constraints

- Only `preview/` changes (plus README "Preview", `ANLEITUNG.md` paragraph "Selbst ausprobieren: die Vorschau", these docs). No package release, no CHANGELOG entry.
- No hard-coded colours: package token classes / `var(--…)` only (repo rule 4).
- UI text in the preview is German; code/identifiers English.
- `npm run typecheck` and `npm test` green.
- Commit steps run only after Olaf says so (task brief); until then changes stay uncommitted.

## Review Focus

1. Tailwind 4 wraps variants in nested rules (`&:hover { @media (hover: hover) { … } }`) and `@layer` blocks — recursion must reach them, and a nested `&` selector must be resolved against its parent.
2. Selectors that throw in `Element.matches` after stripping (e.g. `::-webkit-…`, `:is()` left empty) must be skipped, not crash.
3. Cyclic or self-referencing custom properties (`--a: var(--b); --b: var(--a)`) must terminate.
4. Alt-click on a `<label>`/`<input>` must not focus/toggle it; plain click must still work.
5. Panel order: highlighted names are returned in panel order so "scroll to first" is the topmost.

---

### Task 1: Pure token-resolution logic

**Files:**
- Create: `preview/app/inspect.ts`
- Test: `preview/app/inspect.test.ts`

**Interfaces — Produces:**
- `varRefs(value: string): string[]` — all `--name`s in `var(...)`, including fallbacks, de-duplicated.
- `stripStatePseudos(selector: string): string` — removes `:hover :focus :focus-visible :focus-within :active :visited :disabled :enabled :checked :placeholder-shown` and every `::pseudo-element`; returns `"*"`-safe selector (`".a:hover"` → `".a"`, `":hover"` → `"*"`).
- `type FlatRule = { selector: string; refs: string[] }`
- `type Definitions = Map<string, string[]>` — custom property → names it references (union over all rules).
- `flattenRules(rules: ArrayLike<CSSRuleLike>, parent?: string): { rules: FlatRule[]; defs: Definitions }` where `CSSRuleLike = { selectorText?: string; style?: { length: number; [i: number]: string; getPropertyValue(p: string): string }; cssRules?: ArrayLike<CSSRuleLike> }` — recurses into any rule with `cssRules`; nested selectors containing `&` get `&` replaced by the parent selector, nested selectors without `&` are prefixed `parent ` ; rules without `selectorText` (`@media`, `@layer`) pass the parent through. Duck-typed so tests need no DOM.
- `resolveTokens(refs: Iterable<string>, defs: Definitions, known: string[]): string[]` — transitive closure with a visited set, result filtered to `known` and sorted by index in `known`.

- [ ] **Step 1: Write failing tests** in `inspect.test.ts`:
  - `varRefs("0 1px 2px var(--line, var(--ink))")` → `["--line", "--ink"]`
  - `stripStatePseudos(".btn:hover")` → `".btn"`, `stripStatePseudos(".x::placeholder")` → `".x"`, `stripStatePseudos(".a:focus-visible .b")` → `".a .b"`, `stripStatePseudos(":hover")` → `"*"`.
  - `flattenRules` on `[{ cssRules: [{ selectorText: ".bg-surface", style: decl({"background-color": "var(--color-surface)"}), cssRules: [{ selectorText: "&:hover", style: decl({"background-color":"var(--hover)"}) }] }] }]` → rules contain `{selector: ".bg-surface", refs:["--color-surface"]}` and `{selector: ".bg-surface:hover", refs:["--hover"]}`.
  - `flattenRules` on `{ selectorText: ":root", style: decl({"--color-surface":"var(--surface)"}) }` → `defs.get("--color-surface")` equals `["--surface"]`.
  - `resolveTokens(["--color-surface"], defs, ["--page","--surface"])` → `["--surface"]`; cycle `--a↔--b` with `known=["--a"]` → `["--a"]` and terminates; order follows `known`.
  (`decl(obj)` is a small test helper building the `style` duck type.)
- [ ] **Step 2:** `npm test -- inspect` → FAIL (module missing).
- [ ] **Step 3:** Implement the five exports above.
- [ ] **Step 4:** `npm test -- inspect` → PASS.
- [ ] **Step 5:** Commit `feat(preview): resolve design tokens from css rules`.

### Task 2: DOM glue `tokensFor`

**Files:** Modify `preview/app/inspect.ts`

**Interfaces — Produces:**
- `readSheets(doc: Document): { rules: FlatRule[]; defs: Definitions }` — flattens every `doc.styleSheets[i].cssRules` (skip sheets that throw on access).
- `tokensFor(el: Element, data: { rules: FlatRule[]; defs: Definitions }, known: string[]): string[]` — for `el` and `el.querySelectorAll("*")`: refs of every rule whose stripped selector matches (`try { matches } catch { skip }`), plus `varRefs` of inline `style` attributes; resolved via `resolveTokens`. If empty, retry with `el.parentElement` until `stopAt` (the showcase root, passed as optional 4th param `stopAt?: Element`) is passed; return `[]` then.

- [ ] **Step 1:** Implement (no unit test: Vitest runs in `node`; verified in the browser in Task 4).
- [ ] **Step 2:** `npm run typecheck` → no errors.
- [ ] **Step 3:** Commit `feat(preview): find tokens of a showcase element`.

### Task 3: Selection UI

**Files:** Modify `preview/app/App.tsx`, `preview/app/TokenPanel.tsx`

**Interfaces — Consumes:** `readSheets`, `tokensFor` (Task 2). **Produces:** `TokenPanel` props `highlight: { label: string; names: string[] } | null`, `onClearHighlight: () => void`.

- [ ] **Step 1: App.tsx** — state `selection: { el: Element; label: string; names: string[] } | null`. On `<main>`: `onClickCapture` with `e.altKey` → `preventDefault()`, `stopPropagation()`, compute `tokensFor(e.target, readSheets(document), names, mainEl)`; empty → clear, else set. Label = nearest ancestor `section`'s `h2` text + ` · ` + tag name (lower-case) of the clicked element. Alt-hover outline: `mousemove`/`keydown`/`keyup` track Alt and hovered element; outline via a fixed-position overlay `div` (`pointer-events-none`, `outline outline-2 outline-accent`, positioned from `getBoundingClientRect`) for hover (dashed) and selection (solid); update position on scroll/resize. `keydown` Escape → clear. Read sheets on each click (cheap enough, always current after HMR/edits).
- [ ] **Step 2: TokenPanel.tsx** — when `highlight` is set: bar under the header "`{n}` Werte für `{label}`" with a quiet button "Aufheben"; each row in `highlight.names` gets `rounded-control bg-hover-2 ring-1 ring-accent -mx-2 px-2 py-1.5`; `useEffect` on `highlight` scrolls the first highlighted row into view (`scrollIntoView({ block: "start", behavior: "smooth" })` via `data-token` attribute lookup). Hint line in the bar when nothing is selected is not needed; add a one-line hint under the header: "⌥-Klick auf ein Element rechts zeigt seine Werte."
- [ ] **Step 3:** `npm run typecheck && npm test` → green.
- [ ] **Step 4:** Commit `feat(preview): alt-click an element to highlight its tokens`.

### Task 4: Browser check + docs

**Files:** Modify `README.md` (section "Preview"), `ANLEITUNG.md` (paragraph "Selbst ausprobieren: die Vorschau")

- [ ] **Step 1:** `npm run preview`; in the browser ⌥-click: a primary button (expect `--accent…`, radius, shadow tokens), the invalid field (expect `--field`, `--red`, `--accent`, `--radius-control`), the error message (`--red`, `--red-tint`), a card (`--surface`, `--shadow-card`/`--radius-card`), a table cell. Plain click on a button/field still works; Escape clears; dark mode keeps highlight.
- [ ] **Step 2:** README: one sentence on ⌥-click. ANLEITUNG: one German sentence in plain words.
- [ ] **Step 3:** Commit `docs: describe alt-click inspection in the preview`.

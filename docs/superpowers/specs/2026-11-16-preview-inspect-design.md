# Preview: Alt-click an element to highlight its tokens

Short design (small change). Preview only (`preview/`), not part of the package — no release.

## Intent

In the local preview, Olaf wants to see which design values shape an element on the right
(button, chip, field, message, card, table …) without guessing token names. Alt-clicking it
highlights exactly those tokens in the value panel on the left and scrolls to the first one, so
he can change them straight away.

## Behaviour (decided with Olaf)

- **Trigger: Alt/⌥-click** in the showcase. A plain click still operates the element (buttons,
  fields, menu, tables). While ⌥ is held, the element under the pointer gets an outline, showing
  what a click would pick. The Alt-click itself does not reach the element (`preventDefault`,
  `stopPropagation`).
- **Panel: highlight + scroll.** All tokens stay visible; the element's tokens get an accent
  border and tint, and the panel scrolls to the first one in panel order. A bar at the top of
  the panel reads "N Werte für <element> · Aufheben".
- The selected element keeps an outline on the right.
- **Clear:** Escape, a click on the "Aufheben" link, or an Alt-click on empty space
  (an element without tokens of its own or of its ancestors).
- Works in light and dark mode: the set of tokens doesn't depend on the mode; the highlight
  stays when the mode is switched.

## Approaches

1. **Read CSS rules at runtime (picked).** Walk `document.styleSheets` (recursing into
   `@layer`, `@media`, `@supports` and nested rules). For every style rule whose selector matches
   the element or one of its descendants, collect the `var(--…)` references from its
   declarations, and from inline `style` attributes. Resolve chains through custom-property
   definitions (`--color-surface: var(--surface)`, shadow tokens that reference colours) and keep
   only names the panel lists. State pseudo-classes (`:hover`, `:focus-visible`, `:active`,
   `:disabled`, `:checked` …) and pseudo-elements are stripped before matching, so hover and
   focus colours count too. Stays correct when classes or components change.
2. **Match `getComputedStyle` values against token values.** Rejected: many tokens share a value
   (`--surface` = `--field` = white), so results would be ambiguous.
3. **`data-tokens` attributes by hand in the showcase.** Rejected: maintenance, and silently
   wrong once classes change.

## Scope of an element

The clicked element plus all its descendants. If that yields nothing (e.g. a bare text node
parent without classes), walk up to the nearest ancestor that yields tokens.

## Structure

- `preview/app/inspect.ts` — pure logic, unit-tested with Vitest:
  - `varRefs(value)` — names referenced by `var(--x, …)`, including nested fallbacks.
  - `stripStatePseudos(selector)` — selector without state pseudo-classes / pseudo-elements.
  - `resolveTokens(refs, definitions, known)` — transitive closure over custom-property
    definitions, filtered to `known` (panel names), in panel order.
  - `collectRules(sheets)` — flattens CSS rules into `{selector, declarations}` plus a map of
    custom-property definitions.
  - `tokensFor(element, rules, definitions, known)` — glues it together (DOM matching).
- `App.tsx` — selection state, Alt-click / Alt-hover / Escape listeners on the showcase.
- `TokenPanel.tsx` — highlight style, scroll-into-view, top bar with "Aufheben".

## Left to the builder

Exact highlight styling (package tokens only), the element label (e.g. its section title plus
the tag/role), and the test cases.

## Docs

README section "Preview" and the paragraph "Selbst ausprobieren: die Vorschau" in `ANLEITUNG.md`.

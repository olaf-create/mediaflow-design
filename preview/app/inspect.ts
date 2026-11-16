/** Pure token-resolution logic for the preview's Alt-click inspector (no DOM). */

/** All `--name`s used in `var(...)`, fallbacks included, de-duplicated in order of appearance. */
export function varRefs(value: string): string[] {
  const out = new Set<string>();
  for (const m of value.matchAll(/var\(\s*(--[\w-]+)/g)) out.add(m[1]);
  return [...out];
}

const STATE_PSEUDOS = new Set([
  "hover",
  "focus",
  "focus-visible",
  "focus-within",
  "active",
  "visited",
  "disabled",
  "enabled",
  "checked",
  "placeholder-shown",
]);
const FUNCTIONAL = new Set(["not", "is", "where", "has"]);

/** Split on a separator predicate at bracket/paren depth 0, honouring backslash escapes and quotes. */
function splitTop(s: string, isSep: (ch: string) => boolean): { text: string; sep: boolean }[] {
  const parts: { text: string; sep: boolean }[] = [];
  let cur = "";
  let curSep = false;
  let depth = 0;
  let quote = "";
  const push = () => {
    if (cur) parts.push({ text: cur, sep: curSep });
    cur = "";
  };
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "\\") {
      if (curSep) (push(), (curSep = false));
      cur += ch + (s[i + 1] ?? "");
      i++;
      continue;
    }
    if (quote) {
      cur += ch;
      if (ch === quote) quote = "";
      continue;
    }
    if (ch === '"' || ch === "'") quote = ch;
    else if (ch === "(" || ch === "[") depth++;
    else if (ch === ")" || ch === "]") depth--;
    const sep = depth === 0 && !quote && isSep(ch);
    if (sep !== curSep) {
      push();
      curSep = sep;
    }
    cur += ch;
  }
  push();
  return parts;
}

function splitList(s: string): string[] {
  const items: string[] = [];
  let cur = "";
  for (const p of splitTop(s, (c) => c === ",")) {
    if (p.sep) {
      items.push(cur);
      cur = "";
    } else cur += p.text;
  }
  items.push(cur);
  return items;
}

/** Strip state pseudos from one compound selector; "" when nothing is left. */
function stripCompound(c: string): string {
  let out = "";
  let i = 0;
  while (i < c.length) {
    const ch = c[i];
    if (ch === "\\") {
      out += ch + (c[i + 1] ?? "");
      i += 2;
      continue;
    }
    if (ch === "[") {
      let depth = 0;
      let quote = "";
      let j = i;
      for (; j < c.length; j++) {
        const x = c[j];
        if (x === "\\") j++;
        else if (quote) {
          if (x === quote) quote = "";
        } else if (x === '"' || x === "'") quote = x;
        else if (x === "[") depth++;
        else if (x === "]" && --depth === 0) break;
      }
      out += c.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    if (ch !== ":") {
      out += ch;
      i++;
      continue;
    }
    const isElement = c[i + 1] === ":";
    let j = i + (isElement ? 2 : 1);
    let name = "";
    while (j < c.length && /[\w-]|\\/.test(c[j])) {
      if (c[j] === "\\") {
        name += c[j] + (c[j + 1] ?? "");
        j += 2;
      } else name += c[j++];
    }
    let args: string | null = null;
    if (c[j] === "(") {
      let depth = 0;
      let k = j;
      for (; k < c.length; k++) {
        if (c[k] === "\\") k++;
        else if (c[k] === "(") depth++;
        else if (c[k] === ")" && --depth === 0) break;
      }
      args = c.slice(j + 1, k);
      j = k + 1;
    }
    const lower = name.toLowerCase();
    if (isElement || STATE_PSEUDOS.has(lower)) {
      // dropped
    } else if (args !== null && FUNCTIONAL.has(lower)) {
      const inner = splitList(args)
        .map(stripComplex)
        .filter((x) => x !== "")
        .join(", ");
      if (inner) out += `:${name}(${inner})`;
    } else out += c.slice(i, j);
    i = j;
  }
  return out;
}

/** Strip a complex selector (compounds + combinators); "" when every compound vanished. */
function stripComplex(sel: string): string {
  const parts = splitTop(sel.trim(), (c) => /[\s>+~]/.test(c));
  const stripped = parts.map((p) => (p.sep ? p : { text: stripCompound(p.text), sep: false }));
  if (stripped.every((p) => p.sep || p.text === "")) return "";
  return stripped.map((p) => (p.sep || p.text !== "" ? p.text : "*")).join("");
}

/**
 * Remove state pseudo-classes (`:hover`, `:focus-visible`, …) and all pseudo-elements, so the
 * selector can be matched against the element in its resting state. Never returns "".
 */
export function stripStatePseudos(selector: string): string {
  return splitList(selector)
    .map((item) => stripComplex(item) || "*")
    .join(", ");
}

export type CSSRuleLike = {
  selectorText?: string;
  style?: { length: number; [i: number]: string; getPropertyValue(p: string): string; cssText?: string };
  cssRules?: ArrayLike<CSSRuleLike>;
};
/** `defs`: custom properties declared by this (non-root) rule itself, scoped to elements it matches. */
export type FlatRule = { selector: string; refs: string[]; defs?: Definitions };
export type Definitions = Map<string, string[]>;

const ROOT_ITEM = /^(:root|html|:host|\.dark|:root\.dark|html\.dark|:root:not\(\.dark\)|\*)$/;
const isRootLevel = (selector: string) => splitList(stripStatePseudos(selector)).every((i) => ROOT_ITEM.test(i.trim()));

const hasTopLevelComma = (s: string) => splitList(s).length > 1;
const hasAmp = (s: string) => splitTop(s, (c) => c === "&").some((p) => p.sep);

/** Resolve a nested selector (CSS nesting) against its parent. */
function nest(parent: string | undefined, child: string): string {
  if (!parent) return child;
  const p = hasTopLevelComma(parent) ? `:is(${parent})` : parent;
  return splitList(child)
    .map((part) => {
      const t = part.trim();
      if (!hasAmp(t)) return `${p} ${t}`;
      return splitTop(t, (c) => c === "&")
        .map((x) => (x.sep ? p : x.text))
        .join("");
    })
    .join(", ");
}

/**
 * Flatten a (possibly nested) rule list into `selector → var() refs` rules plus a map of
 * custom-property definitions. Rules without selectorText (@media, @layer, nested declarations)
 * pass the parent selector through.
 */
export function flattenRules(
  rules: ArrayLike<CSSRuleLike>,
  parent?: string,
): { rules: FlatRule[]; defs: Definitions } {
  const out: FlatRule[] = [];
  const defs: Definitions = new Map();
  const walk = (list: ArrayLike<CSSRuleLike>, par: string | undefined) => {
    for (let i = 0; i < list.length; i++) {
      const rule = list[i];
      const selector = rule.selectorText ? nest(par, rule.selectorText) : par;
      if (rule.style) {
        const refs = new Set<string>();
        const root = !selector || isRootLevel(selector);
        const ruleDefs: Definitions = new Map();
        for (let j = 0; j < rule.style.length; j++) {
          const name = rule.style[j];
          if (!name.startsWith("--")) continue;
          const target = root ? defs : ruleDefs;
          const set = new Set(target.get(name) ?? []);
          varRefs(rule.style.getPropertyValue(name)).forEach((r) => set.add(r));
          target.set(name, [...set]);
        }
        if (rule.style.cssText !== undefined) {
          // Shorthands with var() are exposed as longhands with "" values in Chromium, so read cssText.
          for (const d of splitTop(rule.style.cssText, (c) => c === ";")) {
            if (d.sep) continue;
            const text = d.text.trim();
            if (text.startsWith("--")) continue;
            varRefs(text).forEach((r) => refs.add(r));
          }
        } else {
          for (let j = 0; j < rule.style.length; j++) {
            const name = rule.style[j];
            if (!name.startsWith("--")) varRefs(rule.style.getPropertyValue(name)).forEach((r) => refs.add(r));
          }
        }
        if (selector && (refs.size || ruleDefs.size)) {
          out.push(ruleDefs.size ? { selector, refs: [...refs], defs: ruleDefs } : { selector, refs: [...refs] });
        }
      }
      if (rule.cssRules) walk(rule.cssRules, selector);
    }
  };
  walk(rules, parent);
  return { rules: out, defs };
}

/** Transitive closure of `refs` through `defs`, filtered to `known` and ordered like `known`. */
export function resolveTokens(refs: Iterable<string>, defs: Definitions, known: string[]): string[] {
  const seen = new Set<string>();
  const stack = [...refs];
  while (stack.length) {
    const n = stack.pop()!;
    if (seen.has(n)) continue;
    seen.add(n);
    stack.push(...(defs.get(n) ?? []));
  }
  return known.filter((k) => seen.has(k));
}

/**
 * Tokens for a set of matched rules: global (root-level) defs merged with the matched rules' own
 * scoped defs. Rules whose resting-state selector is only `*` (::selection, :focus-visible, …) are
 * global base styles and ignored.
 */
export function tokensForRules(matched: FlatRule[], globalDefs: Definitions, known: string[]): string[] {
  const defs: Definitions = new Map([...globalDefs].map(([k, v]) => [k, [...v]]));
  const refs = new Set<string>();
  for (const r of matched) {
    if (splitList(stripStatePseudos(r.selector)).every((i) => i.trim() === "*")) continue;
    r.refs.forEach((x) => refs.add(x));
    for (const [name, rs] of r.defs ?? []) defs.set(name, [...new Set([...(defs.get(name) ?? []), ...rs])]);
  }
  return resolveTokens(refs, defs, known);
}

/** Flatten every readable stylesheet of `doc`; sheets that throw on access (cross-origin) are skipped. */
export function readSheets(doc: Document): { rules: FlatRule[]; defs: Definitions } {
  const rules: FlatRule[] = [];
  const defs: Definitions = new Map();
  for (const sheet of Array.from(doc.styleSheets)) {
    let list: CSSRuleList;
    try {
      list = sheet.cssRules;
    } catch {
      continue;
    }
    const flat = flattenRules(list as unknown as ArrayLike<CSSRuleLike>);
    rules.push(...flat.rules);
    for (const [name, refs] of flat.defs) defs.set(name, [...new Set([...(defs.get(name) ?? []), ...refs])]);
  }
  return { rules, defs };
}

/**
 * Radius tokens named by Tailwind classes (`rounded-control`, `md:rounded-t-card`, …). Tailwind emits
 * plain pixel values for these, so they cannot be found through `var()`. Unknown names such as
 * `full` are returned too and dropped later by `known`.
 */
export function radiusTokens(classNames: Iterable<string>): string[] {
  const out = new Set<string>();
  for (const c of classNames) {
    const m = /^(?:[^:]+:)*!?rounded(?:-(?:t|r|b|l|s|e|tl|tr|bl|br|ss|se|ee|es))?-([a-z][\w-]*)$/.exec(c);
    if (m) out.add(`--radius-${m[1]}`);
  }
  return [...out];
}

/**
 * Tokens used by `el` and its descendants (rules whose resting-state selector matches, plus inline
 * styles and radius classes). When nothing is found, walks up through parents until `stopAt` has
 * been tried. Returns the element whose scope produced the tokens, or null.
 */
export function tokensFor(
  el: Element,
  data: { rules: FlatRule[]; defs: Definitions },
  known: string[],
  stopAt?: Element,
): { el: Element; names: string[] } | null {
  const stripped = data.rules.map((r) => ({ selector: stripStatePseudos(r.selector), rule: r }));
  const collect = (root: Element): string[] => {
    const nodes = [root, ...Array.from(root.querySelectorAll("*"))];
    const matched: FlatRule[] = [];
    for (const { selector, rule } of stripped) {
      for (const n of nodes) {
        try {
          if (n.matches(selector)) {
            matched.push(rule);
            break;
          }
        } catch {
          break;
        }
      }
    }
    const inline = new Set<string>();
    for (const n of nodes) varRefs(n.getAttribute("style") ?? "").forEach((r) => inline.add(r));
    if (inline.size) matched.push({ selector: "[style]", refs: [...inline] });
    const radii = radiusTokens(nodes.flatMap((n) => Array.from(n.classList)));
    if (radii.length) matched.push({ selector: "[class]", refs: radii });
    return tokensForRules(matched, data.defs, known);
  };
  let cur: Element | null = el;
  while (cur) {
    const names = collect(cur);
    if (names.length) return { el: cur, names };
    if (cur === stopAt) break;
    cur = cur.parentElement;
  }
  return null;
}

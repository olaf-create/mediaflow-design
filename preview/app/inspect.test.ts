import { expect, test } from "vitest";
import { flattenRules, radiusTokens, resolveTokens, tokensForRules, stripStatePseudos, varRefs, type CSSRuleLike } from "./inspect";

function decl(obj: Record<string, string>): NonNullable<CSSRuleLike["style"]> {
  const names = Object.keys(obj);
  const cssText = names.map((n) => `${n}: ${obj[n]};`).join(" ");
  const style: any = { length: names.length, getPropertyValue: (p: string) => obj[p] ?? "", cssText };
  names.forEach((n, i) => (style[i] = n));
  return style;
}

test("varRefs finds names incl. fallbacks, de-duplicated", () => {
  expect(varRefs("0 1px 2px var(--line, var(--ink))")).toEqual(["--line", "--ink"]);
  expect(varRefs("var(--a) var(--a) var( --b )")).toEqual(["--a", "--b"]);
  expect(varRefs("red")).toEqual([]);
});

test("stripStatePseudos removes states and pseudo-elements", () => {
  expect(stripStatePseudos(".btn:hover")).toBe(".btn");
  expect(stripStatePseudos(".x::placeholder")).toBe(".x");
  expect(stripStatePseudos(".a:focus-visible .b")).toBe(".a .b");
  expect(stripStatePseudos(":hover")).toBe("*");
  expect(stripStatePseudos(".a:focus-within:active:visited:disabled:enabled:checked:placeholder-shown")).toBe(".a");
  expect(stripStatePseudos(".a::before")).toBe(".a");
});

test("stripStatePseudos keeps other pseudos and escapes", () => {
  expect(stripStatePseudos(".hover\\:bg-hover:hover")).toBe(".hover\\:bg-hover");
  expect(stripStatePseudos(".a:first-child:hover")).toBe(".a:first-child");
  expect(stripStatePseudos("li:nth-child(2n+1)")).toBe("li:nth-child(2n+1)");
  expect(stripStatePseudos("input[type='a:b']:focus")).toBe("input[type='a:b']");
});

test("stripStatePseudos handles functional pseudos", () => {
  expect(stripStatePseudos(".a:not(:hover)")).toBe(".a");
  expect(stripStatePseudos(".a:is(:hover, .b)")).toBe(".a:is(.b)");
  expect(stripStatePseudos(".a:where(.b:focus)")).toBe(".a:where(.b)");
  expect(stripStatePseudos(".a:not(.b)")).toBe(".a:not(.b)");
  expect(stripStatePseudos(":is(:hover)")).toBe("*");
});

test("stripStatePseudos uses * for empty compounds and handles lists", () => {
  expect(stripStatePseudos(".a > :hover")).toBe(".a > *");
  expect(stripStatePseudos(":hover .b")).toBe("* .b");
  expect(stripStatePseudos(".a:hover, .b:focus")).toBe(".a, .b");
  expect(stripStatePseudos(".a:hover, :active")).toBe(".a, *");
});

test("flattenRules resolves nesting with &", () => {
  const { rules } = flattenRules([
    {
      cssRules: [
        {
          selectorText: ".bg-surface",
          style: decl({ "background-color": "var(--color-surface)" }),
          cssRules: [{ selectorText: "&:hover", style: decl({ "background-color": "var(--hover)" }) }],
        },
      ],
    },
  ]);
  expect(rules).toContainEqual({ selector: ".bg-surface", refs: ["--color-surface"] });
  expect(rules).toContainEqual({ selector: ".bg-surface:hover", refs: ["--hover"] });
});

test("flattenRules prefixes nested selectors without &, wraps selector lists", () => {
  const { rules } = flattenRules([
    {
      selectorText: ".a, .b",
      style: decl({ color: "var(--x)" }),
      cssRules: [
        { selectorText: "&:hover", style: decl({ color: "var(--y)" }) },
        { selectorText: ".c", style: decl({ color: "var(--z)" }) },
      ],
    },
    {
      selectorText: ".p",
      style: decl({}),
      cssRules: [{ selectorText: ".child", style: decl({ color: "var(--w)" }) }],
    },
  ]);
  expect(rules).toContainEqual({ selector: ".a, .b", refs: ["--x"] });
  expect(rules).toContainEqual({ selector: ":is(.a, .b):hover", refs: ["--y"] });
  expect(rules).toContainEqual({ selector: ":is(.a, .b) .c", refs: ["--z"] });
  expect(rules).toContainEqual({ selector: ".p .child", refs: ["--w"] });
  expect(rules.some((r) => r.selector === ".p")).toBe(false);
});

test("flattenRules passes through @media/@layer, incl. @media inside &:hover (tailwind 4)", () => {
  const { rules } = flattenRules([
    {
      cssRules: [
        {
          cssRules: [
            {
              selectorText: ".hover\\:bg-hover",
              cssRules: [
                {
                  selectorText: "&:hover",
                  cssRules: [
                    // @media (hover: hover) { background-color: var(--hover) }
                    { cssRules: [{ style: decl({ "background-color": "var(--hover)" }) }] },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ]);
  expect(rules).toContainEqual({ selector: ".hover\\:bg-hover:hover", refs: ["--hover"] });
});

test("flattenRules collects custom property definitions", () => {
  const { defs, rules } = flattenRules([
    { selectorText: ":root", style: decl({ "--color-surface": "var(--surface)" }) },
    { selectorText: ".dark", style: decl({ "--color-surface": "var(--surface-dark)", "--solo": "#fff" }) },
  ]);
  expect(defs.get("--color-surface")).toEqual(["--surface", "--surface-dark"]);
  expect(defs.get("--solo") ?? []).toEqual([]);
  expect(rules.some((r) => r.selector === ":root")).toBe(false);
});

test("a rule can contribute both defs and rules", () => {
  const { defs, rules } = flattenRules([
    { selectorText: ".x", style: decl({ "--c": "var(--a)", color: "var(--b)" }) },
  ]);
  expect(defs.has("--c")).toBe(false); // non-root: scoped to the rule
  expect(rules).toContainEqual({ selector: ".x", refs: ["--b"], defs: new Map([["--c", ["--a"]]]) });
});

test("resolveTokens follows chains, filters to known, sorts by known order", () => {
  const defs = new Map([["--color-surface", ["--surface"]]]);
  expect(resolveTokens(["--color-surface"], defs, ["--page", "--surface"])).toEqual(["--surface"]);
  const defs2 = new Map([["--x", ["--surface", "--page"]]]);
  expect(resolveTokens(["--x"], defs2, ["--page", "--surface"])).toEqual(["--page", "--surface"]);
});

test("resolveTokens terminates on cycles", () => {
  const defs = new Map([
    ["--a", ["--b"]],
    ["--b", ["--a"]],
  ]);
  expect(resolveTokens(["--a"], defs, ["--a"])).toEqual(["--a"]);
});

test("flattenRules reads refs from cssText when shorthand longhands report empty values (Chromium)", () => {
  const style: any = {
    length: 3,
    0: "border-top-width",
    1: "border-top-style",
    2: "--c",
    getPropertyValue: (p: string) => (p === "--c" ? "var(--def)" : ""),
    cssText: "border: 1px solid var(--line); --c: var(--def);",
  };
  const { rules, defs } = flattenRules([{ selectorText: ".b", style }]);
  expect(rules).toEqual([{ selector: ".b", refs: ["--line"], defs: new Map([["--c", ["--def"]]]) }]);
  expect(defs.size).toBe(0);
});

test("root-level detection: :root, html, :host, *, .dark variants feed global defs", () => {
  const { defs } = flattenRules([
    { selectorText: ":root, :host", style: decl({ "--a": "var(--x)" }) },
    { selectorText: "html.dark", style: decl({ "--b": "var(--y)" }) },
    { selectorText: ":root.dark", style: decl({ "--c": "var(--z)" }) },
    { selectorText: "*", style: decl({ "--d": "var(--w)" }) },
    { selectorText: ".card", style: decl({ "--e": "var(--v)" }) },
  ]);
  expect([...defs.keys()].sort()).toEqual(["--a", "--b", "--c", "--d"]);
});

const tw = flattenRules([
  { selectorText: ":root", style: decl({ "--color-surface": "var(--surface)" }) },
  { selectorText: ".shadow-card", style: decl({ "--tw-shadow": "0 1px var(--line)", "box-shadow": "var(--tw-shadow)" }) },
  { selectorText: ".shadow-btn", style: decl({ "--tw-shadow": "0 1px var(--accent)", "box-shadow": "var(--tw-shadow)" }) },
]);

test("custom properties declared in utilities are scoped to their rule", () => {
  expect([...tw.defs.keys()]).toEqual(["--color-surface"]);
  const card = tw.rules.find((r) => r.selector === ".shadow-card")!;
  expect(card.refs).toEqual(["--tw-shadow"]);
  expect(card.defs).toEqual(new Map([["--tw-shadow", ["--line"]]]));
});

test("tokensForRules merges global defs with matched rules' own defs only", () => {
  const card = tw.rules.find((r) => r.selector === ".shadow-card")!;
  const known = ["--accent", "--line", "--surface"];
  expect(tokensForRules([card], tw.defs, known)).toEqual(["--line"]);
  expect(tokensForRules([card], tw.defs, known)).not.toContain("--accent");
});

test("tokensForRules ignores rules whose selector reduces to * (global base styles)", () => {
  const rules = [
    { selector: "::selection", refs: ["--accent"] },
    { selector: ":focus-visible, ::placeholder", refs: ["--accent-tint"] },
    { selector: "*", refs: ["--line"] },
    { selector: ".a", refs: ["--surface"] },
  ];
  expect(tokensForRules(rules, new Map(), ["--accent", "--accent-tint", "--line", "--surface"])).toEqual(["--surface"]);
});

test("radiusTokens maps rounded classes (variants, sides) to radius tokens", () => {
  {
    expect(radiusTokens(["rounded-control", "md:rounded-t-card", "rounded-full", "rounded", "p-2"])).toEqual([
      "--radius-control",
      "--radius-card",
      "--radius-full",
    ]);
  }
});

test("root-level detection: the preview's light-mode override selector :root:not(.dark) feeds global defs", () => {
  const { defs } = flattenRules([{ selectorText: ":root:not(.dark)", style: decl({ "--shadow-card": "0 1px var(--accent)" }) }]);
  expect(defs.get("--shadow-card")).toEqual(["--accent"]);
});

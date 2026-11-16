import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "vitest";
import { applyEdits, parseBlocks, validateEdit, type TokenEdit } from "./brand-css";

const css = (p: string) => readFileSync(resolve(__dirname, "../../css", p), "utf8");
const brand = css("brand.css");
const foundation = css("beautifui/foundation.css");

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
  expect(parseBlocks(brand).root.find((x) => x.name === "--shadow-inset-field")!.value).toBe(
    "inset 0 0 0 1px var(--line-strong), inset 0 1px 2px rgb(28 28 27 / 0.06)",
  );
});

test("multi-line value in foundation dark", () => {
  expect(parseBlocks(foundation).dark.find((x) => x.name === "--shadow-card")!.value).toBe(
    "0 0 0 1px oklch(1 0 0 / 0.11), 0 1px 2px oklch(0 0 0 / 0.2), 0 2px 6px oklch(0 0 0 / 0.2)",
  );
});

test("theme block of foundation has radii", () => {
  expect(parseBlocks(foundation).theme.find((x) => x.name === "--radius-card")!.value).toBe("10px");
});

test("theme block of brand", () => {
  expect(parseBlocks(brand).theme.find((x) => x.name === "--color-tone-blue")!.value).toBe("var(--tone-blue)");
});

const edit = (block: TokenEdit["block"], name: string, value: string): TokenEdit[] => [{ block, name, value }];

test("replaces value and marks manual comment", () => {
  const { css, changed } = applyEdits(brand, foundation, edit("root", "--ink-3", "#7a7874"));
  expect(changed).toBe(1);
  expect(css).toContain("--ink-3: #7a7874; /* [derived] was grey-500 #82807c */");
  expect(css).toContain("--ink-3: #82807c; /* grey-500 */"); // .dark line untouched
});

test("keeps existing [derived] comment", () => {
  const { css } = applyEdits(brand, foundation, edit("root", "--canvas", "#eeeeee"));
  expect(css).toContain("--canvas: #eeeeee; /* [derived] */");
});

test("line without comment", () => {
  const { css } = applyEdits(brand, foundation, edit("root", "--surface", "#fffefc"));
  expect(css).toContain("--surface: #fffefc; /* [derived] was #ffffff */");
});

test("exact name: --tone-blue does not touch -tint, -ink or --color-tone-blue", () => {
  const { css } = applyEdits(brand, foundation, edit("root", "--tone-blue", "#1166dd"));
  expect(css).toMatch(
    /--tone-blue: #1166dd;\s+--tone-blue-tint: #dcebfc;\s+--tone-blue-ink: #094b90;.*\/\* \[derived\] --tone-blue was #0e73dc \*\//,
  );
  expect(css).toContain("--color-tone-blue: var(--tone-blue);");
});

test("grundregel: light tone edit keeps old dark value", () => {
  const { css } = applyEdits(brand, foundation, edit("root", "--tone-blue", "#1166dd"));
  expect(parseBlocks(css).dark.find((d) => d.name === "--tone-blue")).toMatchObject({
    value: "#0e73dc",
    comment: "[derived] kept dark value",
  });
});

test("grundregel: shadow override keeps foundation dark value (multi-line)", () => {
  const { css } = applyEdits(brand, foundation, edit("root", "--shadow-card", "0 0 0 1px var(--line)"));
  const b = parseBlocks(css);
  expect(b.root.find((d) => d.name === "--shadow-card")).toMatchObject({
    value: "0 0 0 1px var(--line)",
    comment: "[derived] set in preview",
  });
  expect(b.dark.find((d) => d.name === "--shadow-card")!.value).toBe(
    "0 0 0 1px oklch(1 0 0 / 0.11), 0 1px 2px oklch(0 0 0 / 0.2), 0 2px 6px oklch(0 0 0 / 0.2)",
  );
});

test("radius goes into @theme inline", () => {
  const { css } = applyEdits(brand, foundation, edit("theme", "--radius-card", "12px"));
  expect(parseBlocks(css).theme.find((d) => d.name === "--radius-card")!.value).toBe("12px");
  expect(parseBlocks(css).dark.some((d) => d.name === "--radius-card")).toBe(false);
});

test("dark edit only touches .dark", () => {
  const { css } = applyEdits(brand, foundation, edit("dark", "--page", "#181818"));
  expect(parseBlocks(css).root.find((d) => d.name === "--page")!.value).toBe("#f7f4f1");
  expect(parseBlocks(css).dark.find((d) => d.name === "--page")!.value).toBe("#181818");
});

test("dark edit of an inherited token adds it to .dark", () => {
  const { css } = applyEdits(brand, foundation, edit("dark", "--tone-blue", "#3388ee"));
  expect(parseBlocks(css).dark.find((d) => d.name === "--tone-blue")).toMatchObject({
    value: "#3388ee",
    comment: "[derived] set in preview",
  });
  expect(parseBlocks(css).root.find((d) => d.name === "--tone-blue")!.value).toBe("#0e73dc");
});

test("repeated save does not stack comments or dark lines", () => {
  const once = applyEdits(brand, foundation, edit("root", "--tone-blue", "#1166dd")).css;
  const twice = applyEdits(once, foundation, edit("root", "--tone-blue", "#1055cc")).css;
  expect(twice.match(/\[derived\] --tone-blue was/g)).toHaveLength(1);
  expect(parseBlocks(twice).dark.filter((d) => d.name === "--tone-blue")).toHaveLength(1);
  const s1 = applyEdits(brand, foundation, edit("root", "--ink-3", "#7a7874")).css;
  const s2 = applyEdits(s1, foundation, edit("root", "--ink-3", "#77756f")).css;
  expect(s2).toContain("--ink-3: #77756f; /* [derived] was grey-500 #82807c */");
});

test("unchanged value is a no-op", () => {
  expect(applyEdits(brand, foundation, edit("root", "--ink", "#1c1c1b"))).toEqual({ css: brand, changed: 0 });
});

test("all other lines stay byte-identical", () => {
  const { css } = applyEdits(brand, foundation, edit("root", "--ink-3", "#7a7874"));
  const after = css.split("\n");
  const diff = brand.split("\n").filter((l, i) => l !== after[i]);
  expect(after).toHaveLength(brand.split("\n").length);
  expect(diff).toEqual(["  --ink-3: #82807c; /* grey-500 */"]);
});

test("several edits in one save", () => {
  const { css, changed } = applyEdits(brand, foundation, [
    { block: "root", name: "--ink-3", value: "#7a7874" },
    { block: "dark", name: "--page", value: "#181818" },
    { block: "theme", name: "--radius-chip", value: "4px" },
  ]);
  expect(changed).toBe(3);
  const b = parseBlocks(css);
  expect(b.root.find((d) => d.name === "--ink-3")!.value).toBe("#7a7874");
  expect(b.dark.find((d) => d.name === "--page")!.value).toBe("#181818");
  expect(b.theme.find((d) => d.name === "--radius-chip")!.value).toBe("4px");
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

test("applyEdits throws on an invalid edit", () => {
  expect(() => applyEdits(brand, foundation, edit("root", "--ink", "red;}"))).toThrow();
});

test.each([["rgb(1 2 3"], ["a)"], [")("], ['"x'], ["'x"], ["red\\"], ["[a"]])("rejects unbalanced value %j", (v) => {
  expect(validateEdit({ block: "root", name: "--page", value: v })).not.toBeNull();
});

test("accepts balanced functions and quotes", () => {
  expect(validateEdit({ block: "root", name: "--x", value: 'rgb(1 2 3 / 0.5), "Inter", var(--a)' })).toBeNull();
});

test.each([["px"], ["abc"], ["-2px"], ["12"]])("rejects bad radius %j", (v) => {
  expect(validateEdit({ block: "theme", name: "--radius-card", value: v })).not.toBeNull();
});

test("accepts radius in px", () => {
  expect(validateEdit({ block: "theme", name: "--radius-card", value: "12px" })).toBeNull();
  expect(validateEdit({ block: "theme", name: "--radius-card", value: "0px" })).toBeNull();
});

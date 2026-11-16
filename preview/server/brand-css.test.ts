import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "vitest";
import { parseBlocks } from "./brand-css";

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

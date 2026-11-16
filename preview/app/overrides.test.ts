import { expect, test } from "vitest";
import { buildOverrideCss } from "./overrides";

test("light edits only apply outside dark mode", () => {
  expect(buildOverrideCss({ root: { "--ink": "#111" }, dark: {}, theme: {} })).toBe(":root:not(.dark){--ink:#111;}");
});

test("dark edits only apply in dark mode", () => {
  expect(buildOverrideCss({ root: {}, dark: { "--page": "#181818" }, theme: {} })).toBe(":root.dark{--page:#181818;}");
});

test("radius edits set the variable and the baked utility class", () => {
  expect(buildOverrideCss({ root: {}, dark: {}, theme: { "--radius-card": "12px" } })).toBe(
    ":root{--radius-card:12px;}.rounded-card{border-radius:12px}",
  );
});

test("no edits, no css", () => {
  expect(buildOverrideCss({ root: {}, dark: {}, theme: {} })).toBe("");
});

test("invalid values are left out of the live css", () => {
  expect(buildOverrideCss({ root: { "--ink": "rgb(1 2", "--page": "#fff" }, dark: { "--x": "red;}" }, theme: { "--radius-card": "px" } })).toBe(
    ":root:not(.dark){--page:#fff;}",
  );
});

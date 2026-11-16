import { expect, test } from "vitest";
import { composite, contrastRatio, formatColor, parseColor, toHex } from "./color";

test("parses hex", () => {
  expect(parseColor("#0e73dc")).toEqual({ r: 14, g: 115, b: 220, a: 1 });
  expect(parseColor("#fff")).toEqual({ r: 255, g: 255, b: 255, a: 1 });
  expect(parseColor("#0e73dc80")!.a).toBeCloseTo(0.502, 2);
});

test("parses rgb forms", () => {
  expect(parseColor("rgb(14 115 220 / 0.22)")).toEqual({ r: 14, g: 115, b: 220, a: 0.22 });
  expect(parseColor("rgb(14 115 220)")).toEqual({ r: 14, g: 115, b: 220, a: 1 });
  expect(parseColor("rgb(14, 115, 220)")).toEqual({ r: 14, g: 115, b: 220, a: 1 });
  expect(parseColor("rgba(14, 115, 220, 0.5)")).toEqual({ r: 14, g: 115, b: 220, a: 0.5 });
});

test("non-colours are null", () => {
  expect(parseColor("var(--line)")).toBeNull();
  expect(parseColor("transparent")).toBeNull();
  expect(parseColor("#zzz")).toBeNull();
  expect(parseColor("oklch(0.5 0.1 200)")).toBeNull();
});

test("formats like brand.css", () => {
  expect(formatColor({ r: 14, g: 115, b: 220, a: 0.22 })).toBe("rgb(14 115 220 / 0.22)");
  expect(formatColor({ r: 14, g: 115, b: 220, a: 1 })).toBe("#0e73dc");
  expect(toHex({ r: 14, g: 115, b: 220, a: 0.22 })).toBe("#0e73dc");
});

test("composite blends over opaque bg", () => {
  expect(composite({ r: 0, g: 0, b: 0, a: 0.5 }, { r: 255, g: 255, b: 255, a: 1 })).toEqual({ r: 128, g: 128, b: 128, a: 1 });
});

test("WCAG contrast", () => {
  expect(contrastRatio(parseColor("#000")!, parseColor("#fff")!)).toBeCloseTo(21, 1);
  expect(contrastRatio(parseColor("#696663")!, parseColor("#ffffff")!)).toBeGreaterThanOrEqual(4.5);
  expect(contrastRatio(parseColor("rgb(0 0 0 / 0)")!, parseColor("#ffffff")!)).toBeCloseTo(1, 2);
});

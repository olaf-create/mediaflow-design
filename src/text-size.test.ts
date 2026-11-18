import { describe, expect, it } from "vitest";
import { readTextSize, writeTextSize, TEXT_SIZE_KEY } from "./text-size";
import { THEME_SCRIPT } from "./theme";

const throwing = () => {
  throw new Error("blocked");
};

function memory(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}

describe("readTextSize", () => {
  it("returns stored levels 1–5", () => {
    expect(readTextSize(memory({ [TEXT_SIZE_KEY]: "1" }))).toBe(1);
    expect(readTextSize(memory({ [TEXT_SIZE_KEY]: "5" }))).toBe(5);
  });
  it("falls back to 2", () => {
    for (const bad of ["0", "6", "2.5", "x"]) expect(readTextSize(memory({ [TEXT_SIZE_KEY]: bad }))).toBe(2);
    expect(readTextSize(memory())).toBe(2);
    expect(readTextSize({ getItem: throwing })).toBe(2);
    expect(readTextSize(null)).toBe(2);
  });
});

describe("writeTextSize", () => {
  it("stores other levels and removes the key for 2", () => {
    const s = memory();
    expect(writeTextSize(4, s)).toBe(true);
    expect(s.data.get(TEXT_SIZE_KEY)).toBe("4");
    expect(writeTextSize(2, s)).toBe(true);
    expect(s.data.has(TEXT_SIZE_KEY)).toBe(false);
  });
  it("rejects invalid levels and blocked storage", () => {
    expect(writeTextSize(6, memory())).toBe(false);
    expect(writeTextSize(3, null)).toBe(false);
    expect(writeTextSize(3, { setItem: throwing, removeItem: throwing })).toBe(false);
  });
  it("uses the key THEME_SCRIPT reads", () => {
    expect(THEME_SCRIPT).toContain(`g("${TEXT_SIZE_KEY}")`);
  });
});

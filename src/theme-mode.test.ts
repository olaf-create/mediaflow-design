import { describe, expect, it, vi } from "vitest";
import { readThemeMode, writeThemeMode } from "./theme-mode";

const throwing = () => {
  throw new Error("blocked");
};

describe("readThemeMode", () => {
  it("returns stored light and dark", () => {
    expect(readThemeMode({ getItem: () => "dark" })).toBe("dark");
    expect(readThemeMode({ getItem: () => "light" })).toBe("light");
  });
  it("falls back to system", () => {
    expect(readThemeMode({ getItem: () => null })).toBe("system");
    expect(readThemeMode({ getItem: () => "blue" })).toBe("system");
    expect(readThemeMode({ getItem: throwing })).toBe("system");
    expect(readThemeMode(null)).toBe("system");
  });
});

describe("writeThemeMode", () => {
  it("removes the key for system", () => {
    const storage = { setItem: vi.fn(), removeItem: vi.fn() };
    expect(writeThemeMode("system", storage)).toBe(true);
    expect(storage.removeItem).toHaveBeenCalledWith("theme");
    expect(storage.setItem).not.toHaveBeenCalled();
  });
  it("stores light and dark", () => {
    const storage = { setItem: vi.fn(), removeItem: vi.fn() };
    expect(writeThemeMode("dark", storage)).toBe(true);
    expect(storage.setItem).toHaveBeenCalledWith("theme", "dark");
  });
  it("returns false when storage is unavailable or throws", () => {
    expect(writeThemeMode("dark", null)).toBe(false);
    expect(writeThemeMode("dark", { setItem: throwing, removeItem: throwing })).toBe(false);
    expect(writeThemeMode("system", { setItem: throwing, removeItem: throwing })).toBe(false);
  });
});

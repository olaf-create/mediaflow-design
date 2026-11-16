/** Colour helpers for the token editors and the contrast list. r/g/b 0–255, a 0–1. */
export type RGBA = { r: number; g: number; b: number; a: number };

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const RGB = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*(?:[,/]\s*([\d.]+%?))?\s*\)$/i;

export function parseColor(v: string): RGBA | null {
  const s = v.trim();
  const h = HEX.exec(s);
  if (h) {
    let x = h[1];
    if (x.length === 3) x = [...x].map((c) => c + c).join("");
    const n = (i: number) => parseInt(x.slice(i, i + 2), 16);
    return { r: n(0), g: n(2), b: n(4), a: x.length === 8 ? n(6) / 255 : 1 };
  }
  const m = RGB.exec(s);
  if (m) {
    const a = m[4] === undefined ? 1 : m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]), a };
  }
  return null;
}

const hex2 = (n: number) => Math.round(n).toString(16).padStart(2, "0");

export function toHex(c: RGBA): string {
  return `#${hex2(c.r)}${hex2(c.g)}${hex2(c.b)}`;
}

/** `#rrggbb` when opaque, else `rgb(r g b / a)` — the style used in brand.css. */
export function formatColor(c: RGBA): string {
  if (c.a >= 1) return toHex(c);
  return `rgb(${Math.round(c.r)} ${Math.round(c.g)} ${Math.round(c.b)} / ${Math.round(c.a * 100) / 100})`;
}

/** Alpha-blend fg over an opaque bg. */
export function composite(fg: RGBA, bg: RGBA): RGBA {
  const mix = (f: number, b: number) => Math.round(f * fg.a + b * (1 - fg.a));
  return { r: mix(fg.r, bg.r), g: mix(fg.g, bg.g), b: mix(fg.b, bg.b), a: 1 };
}

function luminance(c: RGBA): number {
  const lin = (v: number) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
}

/** WCAG 2.x contrast ratio; fg is composited over bg first. */
export function contrastRatio(fg: RGBA, bg: RGBA): number {
  const [a, b] = [luminance(composite(fg, bg)), luminance(bg)];
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

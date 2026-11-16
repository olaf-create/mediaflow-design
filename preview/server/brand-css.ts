/* Parse and rewrite the token blocks of css/brand.css (and read css/beautifui/foundation.css).
 * Pure functions, no Node imports: the browser bundle imports the types from here. */

export type Block = "root" | "dark" | "theme";
export type Decl = { block: Block; name: string; value: string; comment: string | null };
export type Blocks = Record<Block, Decl[]>;
export type TokenEdit = { block: Block; name: string; value: string };

/** A declaration with its source offsets (end = index of the closing `;`). */
type Located = Decl & { valueStart: number; valueEnd: number; comment: string | null; commentEnd: number | null; lineEnd: number };
type Region = { block: Block; open: number; close: number; decls: Located[] };

const SELECTORS: Record<string, Block> = { ":root": "root", ".dark": "dark", "@theme inline": "theme" };

function skipComment(css: string, i: number): number {
  const end = css.indexOf("*/", i + 2);
  return end < 0 ? css.length : end + 2;
}

function lineEndAt(css: string, i: number): number {
  const n = css.indexOf("\n", i);
  return n < 0 ? css.length : n;
}

/** Find the first top-level `:root`, `.dark` and `@theme inline` blocks and their declarations. */
function scan(css: string): Region[] {
  const regions: Region[] = [];
  const seen = new Set<Block>();
  let depth = 0;
  let selStart = 0;
  for (let i = 0; i < css.length; i++) {
    if (css.startsWith("/*", i)) {
      i = skipComment(css, i) - 1;
      continue;
    }
    const c = css[i];
    if (c === "{") {
      if (depth === 0) {
        const selector = css.slice(selStart, i).replace(/\/\*[\s\S]*?\*\//g, "").trim();
        const block = SELECTORS[selector];
        if (block && !seen.has(block)) {
          seen.add(block);
          const close = matchingBrace(css, i);
          regions.push({ block, open: i, close, decls: declarations(css, block, i + 1, close) });
          i = close;
          selStart = close + 1;
          continue;
        }
      }
      depth++;
    } else if (c === "}") {
      depth--;
      if (depth === 0) selStart = i + 1;
    } else if (c === ";" && depth === 0) {
      selStart = i + 1;
    }
  }
  return regions;
}

function matchingBrace(css: string, open: number): number {
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css.startsWith("/*", i)) {
      i = skipComment(css, i) - 1;
      continue;
    }
    if (css[i] === "{") depth++;
    else if (css[i] === "}" && --depth === 0) return i;
  }
  return css.length;
}

function declarations(css: string, block: Block, start: number, end: number): Located[] {
  const out: Located[] = [];
  let i = start;
  while (i < end) {
    if (css.startsWith("/*", i)) {
      i = skipComment(css, i);
      continue;
    }
    if (/\s/.test(css[i])) {
      i++;
      continue;
    }
    const colon = css.indexOf(":", i);
    const name = css.slice(i, colon).trim();
    let j = colon + 1;
    let paren = 0;
    while (j < end && !(css[j] === ";" && paren === 0)) {
      if (css.startsWith("/*", j)) {
        j = skipComment(css, j);
        continue;
      }
      if (css[j] === "(") paren++;
      else if (css[j] === ")") paren--;
      j++;
    }
    const lineEnd = lineEndAt(css, j);
    // A trailing comment on the same line belongs to this declaration if nothing else comes first.
    let k = j + 1;
    while (k < lineEnd && (css[k] === " " || css[k] === "\t")) k++;
    let comment: string | null = null;
    let commentEnd: number | null = null;
    if (css.startsWith("/*", k)) {
      commentEnd = skipComment(css, k);
      comment = css.slice(k + 2, commentEnd - 2).trim();
    }
    if (name.startsWith("--")) {
      out.push({
        block,
        name,
        value: css.slice(colon + 1, j).replace(/\s+/g, " ").trim(),
        comment,
        valueStart: colon + 1,
        valueEnd: j,
        commentEnd,
        lineEnd,
      });
    }
    i = commentEnd ?? j + 1;
  }
  return out;
}

export function parseBlocks(css: string): Blocks {
  const blocks: Blocks = { root: [], dark: [], theme: [] };
  for (const r of scan(css)) {
    blocks[r.block] = r.decls.map(({ block, name, value, comment }) => ({ block, name, value, comment }));
  }
  return blocks;
}

const NAME = /^--[a-z0-9-]+$/;

/** German error message for an invalid edit, or null. */
export function validateEdit(e: TokenEdit): string | null {
  if (!["root", "dark", "theme"].includes(e.block)) return `Unbekannter Bereich „${e.block}“.`;
  if (typeof e.name !== "string" || !NAME.test(e.name)) return `Ungültiger Name „${e.name}“.`;
  if (typeof e.value !== "string" || e.value.trim() === "") return `${e.name}: Wert darf nicht leer sein.`;
  if (/[;{}]|\/\*/.test(e.value)) return `${e.name}: Wert darf keine der Zeichen ; { } oder /* enthalten.`;
  return null;
}

function splice(css: string, start: number, end: number, text: string): string {
  return css.slice(0, start) + text + css.slice(end);
}

/** Insert a declaration as the last line of a block. */
function insertDecl(css: string, region: Region, name: string, value: string, comment: string): string {
  const line = `  ${name}: ${value}; /* ${comment} */`;
  const lineStart = css.lastIndexOf("\n", region.close - 1) + 1;
  if (css.slice(lineStart, region.close).trim() === "") return splice(css, lineStart, lineStart, `${line}\n`);
  return splice(css, region.close, region.close, `\n${line}\n`);
}

function region(css: string, block: Block): Region {
  const r = scan(css).find((x) => x.block === block);
  if (!r) throw new Error(`Block ${block} fehlt in brand.css.`);
  return r;
}

function replaceValue(css: string, r: Region, d: Located, value: string): string {
  const old = d.value;
  const sameLine = r.decls.filter((x) => x.lineEnd === d.lineEnd);
  let out = css;
  if (sameLine.length > 1) {
    const lineStart = css.lastIndexOf("\n", d.lineEnd - 1) + 1;
    const mark = `[derived] ${d.name} was`;
    if (!css.slice(lineStart, d.lineEnd).includes(mark)) {
      out = splice(out, d.lineEnd, d.lineEnd, ` /* ${mark} ${old} */`);
    }
  } else if (d.comment === null) {
    out = splice(out, d.valueEnd + 1, d.valueEnd + 1, ` /* [derived] was ${old} */`);
  } else if (!d.comment.includes("[derived]")) {
    const commentStart = css.lastIndexOf("/*", d.commentEnd!);
    out = splice(out, commentStart, d.commentEnd!, `/* [derived] was ${d.comment} ${old} */`);
  }
  // The value sits before any comment change, so its offsets are still valid.
  return splice(out, d.valueStart, d.valueEnd, ` ${value}`);
}

/**
 * Write edited token values into brand.css. Only the edited values (and their origin comments)
 * change; every other byte stays. A light edit of a token that .dark does not declare also
 * pins the previous dark value in .dark, so the edit only affects light mode.
 */
export function applyEdits(brandCss: string, foundationCss: string, edits: TokenEdit[]): { css: string; changed: number } {
  for (const e of edits) {
    const err = validateEdit(e);
    if (err) throw new Error(err);
  }
  const foundation = parseBlocks(foundationCss);
  let css = brandCss;
  let changed = 0;
  for (const e of edits) {
    const value = e.value.trim();
    const r = region(css, e.block);
    const d = r.decls.find((x) => x.name === e.name);
    if (d && d.value === value) continue;

    let keepDark: string | undefined;
    if (e.block === "root" && !region(css, "dark").decls.some((x) => x.name === e.name)) {
      keepDark = foundation.dark.find((x) => x.name === e.name)?.value ?? d?.value;
    }

    css = d ? replaceValue(css, r, d, value) : insertDecl(css, r, e.name, value, "[derived] set in preview");
    if (keepDark !== undefined) css = insertDecl(css, region(css, "dark"), e.name, keepDark, "[derived] kept dark value");
    changed++;
  }
  return { css, changed };
}

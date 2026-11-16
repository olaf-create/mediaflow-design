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

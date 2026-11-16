import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { IncomingMessage } from "node:http";
import type { Plugin } from "vite";
import { applyEdits, parseBlocks, validateEdit, type TokenEdit } from "./brand-css";

type Result = { status: number; json: unknown };

const files = (root: string) => ({
  brand: join(root, "css/brand.css"),
  foundation: join(root, "css/beautifui/foundation.css"),
});

export async function handleTokens(repoRoot: string): Promise<Result> {
  const f = files(repoRoot);
  const [brand, foundation] = await Promise.all([readFile(f.brand, "utf8"), readFile(f.foundation, "utf8")]);
  return { status: 200, json: { brand: parseBlocks(brand), foundation: parseBlocks(foundation) } };
}

/** Re-reads both files, validates every edit, writes brand.css only when something changed. */
export async function handleSave(repoRoot: string, body: unknown): Promise<Result> {
  const edits = (body as { edits?: unknown } | null)?.edits;
  if (!Array.isArray(edits) || edits.length === 0) return { status: 400, json: { error: "Keine Änderungen übergeben." } };
  for (const e of edits as TokenEdit[]) {
    const err = e && typeof e === "object" ? validateEdit(e) : "Ungültige Änderung.";
    if (err) return { status: 400, json: { error: err } };
  }
  const f = files(repoRoot);
  const [brand, foundation] = await Promise.all([readFile(f.brand, "utf8"), readFile(f.foundation, "utf8")]);
  const { css, changed } = applyEdits(brand, foundation, edits as TokenEdit[]);
  if (changed > 0) await writeFile(f.brand, css);
  return { status: 200, json: { changed } };
}

/**
 * Saving changes a file on disk, so only the preview page itself may call it: JSON content type
 * (forces a CORS preflight for other sites) and, if the browser sends one, our own origin.
 */
export function checkSaveRequest(headers: Record<string, string | string[] | undefined>, host: string): string | null {
  const type = String(headers["content-type"] ?? "");
  if (!type.startsWith("application/json")) return "Nur JSON-Anfragen erlaubt.";
  const origin = headers.origin;
  if (origin && origin !== `http://${host}` && origin !== `https://${host}`) return "Anfrage von fremder Seite abgelehnt.";
  return null;
}

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((ok, fail) => {
    let s = "";
    req.on("data", (c) => (s += c));
    req.on("end", () => {
      try {
        ok(JSON.parse(s));
      } catch {
        ok(null);
      }
    });
    req.on("error", fail);
  });
}

/** Dev-server only: GET /__design/tokens, POST /__design/save. */
export function designPlugin(opts: { repoRoot?: string } = {}): Plugin {
  const repoRoot = opts.repoRoot ?? resolve(__dirname, "../..");
  return {
    name: "mediaflow-design-preview",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split("?")[0];
        if (url !== "/__design/tokens" && url !== "/__design/save") return next();
        let result: Result;
        try {
          if (url === "/__design/tokens" && req.method === "GET") result = await handleTokens(repoRoot);
          else if (url === "/__design/save" && req.method === "POST") {
            const denied = checkSaveRequest(req.headers, req.headers.host ?? "");
            result = denied ? { status: 403, json: { error: denied } } : await handleSave(repoRoot, await readBody(req));
          }
          else result = { status: 405, json: { error: "Methode nicht erlaubt." } };
        } catch (e) {
          result = { status: 500, json: { error: e instanceof Error ? e.message : String(e) } };
        }
        res.statusCode = result.status;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify(result.json));
      });
    },
  };
}

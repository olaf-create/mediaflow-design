import { appendFileSync, cpSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { beforeEach, expect, test } from "vitest";
import { checkSaveRequest, handleSave, handleTokens } from "./plugin";

let root: string;
const brandPath = () => join(root, "css/brand.css");

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "design-preview-"));
  cpSync(resolve(__dirname, "../../css"), join(root, "css"), { recursive: true });
});

test("tokens lists brand and foundation blocks", async () => {
  const res = await handleTokens(root);
  expect(res.status).toBe(200);
  const json = res.json as { brand: { root: { name: string }[] }; foundation: { theme: { name: string }[] } };
  expect(json.brand.root.some((d) => d.name === "--page")).toBe(true);
  expect(json.foundation.theme.some((d) => d.name === "--radius-card")).toBe(true);
});

test("save writes the new value", async () => {
  const res = await handleSave(root, { edits: [{ block: "root", name: "--ink-3", value: "#7a7874" }] });
  expect(res).toEqual({ status: 200, json: { changed: 1 } });
  expect(readFileSync(brandPath(), "utf8")).toContain("--ink-3: #7a7874;");
});

test("save re-reads the file from disk", async () => {
  appendFileSync(brandPath(), "\n/* added by someone else */\n");
  await handleSave(root, { edits: [{ block: "root", name: "--ink-3", value: "#7a7874" }] });
  expect(readFileSync(brandPath(), "utf8")).toContain("/* added by someone else */");
});

test("invalid value is rejected and nothing is written", async () => {
  const before = readFileSync(brandPath(), "utf8");
  const res = await handleSave(root, { edits: [{ block: "root", name: "--ink", value: "red;}" }] });
  expect(res.status).toBe(400);
  expect((res.json as { error: string }).error).not.toBe("");
  expect(readFileSync(brandPath(), "utf8")).toBe(before);
});

test("malformed body is rejected", async () => {
  expect((await handleSave(root, {})).status).toBe(400);
  expect((await handleSave(root, null)).status).toBe(400);
});

test("only same-origin JSON requests may save", () => {
  expect(checkSaveRequest({ "content-type": "application/json" }, "localhost:5199")).toBeNull();
  expect(checkSaveRequest({ "content-type": "application/json", origin: "http://localhost:5199" }, "localhost:5199")).toBeNull();
  expect(checkSaveRequest({ "content-type": "text/plain" }, "localhost:5199")).not.toBeNull();
  expect(checkSaveRequest({}, "localhost:5199")).not.toBeNull();
  expect(checkSaveRequest({ "content-type": "application/json", origin: "https://evil.example" }, "localhost:5199")).not.toBeNull();
});

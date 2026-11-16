import { useCallback, useEffect, useMemo, useState } from "react";
import type { Blocks, TokenEdit } from "../server/brand-css";
import { buildOverrideCss, type Edits } from "./overrides";
import Showcase from "./Showcase";
import TokenPanel, { type Row } from "./TokenPanel";
import { EXTRA_SHADOWS, RADII, groupOf } from "./tokens";

type Mode = "light" | "dark";
type Model = { brand: Blocks; foundation: Blocks };
type Base = Record<Mode, Record<string, string>>;

const EMPTY: Edits = { root: {}, dark: {}, theme: {} };
const blockFor = (name: string, mode: Mode): keyof Edits => (RADII.includes(name) ? "theme" : mode === "light" ? "root" : "dark");

function setMode(m: Mode) {
  document.documentElement.classList.toggle("dark", m === "dark");
}

/** Effective values of every token in both modes, read from the page (no unsaved edits applied). */
function readBase(names: string[], model: Model, current: Mode): Base {
  const out: Base = { light: {}, dark: {} };
  for (const m of ["light", "dark"] as Mode[]) {
    setMode(m);
    const cs = getComputedStyle(document.documentElement);
    for (const n of names) out[m][n] = cs.getPropertyValue(n).trim();
  }
  setMode(current);
  // Radii live in @theme inline; Tailwind may not emit them as variables. Fall back to the source.
  for (const n of RADII) {
    const src = model.brand.theme.find((d) => d.name === n) ?? model.foundation.theme.find((d) => d.name === n);
    for (const m of ["light", "dark"] as Mode[]) if (!out[m][n]) out[m][n] = src?.value ?? "";
  }
  return out;
}

function afterCssUpdate(): Promise<void> {
  return new Promise((done) => {
    const hot = import.meta.hot;
    const onUpdate = () => {
      clearTimeout(t);
      hot?.off("vite:afterUpdate", onUpdate);
      requestAnimationFrame(() => done());
    };
    const t = setTimeout(() => {
      hot?.off("vite:afterUpdate", onUpdate);
      done();
    }, 1500);
    hot?.on("vite:afterUpdate", onUpdate);
  });
}

export default function App() {
  const [mode, setModeState] = useState<Mode>("light");
  const [model, setModel] = useState<Model | null>(null);
  const [base, setBase] = useState<Base | null>(null);
  const [edits, setEdits] = useState<Edits>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const names = useMemo(() => {
    if (!model) return [];
    const brandNames = model.brand.root.map((d) => d.name);
    return [...brandNames, ...EXTRA_SHADOWS.filter((n) => !brandNames.includes(n)), ...RADII];
  }, [model]);

  const load = useCallback(async () => {
    const res = await fetch("/__design/tokens");
    const m = (await res.json()) as Model;
    setModel(m);
    return m;
  }, []);

  useEffect(() => {
    load().catch((e) => setMessage({ kind: "error", text: `Werte konnten nicht geladen werden: ${e}` }));
  }, [load]);

  useEffect(() => {
    if (model && names.length) setBase(readBase(names, model, mode));
    // Only when the token list changes (load, save) — not on mode switches.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model, names]);

  useEffect(() => setMode(mode), [mode]);

  const css = useMemo(() => buildOverrideCss(edits), [edits]);
  const editCount = Object.values(edits).reduce((n, b) => n + Object.keys(b).length, 0);

  useEffect(() => {
    if (editCount === 0) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    addEventListener("beforeunload", warn);
    return () => removeEventListener("beforeunload", warn);
  }, [editCount]);

  const rows: Row[] = useMemo(() => {
    if (!model || !base) return [];
    const darkDeclared = new Set(model.brand.dark.map((d) => d.name));
    return names.map((name) => {
      const block = blockFor(name, mode);
      const b = base[mode][name] ?? "";
      const edited = edits[block][name];
      return {
        name,
        base: b,
        value: edited ?? b,
        changed: edited !== undefined,
        inherited: mode === "dark" && block === "dark" && !darkDeclared.has(name),
        radius: block === "theme",
      };
    });
  }, [model, base, names, mode, edits]);

  const change = (name: string, value: string) => {
    const block = blockFor(name, mode);
    setMessage(null);
    setEdits((e) => {
      const next = { ...e, [block]: { ...e[block] } };
      if (value === base?.[mode][name]) delete next[block][name];
      else next[block][name] = value;
      return next;
    });
  };

  const reset = (name: string) => {
    const block = blockFor(name, mode);
    setEdits((e) => {
      const next = { ...e, [block]: { ...e[block] } };
      delete next[block][name];
      return next;
    });
  };

  const save = async () => {
    const list: TokenEdit[] = (Object.keys(edits) as (keyof Edits)[]).flatMap((block) =>
      Object.entries(edits[block]).map(([name, value]) => ({ block, name, value })),
    );
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/__design/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ edits: list }),
      });
      const json = (await res.json()) as { changed?: number; error?: string };
      if (!res.ok) {
        setMessage({ kind: "error", text: json.error ?? "Speichern fehlgeschlagen." });
        return;
      }
      if (json.changed) await afterCssUpdate();
      setEdits(EMPTY);
      await load();
      setMessage({
        kind: "ok",
        text: `Gespeichert (${json.changed} ${json.changed === 1 ? "Wert" : "Werte"}) – jetzt in Claude „als neue Version freigeben“.`,
      });
    } catch (e) {
      setMessage({ kind: "error", text: `Speichern fehlgeschlagen: ${e}` });
    } finally {
      setSaving(false);
    }
  };

  const tiles = rows.filter((r) => !["Schatten", "Radien"].includes(groupOf(r.name))).map((r) => ({ name: r.name, value: r.value }));

  return (
    <div className="grid grid-cols-[340px_1fr]">
      <style id="design-overrides">{css}</style>
      <div className="sticky top-0 h-screen">
        <TokenPanel
          mode={mode}
          rows={rows}
          editCount={editCount}
          saving={saving}
          message={message}
          onMode={setModeState}
          onChange={change}
          onReset={reset}
          onDiscardAll={() => setEdits(EMPTY)}
          onSave={save}
        />
      </div>
      <main className="app-content min-w-0 p-8">
        <Showcase tokens={tiles} />
      </main>
    </div>
  );
}

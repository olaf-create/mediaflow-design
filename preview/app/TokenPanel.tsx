import { useEffect, useRef } from "react";
import { RotateCcw } from "lucide-react";
import { Button, cn, ui } from "../../src";
import { contrastRatio, composite, formatColor, parseColor, toHex } from "./color";
import { CONTRAST_PAIRS, TOKEN_GROUPS, groupOf } from "./tokens";

export type Row = {
  name: string;
  value: string;
  base: string;
  changed: boolean;
  inherited: boolean;
  radius: boolean;
};

type Props = {
  mode: "light" | "dark";
  rows: Row[];
  editCount: number;
  saving: boolean;
  message: { kind: "ok" | "error"; text: string } | null;
  onMode: (m: "light" | "dark") => void;
  onChange: (name: string, value: string) => void;
  onReset: (name: string) => void;
  onDiscardAll: () => void;
  onSave: () => void;
  highlight: { label: string; names: string[] } | null;
  onClearHighlight: () => void;
};

const fmt = (n: number) => n.toFixed(1).replace(".", ",");

function badge(r: number): { label: string; cls: string } {
  if (r >= 7) return { label: "AAA", cls: "bg-green-tint text-green" };
  if (r >= 4.5) return { label: "AA", cls: "bg-green-tint text-green" };
  if (r >= 3) return { label: "AA groß", cls: "bg-orange-tint text-orange" };
  return { label: "zu schwach", cls: "bg-red-tint text-red" };
}

function Editor({ row, onChange }: { row: Row; onChange: (v: string) => void }) {
  if (row.radius) {
    const px = parseFloat(row.value) || 0;
    return (
      <div className="flex items-center gap-2">
        <input type="range" min={0} max={24} step={1} value={px} onChange={(e) => e.target.value !== "" && !Number.isNaN(Number(e.target.value)) && onChange(`${Number(e.target.value)}px`)} className="flex-1 accent-[var(--accent)]" />
        <input type="number" min={0} max={24} value={px} onChange={(e) => e.target.value !== "" && !Number.isNaN(Number(e.target.value)) && onChange(`${Number(e.target.value)}px`)} className={cn(ui.field, "h-7 w-16 px-2 text-[12.5px]")} />
      </div>
    );
  }
  const c = parseColor(row.value);
  const text = (
    <input
      value={row.value}
      onChange={(e) => onChange(e.target.value)}
      spellCheck={false}
      className={cn(ui.field, "h-7 min-w-0 flex-1 px-2 font-mono text-[11.5px]")}
    />
  );
  if (!c) return <div className="flex">{text}</div>;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={toHex(c)}
          onChange={(e) => onChange(formatColor({ ...parseColor(e.target.value)!, a: c.a }))}
          className="h-7 w-9 shrink-0 cursor-pointer rounded-control border border-line-strong bg-surface p-0.5"
        />
        {text}
      </div>
      {c.a < 1 && (
        <label className="flex items-center gap-2 text-[11.5px] text-ink-2">
          Deckkraft
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={c.a}
            onChange={(e) => onChange(formatColor({ ...c, a: Number(e.target.value) }))}
            className="flex-1 accent-[var(--accent)]"
          />
          <span className="w-8 text-right font-mono">{Math.round(c.a * 100)}%</span>
        </label>
      )}
    </div>
  );
}

function Contrast({ rows }: { rows: Row[] }) {
  const val = new Map(rows.map((r) => [r.name, r.value]));
  const surface = parseColor(val.get("--surface") ?? "") ?? { r: 255, g: 255, b: 255, a: 1 };
  return (
    <div className="flex flex-col gap-1">
      {CONTRAST_PAIRS.map(([fgName, bgName]) => {
        const fg = parseColor(val.get(fgName) ?? "");
        const bgRaw = parseColor(val.get(bgName) ?? "");
        const key = `${fgName}/${bgName}`;
        if (!fg || !bgRaw) {
          return (
            <div key={key} className="flex items-center justify-between gap-2 text-[11.5px] text-ink-3">
              <span className="font-mono">{fgName} auf {bgName}</span>
              <span>–</span>
            </div>
          );
        }
        const bg = bgRaw.a < 1 ? composite(bgRaw, surface) : bgRaw;
        const r = contrastRatio(fg, bg);
        const b = badge(r);
        return (
          <div key={key} className="flex items-center justify-between gap-2 text-[11.5px]">
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="flex h-5 w-7 shrink-0 items-center justify-center rounded-chip text-[11px] font-semibold" style={{ background: formatColor(bg), color: formatColor(fg) }}>
                Aa
              </span>
              <span className="truncate font-mono text-ink-2">{fgName} auf {bgName}</span>
            </span>
            <span className="flex shrink-0 items-center gap-1.5">
              <span className="font-mono text-ink">{fmt(r)}</span>
              <span className={cn("rounded-chip px-1.5 py-0.5 text-[10.5px] font-semibold", b.cls)}>{b.label}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function TokenPanel(p: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const marked = new Set(p.highlight?.names);
  useEffect(() => {
    const first = p.highlight?.names[0];
    if (!first) return;
    const row = Array.from(scroller.current?.querySelectorAll<HTMLElement>("[data-token]") ?? []).find((r) => r.dataset.token === first);
    const box = scroller.current;
    if (row && box) box.scrollTo({ top: row.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop - 8, behavior: "smooth" });
  }, [p.highlight]);
  return (
    <aside className="flex h-screen flex-col border-r border-line bg-surface">
      <div className="flex flex-col gap-3 border-b border-line p-4">
        <div className="text-[15px] font-semibold text-ink">Design-Werte</div>
        <div className="flex gap-1 rounded-full bg-hover-2 p-0.5">
          {(["light", "dark"] as const).map((m) => (
            <button
              key={m}
              onClick={() => p.onMode(m)}
              className={cn("h-7 flex-1 rounded-full text-[12.5px] font-medium", p.mode === m ? "bg-surface text-ink shadow-btn" : "text-ink-2")}
            >
              {m === "light" ? "Hell" : "Dunkel"}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="whitespace-nowrap text-[12.5px] text-ink-2">
            {p.editCount === 0 ? "Keine Änderungen" : p.editCount === 1 ? "1 Änderung" : `${p.editCount} Änderungen`}
          </span>
          <div className="flex gap-1.5">
            <Button size="sm" variant="quiet" disabled={p.editCount === 0 || p.saving} onClick={p.onDiscardAll}>
              Alle verwerfen
            </Button>
            <Button size="sm" variant="primary" disabled={p.editCount === 0 || p.saving} onClick={p.onSave}>
              {p.saving ? "Speichert …" : "Speichern"}
            </Button>
          </div>
        </div>
        {p.message && <div className={p.message.kind === "ok" ? ui.success : ui.error}>{p.message.text}</div>}
        {p.highlight ? (
          <div className="flex items-center justify-between gap-2 text-[12.5px] text-ink-2">
            <span className="min-w-0 truncate">
              {p.highlight.names.length} {p.highlight.names.length === 1 ? "Wert" : "Werte"} für {p.highlight.label}
            </span>
            <Button size="sm" variant="quiet" onClick={p.onClearHighlight}>
              Aufheben
            </Button>
          </div>
        ) : (
          <p className="text-[11.5px] text-ink-3">⌥-Klick auf ein Element rechts zeigt seine Werte.</p>
        )}
      </div>

      <div ref={scroller} className="flex-1 overflow-y-auto p-4">
        {TOKEN_GROUPS.map((g) => {
          const rows = p.rows.filter((r) => groupOf(r.name) === g.label);
          if (rows.length === 0) return null;
          return (
            <section key={g.label} className="mb-5">
              <h3 className={cn(ui.fieldLabel, "mb-2")}>{g.label}</h3>
              <div className="flex flex-col gap-3">
                {rows.map((r) => (
                  <div
                    key={r.name}
                    data-token={r.name}
                    className={cn("flex flex-col gap-1.5", marked.has(r.name) && "-mx-2 rounded-control bg-hover-2 px-2 py-1.5 ring-1 ring-accent")}
                  >
                    <div className="flex items-center gap-1.5">
                      {r.changed && <span title="Geändert" className="size-1.5 shrink-0 rounded-full bg-accent" />}
                      <span className="font-mono text-[12px] text-ink">{r.name}</span>
                      {r.inherited && !r.changed && <span className={cn(ui.chip, "h-[18px] px-1.5 text-[10.5px] text-ink-2")}>geerbt</span>}
                      {r.changed && (
                        <button title={`Zurücksetzen auf ${r.base}`} onClick={() => p.onReset(r.name)} className="ml-auto text-ink-3 hover:text-ink">
                          <RotateCcw size={13} />
                        </button>
                      )}
                    </div>
                    <Editor row={r} onChange={(v) => p.onChange(r.name, v)} />
                  </div>
                ))}
              </div>
            </section>
          );
        })}

        <section className="mb-5">
          <h3 className={cn(ui.fieldLabel, "mb-2")}>Kontrast ({p.mode === "light" ? "Hell" : "Dunkel"})</h3>
          <Contrast rows={p.rows} />
          <p className="mt-2 text-[11.5px] text-ink-3">Hinweis nach WCAG: AA ab 4,5 (große Schrift ab 3), AAA ab 7. Speichern ist trotzdem möglich.</p>
        </section>
      </div>
    </aside>
  );
}

import type { ReactNode } from "react";
import { Bell, Layers, Search } from "lucide-react";
import {
  Button,
  MEDIAFLOW_LOGO_PATHS,
  TONE_CHIP,
  TONE_ICON,
  TONE_OUTLINE,
  TONE_SOLID,
  ThemeSwitch,
  TitleMark,
  cn,
  ui,
  type ButtonVariant,
  type Tone,
} from "../../src";
import FilterTable from "../../src/primitives/FilterTable";
import GlideMenu from "../../src/primitives/GlideMenu";
import RecordsTable from "../../src/primitives/RecordsTable";
import SearchList from "../../src/primitives/SearchList";
import SidebarNav from "../../src/primitives/SidebarNav";

const TONES: Tone[] = ["blue", "pink", "green", "purple", "orange", "sand", "grey"];
const VARIANTS: ButtonVariant[] = ["primary", "secondary", "ghost", "accent", "success", "quiet"];
const SIZES = ["xs", "sm", "md"] as const;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className={ui.h2}>{title}</h2>
      {children}
    </section>
  );
}

/** Every element of the package, rendered with its real classes and components. */
export default function Showcase({ tokens }: { tokens: { name: string; value: string }[] }) {
  return (
    <div className="flex flex-col gap-10">
      <Section title="Logo">
        <svg viewBox="0 0 360.03 71.53" className="h-8 w-auto fill-current text-ink" dangerouslySetInnerHTML={{ __html: MEDIAFLOW_LOGO_PATHS }} />
      </Section>

      <Section title="Farben">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2">
          {tokens.map((t) => (
            <div key={t.name} className={cn(ui.card, "overflow-hidden")}>
              <div className="h-12 border-b border-line" style={{ background: `var(${t.name})` }} />
              <div className="px-2.5 py-2">
                <div className="font-mono text-[11.5px] text-ink">{t.name}</div>
                <div className="truncate font-mono text-[11px] text-ink-2">{t.value}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Typografie">
        <div className={cn(ui.card, ui.cardPad, "flex flex-col gap-3")}>
          <h1 className={ui.h1}>Seitentitel</h1>
          <h2 className={ui.h2}>Abschnittsüberschrift</h2>
          <p className="text-[14px] text-ink">Fließtext: Kampagnen und Maßnahmen über alle Kanäle planen.</p>
          <p className={ui.muted}>Ergänzender Text in zurückhaltender Farbe.</p>
          <span className={ui.fieldLabel}>Feldbezeichnung</span>
          <a href="#" className={ui.link}>Ein Link</a>
        </div>
      </Section>

      <Section title="Hell/Dunkel-Schalter">
        <ThemeSwitch labels={{ group: "Farbmodus", light: "Hell", dark: "Dunkel", system: "System" }} />
      </Section>

      <Section title="Buttons">
        <div className="flex flex-col gap-2">
          {SIZES.map((size) => (
            <div key={size} className="flex flex-wrap items-center gap-2">
              <span className="w-8 font-mono text-[11px] text-ink-3">{size}</span>
              {VARIANTS.map((v) => (
                <Button key={v} variant={v} size={size}>
                  {v}
                </Button>
              ))}
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-8 font-mono text-[11px] text-ink-3">aus</span>
            {VARIANTS.map((v) => (
              <Button key={v} variant={v} size="sm" disabled>
                {v}
              </Button>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Chips & Töne">
        <div className="flex flex-wrap items-center gap-2">
          <span className={ui.chip}>Chip</span>
          <span className={ui.filterChip}>Filter aus</span>
          <span className={cn(ui.filterChip, ui.filterChipOn)}>Filter an</span>
        </div>
        <div className="flex flex-col gap-2">
          {TONES.map((t) => (
            <div key={t} className="flex flex-wrap items-center gap-2">
              <span className="w-14 font-mono text-[11px] text-ink-3">{t}</span>
              <TitleMark icon={Layers} tone={t} />
              <Bell size={18} className={TONE_ICON[t]} />
              <span className={cn(ui.chip, TONE_CHIP[t])}>Chip</span>
              <span className={cn(ui.toggleChip, TONE_SOLID[t])}>Ausgewählt</span>
              <span className={cn(ui.toggleChip, TONE_OUTLINE[t])}>Umriss</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Formular">
        <div className={cn(ui.card, ui.cardPad, "grid max-w-lg gap-4")}>
          <label className={ui.label}>
            Kampagnenname
            <input className={ui.field} defaultValue="Frühjahrsaktion 2027" />
          </label>
          <label className={ui.label}>
            Budget
            <input className={ui.field} defaultValue="abc" aria-invalid />
          </label>
        </div>
      </Section>

      <Section title="Meldungen">
        <div className="flex max-w-lg flex-col gap-2">
          <div className={ui.error}>Das Budget muss eine Zahl sein.</div>
          <div className={ui.success}>Änderungen gespeichert.</div>
        </div>
      </Section>

      <Section title="Karte">
        <div className={cn(ui.card, ui.cardPad, "max-w-lg")}>
          <h2 className={ui.h2}>Karte</h2>
          <p className={cn(ui.muted, "mt-1 text-[13.5px]")}>Erhabene Fläche für Inhalte, Formulare und Tabellen.</p>
        </div>
      </Section>

      <Section title="Tabelle">
        <div className={cn(ui.card, "overflow-hidden")}>
          <table className={ui.table}>
            <thead>
              <tr>
                <th className={ui.th}>Maßnahme</th>
                <th className={ui.th}>Kanal</th>
                <th className={ui.th}>Start</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Newsletter Q1", "E-Mail", "13.01.2027"],
                ["Messe-Stand", "Event", "02.03.2027"],
                ["Pressemitteilung", "PR", "15.03.2027"],
              ].map((r) => (
                <tr key={r[0]}>
                  {r.map((c) => (
                    <td key={c} className={ui.td}>{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Navigation">
        <div className="h-[520px] overflow-hidden rounded-card shadow-card">
          <SidebarNav fill />
        </div>
      </Section>

      <Section title="Menü">
        <div className={cn(ui.card, "w-64 p-1.5")}>
          <GlideMenu>
            {["Bearbeiten", "Duplizieren", "Archivieren", "Löschen"].map((l) => (
              <div key={l} data-menu-row className="relative z-10 flex h-8 items-center gap-2 px-2.5 text-[13px] text-ink">
                <Search size={14} className="text-ink-3" />
                {l}
              </div>
            ))}
          </GlideMenu>
        </div>
      </Section>

      <Section title="FilterTable">
        <FilterTable />
      </Section>

      <Section title="SearchList">
        <SearchList />
      </Section>

      <Section title="RecordsTable">
        <div className="h-[480px]">
          <RecordsTable fill />
        </div>
      </Section>
    </div>
  );
}

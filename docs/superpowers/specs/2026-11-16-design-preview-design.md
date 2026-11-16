# Design-Vorschau mit Live-Bearbeitung – Design

Stand: 16.11.2026 · Status: Entwurf, wartet auf Freigabe

## Absicht

Olaf (allein) will das Mediaflow-Design nicht mehr nur in Worten beschreiben, sondern alle Elemente
auf einer Seite **sehen** und ihre Werte **direkt verändern** – mit sofortiger Wirkung und einem
Klick auf „Speichern“, der die Werte in `css/brand.css` zurückschreibt. Danach läuft der bekannte
Release-Ablauf (Changelog, Version, Tag – siehe `CLAUDE.md`) über Claude.

Heute gibt es keine Vorschau; das Design ist nur in Competitive Intelligence zu sehen.

## Ziele

- `npm run preview` startet lokal eine Seite, die alle Elemente des Pakets zeigt – mit den echten
  Komponenten und dem echten CSS des Pakets, nicht mit Nachbauten.
- Umschalter Hell/Dunkel; bearbeitet wird immer der gerade sichtbare Modus.
- Werte-Panel: jede Variable aus `css/brand.css` (`:root` und `.dark`) mit Farbwähler bzw. Textfeld;
  Wirkung sofort ohne Neuladen.
- Geänderte Werte sind markiert und einzeln zurücksetzbar; „Alle verwerfen“.
- „Speichern“ schreibt nur geänderte Werte in `css/brand.css`, Kommentare und Formatierung bleiben.
- Kontrastanzeige für die wichtigsten Text-/Flächen-Paare (WCAG-Verhältnis, AA/AAA-Markierung),
  weil `brand.css` Lesbarkeit ausdrücklich fordert (z. B. „AA on white“).

## Nicht-Ziele

- Keine Bearbeitung der Komponenten-Form (Aufbau, Icons, Klassen, Schriftgrößen in `src/styles.ts`)
  – das bleibt Arbeit mit Claude; die Vorschau zeigt das Ergebnis.
- Keine Änderung an `css/beautifui/` (vendored, siehe `CLAUDE.md`).
- Kein Hosting, keine Mehrbenutzer, kein Login. Läuft nur lokal.
- Kein Release-Automatismus (Version, Changelog, Tag macht weiter Claude bzw. Olaf).
- Keine Schriftart-Wahl (Fonts lädt jede App selbst per `next/font`).

## Anti-Ziele (wäre ein Fehlschlag, auch wenn es technisch läuft)

- Die Vorschau zeigt etwas anderes als die Apps (eigene Nachbauten, abweichendes CSS).
- „Speichern“ zerstört `brand.css`: verlorene Kommentare, umsortierte Zeilen, falscher Block
  (Dunkelwert in `:root` geschrieben).
- Die Vorschau landet im ausgelieferten Paket (Apps bekommen Vite o. Ä. mit).

## Randbedingungen

- Repo: `~/dev/mediaflow-design`, npm (nicht pnpm), TypeScript strict, React 19, Tailwind ≥ 4.1.
- `package.json` `files` = `css`, `src`, `CHANGELOG.md` → ein Ordner `preview/` wird nicht ausgeliefert.
  Neue Werkzeuge nur als `devDependencies`.
- Tailwind scannt `node_modules` nicht; die Vorschau braucht `@source` auf `../src`.
- `css/index.css` erwartet, dass `foundation.css` Tailwind importiert – nicht doppelt importieren.
- Fonts: `foundation.css`/`brand.css` lesen `--font-inter`, `--font-pt-serif`, `--font-mono-face`
  (`FONT_VARIABLES`). Die Vorschau lädt Inter, PT Serif 400 und JetBrains Mono von Google Fonts
  und setzt diese Variablen.
- Dunkelmodus = Klasse `.dark` auf `<html>` (Beautiful UI).

## Ansätze

| | Ansatz | Abwägung |
|---|---|---|
| **A (gewählt)** | Eigene Vorschau-Seite im Repo (Vite + React), Werte live bearbeiten, „Speichern“ schreibt über einen kleinen lokalen Server-Endpunkt in `brand.css` | Ein Klick vom Ausprobieren zur Datei; Speicherlogik ist der aufwendigste Teil |
| B | Gleiche Seite ohne Speichern, „Änderungen kopieren“ für Claude | Schneller gebaut, aber jedes Mal ein Umweg über Claude |
| C | Storybook | Standard, aber schwer, zeigt Komponenten einzeln statt das Gesamtbild, Live-Tokens nur per Add-on, kein Zurückschreiben |

Olaf hat **A** gewählt: Er arbeitet allein und häufig am Design, der direkte Weg in die Datei
spart dabei am meisten.

## Entscheidungen

### Technik
- Ordner `preview/` im Repo: Vite + `@vitejs/plugin-react` + `@tailwindcss/vite`.
  Skript `"preview": "vite --config preview/vite.config.ts --open"` in `package.json`.
- `preview/preview.css`: `@import "../css/index.css";` plus `@source "../src";` und `@source "./";`.
- Die Seite importiert direkt aus `../src` (Button, `ui`, Töne, Logo, Primitives) – keine Kopien.
- Speichern: ein Vite-Plugin (nur Dev-Server) registriert `POST /__design/save` und
  `GET /__design/tokens`. Kein separater Server-Prozess.

### Was bearbeitet werden kann
- **Alle Custom Properties in `brand.css`**, getrennt für `:root` (hell) und `.dark` (dunkel).
  Die Liste wird beim Start aus `brand.css` gelesen (GET-Endpunkt parst die Datei), nicht von Hand
  gepflegt – neue Tokens erscheinen automatisch.
- Gruppen wie in den Kommentaren von `brand.css`: Flächen, Text, Linien, Akzent, Semantik,
  Tooltip, Töne, Sonstiges.
- Hex-Werte → Farbwähler + Textfeld. `rgb(... / a)` → Farbwähler + Deckkraft-Regler.
  Alles andere (Schatten, `var(...)`-Verweise, `transparent`) → Textfeld.
- **Variablen, die im Dunkelblock fehlen** (z. B. `--tone-blue` erbt aus `:root`): werden als
  „geerbt“ angezeigt; eine Änderung im Dunkelmodus legt sie im `.dark`-Block neu an.
  Der angezeigte geerbte Wert ist der tatsächlich wirksame (per `getComputedStyle` im jeweiligen
  Modus gelesen), egal ob er aus `brand.css :root` oder aus `foundation.css .dark` stammt.
- **Grundregel: Eine Änderung wirkt nur im Modus, in dem sie gemacht wurde.** Weil `:root` und
  `.dark` gleich spezifisch sind und `brand.css` nach `foundation.css` lädt, würde ein neuer
  Override in `brand.css :root` (z. B. `--shadow-card`) sonst auch den Dunkelwert aus
  `foundation.css` überschreiben. Darum schreibt Speichern in diesem Fall zusätzlich den bisher
  wirksamen Dunkelwert in den `.dark`-Block von `brand.css` (mit `/* [derived] kept from Beautiful UI */`).
  Unit-Test dafür ist Pflicht.
- **Radien** (`--radius-chip/control/card/window`, definiert in `foundation.css` `@theme inline`):
  Regler 0–24 px. Weil `@theme inline` Werte fest in die Klassen schreibt, wirkt die Live-Änderung
  über einen injizierten Stil (`.rounded-card { border-radius: … }` usw.). Speichern legt bzw.
  ändert die Override-Zeile im bestehenden `@theme inline`-Block von `brand.css`.
- **Schatten** (`--shadow-card`, `--shadow-btn`, `--shadow-raised`, `--shadow-overlay`, aus
  `foundation.css`): Textfeld; Speichern legt Overrides im passenden Block von `brand.css` an.

### Live-Wirkung
- Änderungen werden per `document.documentElement.style.setProperty` gesetzt – im Dunkelmodus
  nur, solange `.dark` aktiv ist. Umsetzung: zwei Override-Sätze (hell/dunkel) als generiertes
  `<style>` mit `:root:not(.dark){…}` und `:root.dark{…}`, damit der Moduswechsel die Änderungen
  des jeweils anderen Modus korrekt zeigt.
- Ungespeicherte Änderungen: Warnung beim Verlassen der Seite (`beforeunload`).

### Speichern
- Body: Liste `{ block: "root" | "dark" | "theme", name, value }`.
- Server ersetzt pro Eintrag **nur den Wert** zwischen `--name:` und dem nächsten `;` im richtigen
  Block, auch wenn mehrere Deklarationen in einer Zeile stehen (Töne). Kommentar dahinter bleibt.
- Fehlt die Variable im Block: neue Zeile am Ende des Blocks, Kommentar `/* [derived] set in preview */`.
- Herkunftsmarke `[derived]` (der Wert stammt nach der Änderung nicht mehr aus dem Manual):
  - Zeile mit eigenem Kommentar ohne `[derived]`: `[derived]` wird vorangestellt, der alte Text
    bleibt mit „was“ erhalten, z. B. `/* [derived] was grey-500 #82807c */`.
  - Zeile ohne Kommentar: `/* [derived] was #ffffff */` wird angehängt.
  - Mehrere Deklarationen in einer Zeile (Töne): ein Kommentar am Zeilenende je geänderter
    Variable, z. B. `/* [derived] --tone-blue-ink was #094b90 */`.
  - Schon `[derived]`: Kommentar bleibt unverändert.
  - Wird ein Wert später auf den Manual-Wert zurückgesetzt, entfernt die Vorschau die Marke
    nicht – das entscheidet Olaf beim Release mit Claude.
- Validierung vor dem Schreiben: Name passt auf `^--[a-z0-9-]+$`, Wert enthält kein `;`, `{`, `}`.
  Nach dem Schreiben lädt die Seite die Werte neu (Vite-HMR übernimmt das CSS).
- Antwort zeigt die Anzahl geänderter Werte; die Seite meldet „Gespeichert – jetzt in Claude
  ‚als neue Version freigeben‘“.

### Seiteninhalt (rechts)
Reihenfolge: Logo · Farbfelder (alle Tokens als Kacheln mit Name und Wert) · Typografie (`ui.h1`,
`ui.h2`, Fließtext, `ui.muted`, `ui.fieldLabel`, `ui.link`) · Buttons (alle Varianten × Größen, plus
disabled) · Chips und Töne (`ui.chip`, `filterChip` an/aus, `TONE_CHIP/SOLID/OUTLINE`, `TitleMark`) ·
Formular (`ui.label` + `ui.field`, ungültiges Feld) · Meldungen (`ui.error`, `ui.success`) · Karte
(`ui.card`) · Tabelle (`ui.table/th/td`) · Primitives (SidebarNav, GlideMenu, FilterTable,
SearchList, RecordsTable mit ihren eingebauten Beispieldaten).

Keine eigene Tooltip-Sektion: Das Paket hat keine Tooltip-Komponente (nur Markup in RecordsTable),
ein Nachbau wäre ein Anti-Ziel. Die Tooltip-Farben erscheinen in den Farbfeldern und im Kontrast.

### Kontrast
Feste Paarliste: ink/ink-2/ink-3 auf page/surface, accent-ink auf surface, je Ton ink auf tint,
on-tone auf Ton-ink, tooltip-fg auf tooltip-bg. Anzeige im Panel mit Verhältnis und AA/AAA.
Nur Hinweis, kein Speicher-Blocker. Halbtransparente Farben werden vor der Berechnung auf die
jeweilige Fläche gemischt.

## Von Claude entschieden (zur Prüfung durch Olaf)
- Änderungen wirken nur im bearbeiteten Modus (Dunkelwert wird beim Speichern festgehalten).
- Schreibweise der `[derived]`-Marke inkl. „was …“-Altwert.
- Keine Tooltip-Sektion.
- Kontrastanzeige als Hinweis, nicht als Sperre.
- Vite als Werkzeug für die Vorschau.

## Dem Bauenden überlassen
- Layout-Details des Panels (Breite, Einklappen, Suche nach Token-Namen).
- Wie das Parsen von `brand.css` umgesetzt wird (z. B. kleiner eigener Parser oder PostCSS),
  solange Kommentare und Formatierung erhalten bleiben.
- Tests: Unit-Tests für das Ersetzen in `brand.css` (Vitest als devDependency) sind Pflicht,
  weil das der riskanteste Teil ist; die Seite selbst wird von Hand geprüft.
- Kurzer Abschnitt in `README.md` und `ANLEITUNG.md` („Vorschau öffnen“).

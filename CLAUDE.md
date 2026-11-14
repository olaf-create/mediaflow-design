# @mediaflow/design – Mediaflow-Corporate-Design für interne Apps

Gemeinsames Design-Paket (Tokens, Tailwind-4-Theme, `ui.*`-Klassen, Komponenten) für Mediaflows
interne Next.js-Apps, aufgebaut auf Beautiful UI (MIT). Wird per Git-Tag aus GitHub installiert
(`github:olaf-create/mediaflow-design#vX.Y.Z`), nicht über npm. Entwickler: Olaf (allein).

## Bevor du arbeitest

- Lies `README.md` (Einbindung in Apps, Release-Ablauf) und `CHANGELOG.md`.
- Quelle der Markenwerte: Mediaflow Design Manual v2 (brand.mediaflow.site, 21.09.2026).
  Werte, die nicht im Manual stehen, bekommen in `css/brand.css` den Kommentar `[derived]`.
- Jede Änderung hier landet in allen Apps, die die neue Version installieren. Prüfe vorher,
  welche Apps betroffen sind (Abschnitt „Used by“ in `README.md`).

## Regeln (verbindlich)

1. **Beautiful UI liefert Struktur und Token-Namen, Mediaflow nur Werte.** Farben, Schatten,
   Schriften usw. werden in `css/brand.css` gesetzt (`:root` = hell, `.dark` = dunkel).
   Jeder neue Token braucht einen Wert für beide Modi.
2. **`css/beautifui/` bleibt vendored.** Nicht nebenbei ändern. Jede lokale Abweichung wird in
   `css/beautifui/README.md` unter „Local changes“ mit Datum notiert. Updates kommen aus dem
   Upstream-Repo, geschnitten an den Abschnitts-Bannern – nie aus der beautifului.dev-Registry.
3. **Importreihenfolge in `css/index.css` nicht ändern:** Beautiful UI → Brand-Tokens → App-Shell.
   `foundation.css` importiert bereits `tailwindcss`.
4. **Keine fest eingetragenen Farben** in `src/`. Nur Token-Klassen (`bg-surface`, `text-ink-2`,
   `shadow-card` …) bzw. `var(--…)`.
5. **App-spezifisches bleibt in der App** (welche Navigationsgruppe welchen Ton bekommt,
   Bereichs-Icons, Fonts per `next/font`). Hier nur, was mehrere Apps brauchen.
6. **Das Paket liefert TypeScript-Quellcode** (kein Build-Schritt). Apps brauchen
   `transpilePackages` und `@source` – siehe README. Neue Exporte in `src/index.ts` bzw. unter
   `src/primitives/*` (Pfad-Export) anlegen.
7. **Peer-Dependencies** (`react`, `tailwindcss`, `clsx`, `tailwind-merge`,
   `class-variance-authority`, `lucide-react`) nicht zu `dependencies` machen.

## Änderung und Release

1. Ändern, `npm run typecheck` grün.
2. Eintrag in `CHANGELOG.md` (Datum TT.MM.JJJJ), `version` in `package.json` erhöhen:
   - geänderte Werte → **Patch**
   - neue Tokens, Klassen, Komponenten → **Minor**
   - umbenannt oder entfernt → **Major** (im Changelog beschreiben, was Apps anpassen müssen)
3. Commit (Conventional Commits, Englisch), dann `git tag vX.Y.Z && git push && git push --tags`.
   Taggen und Pushen nur nach Rückfrage.
4. In jeder App: `pnpm add github:olaf-create/mediaflow-design#vX.Y.Z` (bzw. `npm install …`),
   Vercel-Preview prüfen, mergen. Neue Nutzer-Apps unter „Used by“ in `README.md` eintragen.

Zum Ausprobieren vor einem Release das Paket lokal in eine App verlinken
(`pnpm link ~/dev/mediaflow-design`) und danach wieder auf den Tag umstellen.

## Konventionen

- Code, Bezeichner, Commits, README: Englisch. Diese Datei: Deutsch.
- Kleine, fokussierte Commits. Changelog-Einträge beschreiben die sichtbare Wirkung.

## Befehle

- `npm install` – Dev-Abhängigkeiten
- `npm run typecheck` – TypeScript prüfen (einziger Check, es gibt keine Tests)

## Aufbau

```
css/
  index.css          Einstieg (Reihenfolge wichtig)
  beautifui/         Beautiful UI, vendored (foundation, sidebar-nav, records-table) + README
  brand.css          Mediaflow-Tokens hell/dunkel, Töne, --font-heading
  app-shell.css      Textgrößen-Zoomstufen für .app-content
src/
  index.ts           öffentliche Exporte
  styles.ts          ui.*-Klassen (card, field, table, chip, link …)
  tones.tsx          Tone, TONE_ICON/CHIP/SOLID/OUTLINE/HOVER, TitleMark
  Button.tsx         Pill-Button (cva)
  primitives/        Beautiful-UI-Komponenten (GlideMenu, SidebarNav, RecordsTable, FilterTable, SearchList)
  logo.ts            Mediaflow-Wortmarke als SVG-Pfade
  theme.ts           THEME_SCRIPT, FONT_VARIABLES
  utils.ts           cn()
```

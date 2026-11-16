# Das Mediaflow-Design ändern – Anleitung ohne Vorkenntnisse

Diese Anleitung erklärt, wie man Farben, Schriften, Schaltflächen oder andere grafische Details
der internen Mediaflow-Tools ändert – auch ohne Programmierkenntnisse. Die technische Arbeit
erledigt Claude Code; du sagst, was du willst, und prüfst das Ergebnis.

---

## Das Prinzip in einem Satz

**Das Aussehen aller internen Tools steht an genau einer Stelle: im Projekt `mediaflow-design`.**
Die einzelnen Tools (z. B. Competitive Intelligence, Marketing Management) holen sich das
Design von dort – wie Filialen, die alle dasselbe Corporate-Design-Handbuch benutzen.

Daraus folgt:

- Eine Änderung machst du **einmal** im Design-Projekt – nicht in jedem Tool einzeln.
- Die Tools übernehmen die Änderung **erst, wenn man es ihnen sagt**. Nichts ändert sich
  „aus Versehen“ überall gleichzeitig.

---

## Wichtige Begriffe

| Begriff | Bedeutung im Alltag |
|---|---|
| **Design-Projekt** | Der Ordner `mediaflow-design` – das zentrale „Design-Handbuch“ |
| **App / Tool** | Ein internes Programm, das das Design nutzt, z. B. Competitive Intelligence |
| **Version** | Ein eingefrorener Stand des Designs mit Nummer, z. B. `1.0.0` oder `1.1.0` |
| **Token** | Ein benannter Designwert, z. B. „Seitenhintergrund = Elfenbein #F7F4F1“ |
| **Preview** | Eine Vorschau-Version des Tools im Browser, bevor es live geht |
| **Changelog** | Das Änderungsprotokoll: was sich in welcher Version geändert hat |

---

## Ablauf einer Änderung

### Schritt 1 – Klar beschreiben, was sich ändern soll

Bevor es losgeht, kurz notieren:

- **Was** soll anders aussehen? (z. B. „Die Hauptschaltflächen sollen dunkelblau statt schwarz sein“)
- **Warum?** (z. B. „Neue Vorgabe im Design Manual“, „Schlecht lesbar“)
- **Gilt das für alle Tools?** Wenn nur ein einzelnes Tool betroffen ist, gehört die Änderung
  meist nicht ins Design-Projekt, sondern in das Tool selbst.
- **Hell und dunkel:** Die Tools haben einen hellen und einen dunklen Modus. Sag, ob du für
  beide eine Vorstellung hast – sonst schlägt Claude einen passenden Wert vor.

Hilfreich: ein Screenshot mit Markierung oder ein Farbwert aus dem Design Manual
(brand.mediaflow.site).

### Schritt 2 – Das Design-Projekt in Claude Code öffnen

1. Claude-App öffnen, Reiter **Code**.
2. Neue Session starten und als Ordner **`~/dev/mediaflow-design`** wählen
   (nicht das Tool, in dem dir die Änderung aufgefallen ist).
3. Claude kennt die Regeln des Projekts automatisch (sie stehen in der Datei `CLAUDE.md`).

### Schritt 3 – Claude die Änderung beschreiben

Einfach in normaler Sprache, zum Beispiel:

> „Die Hauptschaltflächen sollen Mediaflow-Blau statt Schwarz sein, im Dunkelmodus etwas heller.
> Bitte zeig mir vorher, welche Werte du änderst.“

Claude passt die Dateien an, prüft sie technisch und trägt die Änderung ins Änderungsprotokoll ein.

**Selbst ausprobieren: die Vorschau.** Farben, Schatten und Rundungen kannst du auch selbst
verändern. Sag Claude im Design-Projekt: „Starte die Design-Vorschau.“ Im Browser öffnet sich eine
Seite mit allen Elementen. Links stellst du Werte ein (für Hell und Dunkel getrennt), rechts siehst
du sofort die Wirkung. Eine Kontrastliste warnt, wenn Text schlecht lesbar wird. Mit **Speichern**
landen die Werte in der Design-Datei; danach geht es mit Schritt 5 weiter.

### Schritt 4 – Vorher anschauen

Bitte Claude, dir die Änderung **in einem Tool zu zeigen, bevor sie freigegeben wird**:

> „Zeig mir die Änderung bitte lokal in Competitive Intelligence.“

Claude startet das Tool dann auf deinem Rechner mit dem neuen Design. Schau dir an:

- die betroffenen Stellen im **hellen und dunklen Modus**,
- ob Texte noch gut lesbar sind,
- ob sich ungewollt etwas anderes verändert hat.

Passt etwas nicht, sag es Claude einfach – das ist der Moment für Korrekturen.

### Schritt 5 – Neue Version freigeben

Wenn alles passt:

> „Bitte als neue Version freigeben.“

Claude wählt die passende Versionsnummer, speichert die Änderung und veröffentlicht die neue
Version auf GitHub. Claude fragt vorher nach, bevor etwas veröffentlicht wird.

**Wie die Versionsnummer gewählt wird** (z. B. von `1.0.0` aus):

| Art der Änderung | Beispiel | Neue Nummer |
|---|---|---|
| Ein Wert ändert sich | Blau wird etwas dunkler | `1.0.1` |
| Etwas Neues kommt hinzu | Neue Farbe, neue Schaltflächen-Art | `1.1.0` |
| Etwas wird umbenannt oder entfernt | Eine Farbe fällt weg | `2.0.0` – die Tools müssen dann angepasst werden |

### Schritt 6 – Die Tools auf die neue Version umstellen

Jedes Tool wird **einzeln** umgestellt. Dazu in Claude Code eine Session **im jeweiligen Tool**
öffnen (z. B. `~/dev/mediaflow-competitive-intelligence`) und sagen:

> „Bitte auf mediaflow-design Version 1.1.0 umstellen und eine Preview erzeugen.“

Danach:

1. Die **Vercel-Preview** im Browser öffnen und kurz durchklicken.
2. Passt alles → Claude bitten, die Umstellung zu übernehmen (zu „mergen“).
   Erst dann sehen die Kolleginnen und Kollegen das neue Design.

Welche Tools das Design nutzen, steht in `README.md` unter „Used by“. Aktuell:

- Competitive Intelligence
- Marketing Management

---

## Was du besser nicht tust

- **Farben direkt in einem einzelnen Tool ändern.** Dann sieht dieses Tool anders aus als die
  anderen, und die Änderung geht beim nächsten Design-Update eventuell verloren.
- **Dateien im Ordner `css/beautifui/` ändern.** Das ist die übernommene Grundlage (Beautiful UI, ein frei nutzbares Design-System);
  Änderungen dort nur nach Absprache mit Olaf.
- **Eine Version freigeben, ohne sie vorher angeschaut zu haben** – sie landet sonst in allen
  Tools, die umgestellt werden.

---

## Wenn etwas schiefgeht

- **Neue Version sieht im Tool falsch aus:** Das Tool einfach nicht umstellen bzw. Claude bitten,
  es auf die vorherige Version zurückzusetzen. Die alten Versionen bleiben immer erhalten.
- **Unsicher, ob eine Änderung ins Design-Projekt gehört:** Claude fragen – oder Olaf.
- **Claude meldet einen Fehler bei der Prüfung:** Claude bitten, ihn zu beheben und zu erklären,
  was das Problem war.

---

## Kurzfassung

1. Änderung beschreiben (was, warum, hell/dunkel).
2. Claude Code im Ordner `mediaflow-design` öffnen und die Änderung beauftragen.
3. Lokal in einem Tool anschauen, ggf. korrigieren.
4. Als neue Version freigeben lassen.
5. Jedes Tool einzeln umstellen, Preview prüfen, übernehmen.

Ansprechpartner bei Fragen: Olaf.

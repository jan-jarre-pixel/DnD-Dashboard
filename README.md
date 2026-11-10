# D&D Command Center

Entwicklung ausschließlich in `jan-jarre-pixel/DnD-Dashboard`.

Verlustfreie Übernahme des D&D-Verzeichnisses aus `sideline26`, Commit
`94bc4c75a853b1f03508a4f56446b3c1a7e8386e`. Das Quellrepository bleibt unverändert.

Live (M0 und Phasen 1–7 lesend produktiv geprüft): https://jan-jarre-pixel.github.io/DnD-Dashboard/

Im GM-Spieltisch öffnet **Kampagnen** das Kampagnenbuch mit NPCs, Quests,
Gruppenjournal, Story Graph, Statblocks und Encounter-Planer. Die bestehende
Gruppe kann mehrere Kampagnen vorbereiten; eine neue Sitzung bestimmt die
Spielkampagne. Inhalte werden einzeln freigegeben. Anleitung und Abnahme:
[Phase 6](docs/PHASE-6.md).

Im Bereich **Inventar & Generatoren** verwaltet der GM persönliche Bestände,
Gruppentruhe und private Beute. Verbrauch, Heilung und Ressourcen werden atomar
bestätigt; lokale Generatoren übernehmen Ergebnisse einmalig als Gegenstände
oder Kampagnenentwürfe. [Anleitung und Abnahme: Phase 7](docs/PHASE-7.md).

## Lokal prüfen

Node >=22: `npm test`, `npm run build`.
Für Browserprüfungen: `npm ci`, dann `npx playwright install --with-deps`.
Optional vorhandenes Chromium über CHROMIUM_PATH verwenden:
`CHROMIUM_PATH=/usr/bin/chromium npm run test:browser`.
Die unveränderte Supabase-Bibliothek 2.119.0 liegt mit Lizenz und geprüftem
SHA-256 unter `public/vendor`; die Laufzeit benötigt kein CDN.
Ohne LOCAL_DB verwenden Browserprüfungen simulierte RPC-Antworten.
Mit `LOCAL_DB=1` verwenden sie echte lokale PostgreSQL-RPCs.
`BROWSER=chromium|firefox|webkit` wählt die Browser-Engine.
`CAMPAIGN_ONLY=1 BROWSER=chromium npm run test:multiplayer`
führt gezielt den Kampagnenablauf mit fünf Rollen und absichtlich verzögerten
Antworten aus. Er benötigt dieselbe vorbereitete isolierte lokale Testdatenbank.
`npm run test:layout` prüft lange native Kartennamen und die Tastaturauswahl
auf Desktop/Mobil ohne Datenbank; die Browserinstallation ist dafür erforderlich.
`INVENTORY_ONLY=1` führt entsprechend nur den Inventar-/Generatorablauf aus.
`npm run test:comfort` prüft die Komfort-/Offline-/PWA-Funktionen mit echter lokaler
Datenbank und Service Worker in `dist/`. Für lokale PWA-Nutzung `npm run build`
ausführen und `dist/` über HTTP bereitstellen. [Phase-8-Anleitung](docs/PHASE-8.md).
Die CI startet PostgreSQL ohne Netzwerk, initialisiert künstliche Testdaten
und prüft alle drei Browser einschließlich Speicherung. `npm run test:db` prüft
zusätzlich Rollen, Würfel, Geheimhaltung und parallele Anfragen lokal.
`NODE_USE_ENV_PROXY=1 node tests/live-readonly.cjs` prüft optional die reale API
mit ungültigen Testcodes und direkten Lesezugriffen, ohne Daten zu ändern.

`dist/` enthält ausschließlich die HTML-/JS-Einstiegspunkte, Laufzeitmodule,
öffentliche Stylesheets und `.nojekyll`; keine SQL-Dateien, Tests oder Sicherungen.
GitHub Pages muss im Repository unter Settings → Pages → Source auf
**GitHub Actions** eingestellt sein; dies ist für dieses Repository bestätigt.
PRs #1, #3, #5, #7, #9, #11, #13 und #15 sind integriert; Pages-Deployment und öffentliche Oberfläche sind geprüft.
Die bestehenden Codes bleiben gültig. Die neue Anwendung tauscht sie beim Login
gegen eine bis zu zwölf Stunden gültige Sitzung dieses Tabs aus.

## Struktur

Die bestehenden HTML-Einstiegspunkte bleiben im Root. `src/core` enthält Modell
und UI-Zustand, `src/data` die gemeinsame Auth-/Datengrenze, `src/ui` gemeinsame
Komponenten, `src/pages` die Seitenadapter und `src/legacy` den weiterverwendeten
Bogen-Renderer. `public/styles` enthält Design Tokens und Stylesheets.
`supabase/migrations` enthält neue additive Migrationen; die historischen
SQL-Dateien daneben bleiben unveränderte Audit-/Recovery-Unterlagen.
**Historische Setup-Dateien niemals erneut auf Produktion anwenden.**

- [Phase-7-Bericht: Inventar und Generatoren](docs/PHASE-7.md)
- [Phase-6-Bericht: Kampagnenverwaltung](docs/PHASE-6.md)
- [Phase-5-Bericht: Karten und VTT](docs/PHASE-5.md)
- [Phase-4-Bericht: Kampfmanager und My Turn](docs/PHASE-4.md)
- [Phase-3-Bericht: sichere Live-Ereignisse](docs/PHASE-3.md)
- [Phase-2-Bericht: Dashboards und Sitzungssteuerung](docs/PHASE-2.md)
- [Phase-1-Bericht und Sicherheitsentscheidungen](docs/PHASE-1.md)
- [Architektur](docs/ARCHITECTURE.md)
- [Migrationsbericht](docs/M0.md)
- [Roadmap](docs/ROADMAP.md)
- [Sicherung und Wiederherstellung](docs/BACKUP.md)
- [Historische Charakter-Dokumentation](docs/legacy-character-sheets.md)
- [Historische Multiplayer-Dokumentation](docs/legacy-multiplayer.md)

Historische Dokumentation beschreibt den alten Betrieb; aktuelle Prüfstände stehen
in M0.md sowie PHASE-1.md bis PHASE-7.md. Zugangscodes, private Spielstände und Sicherungen gehören niemals in Git.

Explizite lesende Produktionskontrolle: `npm run test:production`. Sie prüft
Desktop/Mobil mit ungültigen Codes und erzeugt keine bestätigten Spieleraktionen.

Mehrspieler-/Kampf-/Kartenprüfung lokal: `npm run test:multiplayer` (isolierte DB nötig).
Der authentifizierte Live-Transport verwendet die bestehende Supabase Edge Function
`dnd-events`; Deploymentquelle liegt unter `supabase/functions/dnd-events`.

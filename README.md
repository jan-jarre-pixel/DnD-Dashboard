# D&D Command Center

Entwicklung ausschließlich in `jan-jarre-pixel/DnD-Dashboard`.

Verlustfreie Übernahme des D&D-Verzeichnisses aus `sideline26`, Commit
`94bc4c75a853b1f03508a4f56446b3c1a7e8386e`. Das Quellrepository bleibt unverändert.

Live (M0 und Phasen 1–3 lesend produktiv geprüft): https://jan-jarre-pixel.github.io/DnD-Dashboard/

## Lokal prüfen

Node >=22: `npm test`, `npm run build`.
Für Browserprüfungen: `npm ci`, dann `npx playwright install --with-deps`.
Optional vorhandenes Chromium über CHROMIUM_PATH verwenden:
`CHROMIUM_PATH=/usr/bin/chromium SUPABASE_BROWSER_BUNDLE=/privater/pfad/supabase.js npm run test:browser`.
Der Bundle-Pfad muss die unveränderte Datei von
https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.0 enthalten.
Ohne LOCAL_DB verwenden Browserprüfungen simulierte RPC-Antworten.
Mit `LOCAL_DB=1` verwenden sie echte lokale PostgreSQL-RPCs.
`BROWSER=chromium|firefox|webkit` wählt die Browser-Engine.
Die CI startet PostgreSQL ohne Netzwerk, initialisiert künstliche Testdaten
und prüft alle drei Browser einschließlich Speicherung. `npm run test:db` prüft
zusätzlich Rollen, Würfel, Geheimhaltung und parallele Anfragen lokal.
`NODE_USE_ENV_PROXY=1 node tests/live-readonly.cjs` prüft optional die reale API
mit ungültigen Testcodes und direkten Lesezugriffen, ohne Daten zu ändern.

`dist/` enthält ausschließlich die HTML-/JS-Einstiegspunkte, Laufzeitmodule,
öffentliche Stylesheets und `.nojekyll`; keine SQL-Dateien, Tests oder Sicherungen.
GitHub Pages muss im Repository unter Settings → Pages → Source auf
**GitHub Actions** eingestellt sein; dies ist für dieses Repository bestätigt.
PRs #1, #3, #5 und #7 sind integriert; Pages-Deployment und öffentliche Oberfläche sind geprüft.
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
in M0.md sowie PHASE-1.md bis PHASE-3.md. Zugangscodes, private Spielstände und Sicherungen gehören niemals in Git.

Explizite lesende Produktionskontrolle: `npm run test:production`. Sie prüft
Desktop/Mobil mit ungültigen Codes und erzeugt keine bestätigten Spieleraktionen.

Phase-3-Mehrspielerprüfung lokal: `npm run test:multiplayer` (isolierte DB nötig).
Der authentifizierte Live-Transport verwendet die bestehende Supabase Edge Function
`dnd-events`; Deploymentquelle liegt unter `supabase/functions/dnd-events`.

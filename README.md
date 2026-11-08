# D&D Command Center

Entwicklung ausschließlich in `jan-jarre-pixel/DnD-Dashboard`.

Verlustfreie Übernahme des D&D-Verzeichnisses aus `sideline26`, Commit
`94bc4c75a853b1f03508a4f56446b3c1a7e8386e`. Das Quellrepository bleibt unverändert.

Zieladresse (noch nicht produktiv bestätigt): https://jan-jarre-pixel.github.io/DnD-Dashboard/

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

`dist/` enthält ausschließlich die vier Laufzeitdateien und `.nojekyll`.
GitHub Pages muss im Repository unter Settings → Pages → Source auf
**GitHub Actions** eingestellt werden. Veröffentlichung erst nach den M0-Abnahmen.

## Struktur

Die bestehenden Einstiegspunkte bleiben zunächst im Root, damit relative Links
unter `/DnD-Dashboard/` funktionieren. Kein Framework-Wechsel in der Migration.
`supabase/` enthält unveränderte historische SQL-Dateien, keine automatisch
auszuführenden neuen Migrationen. Insbesondere `schema.sql` enthält historische
Code-Prüfwerte und Setup-Logik: **niemals auf der bestehenden Datenbank neu ausführen**.
Künftige Migrationen kommen nach `supabase/migrations/`.

- [Migrationsbericht](docs/M0.md)
- [Roadmap](docs/ROADMAP.md)
- [Sicherung und Wiederherstellung](docs/BACKUP.md)
- [Historische Charakter-Dokumentation](docs/legacy-character-sheets.md)
- [Historische Multiplayer-Dokumentation](docs/legacy-multiplayer.md)

Historische Dokumentation beschreibt den alten Betrieb; aktuelle Prüfstände stehen
in M0.md. Zugangscodes, private Spielstände und Sicherungen gehören niemals in Git.

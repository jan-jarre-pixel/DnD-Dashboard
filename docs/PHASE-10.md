# Phase 10 – Sicherheitsabnahme, Gesamt-QA und Release

Status: **Abgeschlossen, veröffentlicht und lesend produktiv geprüft.** Arbeitspakete DND-SEC-001 und DND-QA-001.
Ausgangsstand: `758a04dd68c463f72b9fa357441a5966c1b2776f` (Phase 9).

## Behobene Befunde

| Befund | Auswirkung und Änderung | Regression |
| --- | --- | --- |
| S10-XSS-001 | Spielertext in Zauberplatz-Label/-Anzahl wurde in der GM-Gruppenübersicht als HTML ausgegeben. Gesamte Zelle wird jetzt escaped. Vorher im isolierten Browser mit harmlosem JavaScript-Marker reproduziert, danach kein Marker und keine injizierten Elemente. | `tests/render-security.test.cjs`, `tests/security-browser.cjs`: gespeicherter Spielertext → GM-Übersicht, eigener Editor, unveränderte Textwerte |
| S10-XSS-002 | Die frei bearbeitbare Platzstufe einer Kampfaktion wurde im Buttontext als HTML ausgegeben. Auch dieser Text wird jetzt escaped. | Eigener zuerst fehlgeschlagener Unitfall; Browser öffnet denselben Spielerbogen über die GM-Navigation und wechselt in den Kampfmodus. |
| S10-DOS-001 | Ressourcenanzahlen konnten beliebig viele interaktive Elemente erzeugen. Darstellung auf 30 Zeilen je Ressourcenliste und 99 Einheiten je Zeile begrenzt; nicht endliche Zahlen erzeugen keine Einheiten. Hinweis erklärt die Begrenzung. Gespeicherter Text und Export bleiben vollständig. | Zuerst fehlgeschlagene Mengen-/Zeilen-Unitfälle; Browser lädt 200 Zeilen mit jeweils einer Milliarde Einheiten und prüft die feste DOM-Obergrenze. |
| S10-A11Y-001 | Würfelpanel, Stammdaten, Fertigkeitsauswahl, Rettungswurf-Checkboxen und Textbereiche im alten Charaktereditor hatten keine programmatisch verbundenen Namen. Labels/IDs bzw. verständliche ARIA-Namen ergänzt; lesender Offline-Stand im Komfortdialog als benannten Bereich ausgezeichnet. | Axe-WCAG-A/AA, Labelklick fokussiert Namensfeld, Tab wechselt zum nächsten Stammdatenfeld. |
| S10-UX-001 | Der GM-Schreibschutz deaktivierte auch reine Charakterlinks in der Gruppenübersicht. Diese Navigation ist wieder bedienbar; Schreibaktionen bleiben gesperrt und serverseitig autorisiert. | Browser navigiert ohne JavaScript-Umgehung von Übersicht zu Charakter und Kampfmodus. |

## Sicherheitsgrenzen und Nachweise

| Grenze | Automatisierte Nachweise |
| --- | --- |
| Alle 41 Anwendungstabellen mit RLS; keine direkten Tabellenrechte für anon; nur 17 explizite öffentliche RPCs; alle 55 Funktionen mit leerem `search_path`; private Helfer und alte Claim-Funktionen nicht aufrufbar | `tests/db/security.cjs`; derselbe Katalogumfang am 11.11.2026 produktiv ausschließlich lesend kontrolliert |
| Servergebundene Identität, fremde Charaktere/GM-Aktionen, manipulierte Rolle/Actor, Ablauf, Widerruf, Code-Rotation, begrenzte Sitzungsanzahl | `tests/db/sessions.cjs`, `tests/db/integration.cjs`, `tests/auth.test.cjs` |
| Replay, abweichende Wiederholung, veraltete Versionen, konkurrierende Änderungen und verlorene Antworten | `tests/db/*concurrency.cjs`, `tests/db/sync.cjs`, `tests/db/inventory.cjs`, `tests/multiplayer.cjs` |
| Geheime Würfe/Notizen, private Kampagnen-/Inventarobjekte, versteckte Tokens und verdeckte Bildbytes | DB-Integration für Workspace, Kampf, Kampagne, Inventar, VTT und Sicht; echte Mehrspielerbrowser mit getrennten Kontexten |
| Türen/Bewegung gleichzeitig, Ebenenwechsel, Sicht-/Nebelgrenzen, Geometrie | `tests/db/vision.cjs`, `vision-concurrency.cjs` einschließlich acht Rennen und 500 deterministischer Geometriefälle |
| HTML-/Attribut-/Inline-Handler-Ausgabe, neue gespeicherte XSS-Fälle | Bestehende Escape-/Rendering-Units plus vier neue `render-security`-Units und `test:security` in jedem Browser |
| Private Offline-Notizen, fremde Identität, Logout/Ablauf, unklare Antworten, öffentliche PWA-Caches | `tests/comfort.test.cjs`, `tests/comfort-browser.cjs` mit synthetischen Identitäten und isolierter DB |

Die anonym aufrufbaren SECURITY-DEFINER-RPCs prüfen Codes bzw. opaque
Sitzungstoken intern. Öffentliche Aufrufbarkeit bedeutet keine anonymen Leserechte.
Die alten Code-RPCs bleiben kompatibel und verwenden dieselben Rollengrenzen;
sie erhalten dadurch keine neue Versionsgarantie. Individuelle Charakterwerte
bleiben bewusst editierbare D&D-Bogenwerte, keine serverseitige Anti-Cheat-Engine.

Es gibt keine SQL-/Schemaänderung in Phase 10 und keinen produktiven Schreibtest
mit echten Spielerzugängen. Eine frische private Anwendungssicherung wurde vor dem Release erfasst und
in zwei lokalen Datenbanken rekonstruiert, einschließlich unabhängigen
SQL-Dump-Restores: alle erfassten Zeilen aus 41 Tabellen, 55 Funktionsdefinitionen
und Funktionsrechte, RLS, Tabellen-/Spaltenrechte, Sequenzzustand und Trigger.
Dies sichert die Anwendung; vollständige verwaltete Auth-/Storage-Dienste sind
nicht enthalten. Die vorherigen privaten Sicherungen bleiben erhalten. Security-Advisor-Hinweise zu intern autorisierten Definer-RPCs, absichtlich
policylosen privaten RLS-Tabellen und ungenutzter Passwort-Auth werden getrennt
von tatsächlichen Zugriffsfehlern bewertet. Drei bekannte unindizierte Fremdschlüssel
und ungenutzte Indizes sind Betriebs-/Skalierungshinweise; der begrenzte Lasttest
liefert die konkrete Leistungsabnahme, keine Prognose unbegrenzter Skalierung.

## Gesamt-QA und Grenzen

Die CI führt Unit-/Buildprüfungen sowie die gesamte DB- und Browserfolge je in
Chromium, Firefox und WebKit aus. Neue `test:qa`-Prüfungen scannen zehn Oberflächen plus geöffnete Werkzeuge
in dunklem/hellem Farbschema und auf Desktop/Mobil: beide Gastseiten,
Spieler-Dashboard, Charaktereditor, Inventar, Journal, GM-Gruppenübersicht,
Sitzungsplanung, Kampagne und Gegenstände sowie das geöffnete Würfelpanel und den
Komfortdialog mit aufgeklappten Bereichen. Das ergibt 48 WCAG-Regelscans pro Engine
mit axe-core 4.14.0 (WCAG 2 A/AA, 2.1 A/AA und 2.2 AA). Dazu kommen Label-Fokus,
Tab-Reihenfolge und Gast-Reflow bei 320 CSS-Pixeln. Der Rollen-Smoke simuliert einen nicht verfügbaren Ereignisstream über einen
lokalen HTTP-503-Endpunkt. Dadurch prüft er den Polling-Fallback ohne künstliche
Cross-Origin-Fehler im WebKit-Testtransport; echte Seitenfehler und unerwartete
externe Anfragen bleiben harte Fehler. Die Mehrspielersuite betreibt separat den
tatsächlichen Ereignis-Handler.

Die bestehenden Rollen-/Layout-,
Komfort- und Mehrspielertests decken weitere interaktive Zustände, Dialoge,
Tastatursteuerung und reduzierte Bewegung ab.

Automatische Regelscans beweisen keine vollständige WCAG-Konformität. Physische
Screenreader-/Betriebssystemkombinationen und native App-Installation sind damit
nicht vollständig abgenommen. Verborgene und unbesuchte dynamische Zustände sind
nicht pauschal von den 48 Scans erfasst. Es gibt keine externe Penetrationstest-
Zertifizierung und keine Aussage über unbegrenzt große Kampagnen.

Der vorhandene Lastvertrag prüft 50 Tokens, 500 Objekte, 64 aktive Geometrien,
acht Sicht-Tokens und acht Lichtquellen mit SQL-Projektionen unter drei Sekunden.
Die CI protokolliert reale Zeiten pro Engine. Das ist ein reproduzierbarer lokaler
Regressionstest und kein SLA für Netzwerk oder gehostete Datenbank.

`npm audit` prüft die Entwicklungsabhängigkeiten; ein separates temporäres
Manifest prüft zusätzlich die veröffentlichte npm-Paketversion
`@supabase/supabase-js@2.119.0` samt den dabei aufgelösten transitiven Paketen.
Das liefert keine vollständige Komponentenliste des fertigen vendorten Bundles;
dessen unveränderter SHA-256 wird separat geprüft. Am 11.11.2026 keine
bekannten npm-Advisories in beiden Prüfungen. Diese Momentaufnahme ersetzt keine
laufende Abhängigkeitsüberwachung.

## Release-Abnahme

Vor Veröffentlichung muss die komplette CI am exakten PR-Head grün sein.
Anschließend Pages-Build am Merge prüfen und alle öffentlichen Build-Dateien
byteweise vergleichen. Beide Loginseiten auf Desktop/Mobil prüfen; produktive
API nur mit ungültigen Zugangsdaten testen. Gast-PWA öffentlich einrichten,
Backend-Anfragen blockieren und beide Einstiege offline ohne Identität öffnen.
Die konkreten Ergebnisse stehen unten; es wurden keine Originalcodes für positive Produktionstests benutzt.

Bei einem Fehler: Veröffentlichung stoppen; nach Merge einen Revert-PR des
Frontend-Fix-Commits erstellen, vollständige CI und Pages erneut prüfen. Bereits
eingerichtete PWAs übernehmen neue Bytes erst nach ausdrücklicher Aktualisierung
über die Komfort-Werkzeuge. Kein Datenbank-Restore für diesen Frontend-Release;
ein solcher Eingriff benötigt einen eigenen Wiederherstellungsauftrag nach
[BACKUP.md](BACKUP.md). Ein Revert würde die hier geschlossenen Ausgabelücken
wieder öffnen und ist deshalb nur als kurzfristige Rücknahme mit anschließender
Korrektur geeignet.


## Funktionsabnahme über alle Phasen

| Funktionsbereich | Abnahme im vollständigen Drei-Browser-Lauf |
| --- | --- |
| Auth und Rollen | Alle fünf Rollen auf Desktop/Mobil; Login, eigener Bogen, GM-Lesezugriff, Reload, Logout und Sitzungsschutz |
| Dashboards und Sitzungen | Gemeinsamer Bogenstand, Quick/Action/Full Sheet, Planen/Start/Pause/Ende, Archiv und private GM-Notizen |
| Multiplayer | Serverwürfe, Geheimhaltung, neue Sitzung, Wiederverbindung, verlorene Antworten, CAS-Konflikte und absichtlich verzögerte Antworten |
| Kampf | Initiative, Züge, Budgets, Schaden/Heilung/temp. TP, Ressourcen, Todesrettung, Konzentration und GM-Korrektur |
| Karten und erweiterte Sicht | Upload, Nebel, Tokenbesitz, Objekte, Raster/Messung/Ping, Wände/Türen, Licht/Dunkelsicht, Ebenen und tatsächliche GM-Spielervorschau |
| Kampagnen | NPCs, Quests, Journal, Story Graph, Statblocks, Encounter-Planung, explizite Freigaben und Kampagnenwechsel |
| Inventar | Private Beute, Charakter-/Gruppenbestände, Transfer, einmaliger Verbrauch/Heilung, gewichtete Generatoren und Replay-/Rennschutz |
| Komfort/PWA | Rollenrichtige Suche, Tastatur, Importvorschau/Export, verschlüsselte eigene Entwürfe, Versionskonflikte, Offline-Start, ausdrückliches Update und Logout-Purge |

## Verifizierter Abschluss am 11.11.2026

- [Implementierung PR #21](https://github.com/jan-jarre-pixel/DnD-Dashboard/pull/21), Head `01cb4de1273932991d262983f0bfd029c34e06e0`, Merge `8380122ab7ba42b4a472c8e90ecf72d96e8938c8`. Merge-Baum identisch zum geprüften Head: `d747272710d5e4f7f055fe0f67c72b73a93616fb`.
- [CI 43022331214](https://github.com/jan-jarre-pixel/DnD-Dashboard/actions/runs/43022331214): Verify und alle drei Datenbank-/Browser-Jobs erfolgreich. 58 Unitprüfungen, 197 DB-Szenarien plus bestehende Parallelität, acht Tür-/Bewegungsrennen und 500 Geometriefälle; 30 Rollen-/Viewport-Szenarien; drei neue Security-Browserabläufe und 144 WCAG-Regelscans; komplette Komfort- und Mehrspielersuite in allen drei Engines.
- Lastvertrag mit 50 Tokens/500 Objekten/64 Geometrien bestanden; lokale Licht-/Dunkelprojektion 303/281 ms einschließlich Prozessaufruf, jeweils unter dem SQL-Limit von drei Sekunden. CI prüft dasselbe Limit je Engine.
- [Pages 43027540722](https://github.com/jan-jarre-pixel/DnD-Dashboard/actions/runs/43027540722) erfolgreich; alle 40 öffentlichen Build-Dateien einschließlich Service Worker bytegleich. Private Backups, SQL und Tests sind nicht Teil des Builds.
- 23 echte API-Ablehnungsprüfungen; beide Loginseiten bei 1440/390 Pixeln mit ungültigen Codes geprüft; öffentliche Gast-PWA mit 40 Cacheeinträgen, beide Einstiege offline, keine Identität/privaten Notizen und keine Backend-Anfrage.
- Produktiver Katalog: 41 RLS-Tabellen, 55 Funktionen, 17 erwartete anon-RPCs, keine privaten Schema-/Funktionsrechte und keine anon-Tabellen-/Spaltenrechte. Bekannte Advisor-Grenzen wie oben; keine neue Sicherheitswarnung durch Phase 10.
- Private Prüfprotokolle, frische Anwendungssicherung, wiederhergestellter SQL-Dump, finales Quell-Bundle und SHA-256-Dateiliste liegen außerhalb von Git unter `/workspace/private-dnd-backup/phase10/`. Workspace-Dateien privat dauerhaft extern sichern.

Keine blockierenden Befunde im beschriebenen Abnahmeumfang. Die oben genannten
Grenzen für vollständige WCAG-Zertifizierung, physische Assistenztechnik,
verwaltete Auth-/Storage-Sicherung und unbegrenzte Skalierung bleiben ausdrücklich
bestehen. Installierte PWAs über **Suche & Werkzeuge → App installieren & Tastatur →
Offline-App einrichten / auf Updates prüfen → Neue App-Version laden** aktualisieren,
damit auch vorhandene Offline-Installationen die Sicherheitskorrekturen erhalten.

# Phase 3 – Sichere Live-Ereignisse und Versionskonflikte

Status: Abgeschlossen, integriert und veröffentlichte Version lesend produktiv bestätigt
(2026-11-09). Positive Rollen-/Speicher-/Replay-Abläufe sind isoliert getestet;
keine Produktions-Spieltests mit Originalcodes.
Arbeitspaket DND-RT-001. Entwicklung ausschließlich im neuen Repository.

## Geliefertes Verhalten

- Ein GM und vier Spieler erhalten synchronisierte öffentliche Würfe, TP,
  Ressourcen-/Charakteränderungen, Zustände, Sitzungs- und Szenenänderungen.
- Ein dauerhafter, serverseitig gefilterter Ereignisstrom liefert eindeutige
  Event-UUIDs, Spielrunden-ID, Empfängersequenz und Serverzeit. Geheime Würfe,
  private Arbeitsstände und GM-Notizen erzeugen ausschließlich GM-Zustellungen.
  Private Inhalte werden niemals als unsichtbares Spieler-HTML übertragen.
- Automatische Wiederverbindung mit Backoff/Jitter, erneute Verbindung vor dem
  Free-Limit, Wiederaufnahme am zuletzt vollständig verarbeiteten Cursor und
  Entdoppelung. Nach zwei Transportfehlern autorisierter RPC-Ersatzabruf;
  der Stream wird nach einer Minute erneut versucht.
- Online-Anzeige stammt aus servergebundenen Heartbeats, auch am Charakterbogen.
  Mehrere Tabs zählen weiterhin als ein Charakter. Offline spätestens nach dem
  vorhandenen 50-Sekunden-Timeout plus nächstem Statusabgleich, kein vorgetäuschter
  sofortiger Disconnect. UI zeigt Live/Ersatzabruf/Offline/Wiederverbindung.
- Charakteränderungen nutzen serverseitige Versionsvergleiche und unveränderliche
  Request-IDs. Gleichzeitige Bearbeitung überschreibt keinen neueren Stand:
  Konfliktpanel behält den Entwurf, erlaubt Kopieren und bewusstes Laden des
  aktuellen Serverstands. Laufende Leseantworten verdrängen keine neuen Eingaben.
- Schaden, Heilung und Ressourcenstände werden serverseitig begrenzt; wiederholte
  Netzwerkanfragen wenden denselben Snapshot nicht zweimal an. Komplexe Kampf-
  und Verbrauchsregeln bleiben den Phasen 4 und 7 zugeordnet.
- Würfe verwenden einen gemeinsamen Request-Manager: parallele identische Aufrufe
  und Wiederholungen nach verlorener Antwort verwenden dieselbe ID. RNG bleibt
  serverseitig. Neue Würfe adressieren ausdrücklich die aktuelle Spielrunde.
- Gemeinsame Session-Ereignisse am Spieltisch, getrennt vom Würfelverlauf.
  Abmeldung/Ablauf beendet Streams und entfernt private Verlaufsdaten aus dem DOM.

## Transportentscheidung und kostenlose Infrastruktur

Die reale öffentliche Auth-Konfiguration wurde geprüft: Anonymous Auth ist aus.
Es existiert kein für die bisherige Code-Anmeldung verwendbarer Auth-JWT.
Deshalb werden keine privaten Broadcast-/Presence-Kanäle unter dem öffentlichen
API-Key geöffnet und keine benutzergesteuerten JWT-Metadaten als Rechte benutzt.

Stattdessen: POST-basierter SSE-Stream in der bestehenden Supabase Edge Function
`dnd-events`. Er verwendet ausschließlich den bestehenden öffentlichen/anon
API-Zugang und das befristete Sitzungstoken; kein service_role-Schlüssel und
keine neuen Benutzerkonten, Projekte, Abos oder kostenpflichtigen Funktionen.
Die Function hat Gateway-JWT-Prüfung aus, weil sie vor Ausgabe der Stream-Header
und bei **jedem** Datenabruf selbst das Sitzungstoken serverseitig prüft.
Eine Verbindung unter einem öffentlichen API-Key allein genügt nicht.

Der Worker pollt das kleine private Ereignisprotokoll alle zwei Sekunden,
verarbeitet Rückstand seitenweise ohne künstliche Pause und beendet sich nach
etwa 95 Sekunden (Free-Wallclock-Limit 150 Sekunden). Das ist ein autorisierter
Ereignisstream, **kein Supabase-Realtime-WebSocket**. Bestehende Daten werden nicht
in eine öffentliche Realtime-Publikation aufgenommen. Rechte bleiben in SQL.

Bei fünf dauerhaft verbundenen Tabs grob 190 Stream-Aufrufe pro Stunde,
bei einer wöchentlichen fünfstündigen Runde grob 4.100 pro Monat; zusätzliche
Tabs/Abbrüche erhöhen den Verbrauch. Das sind Berechnungen, keine Abrechnung.
DB-Ereignisabfragen etwa 2,5/s bei fünf Tabs, Heartbeat-Schreibzugriffe höchstens
alle 15 Sekunden je aktivem Charakter, weitere UI-Snapshots nur bei Änderungen
und als Sicherheitsabgleich. Keine garantierte Latenz oder dauerhafte kostenlose
Kapazitätszusage über die dokumentierten Free-Limits hinaus.

Quellen (aktuell geprüft):
[Edge-Limits](https://supabase.com/docs/guides/functions/limits),
[Realtime-Autorisierung](https://supabase.com/docs/guides/realtime/authorization),
[Realtime-Schema-Lockdown](https://supabase.com/changelog/realtime-schema-locked-down-against-modification).
Es wird ausschließlich die eigene private Anwendungsschema-Struktur erweitert.

## Datenbank und Sicherheit

Migration `20261109070924_phase3_event_sync.sql`: vier neue private Tabellen
`character_versions`, `sync_cursors`, `sync_events`, `sync_commands`, RLS aktiv,
keine direkten Rechte für anon/authenticated. Keine bisherigen Zeilen umgeschrieben.
Neue RPCs `dnd_sync_call` und `dnd_sync_poll` prüfen immer die bestehende Identität;
Rolle/Empfänger kommen nie aus Client-Metadaten. Hilfsfunktionen sind privat,
EXECUTE entzogen, SECURITY DEFINER mit leerem search_path.

- Ereignisse entstehen innerhalb derselben Transaktion wie die Änderung.
  Eine Sperre ordnet Zustellungen nach Commit-Reihenfolge; ein uncommitteter
  höherer Sequenzwert kann nicht übersprungen werden. Rollbacks erzeugen keine
  bestätigten Ereignisse. Jeder Empfänger hat eigene Sequenzen, geheime Aktionen
  verschieben deshalb keine Spieler-Cursor.
- Cursor, Retentionsgrenze und Seite werden konsistent in einem SQL-Snapshot
  gelesen. Seiten maximal 100 Ereignisse, maximal 5.000 je Empfänger. Ältere
  Cursor fordern einen vollständigen aktuellen Snapshot an. Das ist keine
  unbegrenzte Offline-Historie; Würfel und Recaps bleiben separat gespeichert.
- Commands binden UUID, Akteur, Aktion und vollständigen Payload-Hash. Caches
  werden nach 24 Stunden bereinigt, also später als die maximale 12-Stunden-
  Sitzung. Obergrenze 10.000 neue Befehle je Akteur in diesem Zeitraum;
  gecachte Wiederholungen bleiben abrufbar. Keine Ressourcen-Doppelbuchung
  durch dieselbe bestätigte Anfrage. Persistiert werden Versionen/Resultate,
  keine vollständigen Charakterkopien im Command-Cache.
- Auch historische Schreibzugriffe erhöhen die aktuelle Charakterversion.
  Die unveränderten alten Code-RPC-Signaturen und Rechte bleiben erhalten.
  Alte Clients liefern keinen Versionsparameter; deren autorisierte Schreibwege
  bleiben aus Kompatibilitätsgründen ohne CAS. Neue Clients erkennen alte
  Zwischenänderungen vor dem Speichern und laden spätere Änderungen live nach.
- Historischer Würfelendpunkt erhält strengere Prüfung von Label, Sichtbarkeit,
  Vorteil und Formel bei Request-Wiederholung sowie dieselbe Session-Sperre.
  Erwartete Session-ID wird zusätzlich von der neuen Sync-API geprüft.
- Tokens ausschließlich im POST-Body/sessionStorage, nicht in URLs, Logausgaben,
  Ereignissen, UI-Store oder Git. Keine Events/GM-Inhalte dauerhaft im Browser
  gecacht. Offline-Entwürfe sind weiterhin flüchtig; keine bestätigten Offline-Würfe.

## Qualitätssicherung

- Bestehende Phasenprüfungen bleiben erhalten.
- Node: Stream-Authentifizierung, Origin/Method/Größenlimits, Widerruf, Cursor,
  Fehler ohne Datenleck und unveränderlicher Würfel-Retry nach verlorener Antwort.
- DB: Rollen/IDOR, CAS, sichere Grenzen, alte Clients, private Empfängersequenzen,
  vollständige Replay-Prüfung, Sitzungsbindung, Pagination, Rollback/Retention,
  direkter Tabellen-/Helper-Zugriff und Widerruf.
- Isolierter Lasttest: 50 Würfe über fünf gleichzeitige Akteure, fünffacher
  identischer Retry und zwei konkurrierende Charakterversionen.
- Echte HTTP-SSE-Handler und PostgreSQL-RPCs mit fünf gleichzeitigen Browserrollen,
  zusätzlichen Konflikttabs, öffentlichem/geheimem Wurf, TP/Zuständen, Offline-
  Presence, verpasstem Ereignis, Erneuerung und Widerruf. Nur die Zieladresse des
  Edge-Transports wird lokal umgeleitet; keine simulierte Speicherung.
- Erste lokale Chromium-Messung: 3.258 ms von fünf parallelen Würfelklicks bis
  Darstellung bei allen fünf Rollen, bei lokaler Test-Pollpause 400 ms. Enthält
  Browser-/Docker-/DB-Zeit, ist keine produktive Netzwerklatenz.
- Privates Vorher-Backup isoliert wiederhergestellt: alle 13 bestehenden Tabellen
  und alle bisherigen Funktions-OIDs bleiben nach Migration identisch.

## Grenzen und nächster Schritt

Keine gemeinsamen Initiative-/My-Turn- oder Tokenobjekte vor ihrer tatsächlichen
Implementierung in Phase 4/5; ebenso keine vorgetäuschte Quest-/Handout-Verwaltung.
Der Zustellmechanismus ist für künftige freigegebene Objekte erweiterbar.
Vollständige Kampfautomatisierung folgt als DND-COMBAT-001.

Positive Produktions-Spieltests mit Originalcodes werden nicht behauptet.

## Bisherige Integrationsnachweise

- PR #7: https://github.com/jan-jarre-pixel/DnD-Dashboard/pull/7 .
- Erste vollständige grüne Drei-Browser-CI auf baea00204a2f736dd130a57bb9f8ab36b420cd27:
  https://github.com/jan-jarre-pixel/DnD-Dashboard/actions/runs/42576858527 .
  31 Node-Prüfungen, 65 DB-Szenarien plus Parallelitäts-/Lastprüfungen,
  30 Rollen-/Viewport-Abläufe und je ein paralleler Mehrspieler-Durchlauf
  in Chromium, Firefox und WebKit erfolgreich.
- Produktive Migration erfolgreich als Version 20261109070924 registriert.
  Dateiname an die tatsächliche Historie angepasst, SQL-Inhalt identisch.
- Alle 13 bisherigen Tabellen unmittelbar vor/nach Migration identisch;
  alle bestehenden Funktions-OIDs und Ausführungsrechte ebenfalls identisch.
- Vier neue private Tabellen mit RLS; anon/authenticated haben keine Leserechte.
- `dnd-events` Version 1 aktiv, beide Quelldateien identisch zur lokalen Prüfung.
  Versionierte CLI-Konfiguration dokumentiert die eigene Tokenprüfung.
- 18 echte lesende API-/Edge-Prüfungen bestanden: direkte Tabellenzugriffe,
  alte und neue ungültige Sitzungsanfragen, Function-Authentifizierung vor
  Streambeginn, falsche Origin, Methode, Eingabe und erlaubtes CORS-Preflight.
- Advisor meldet beabsichtigte RLS-ohne-Policy-Sperren und anon-aufrufbare,
  intern tokengeprüfte SECURITY-DEFINER-RPCs; außerdem den bisherigen Hinweis
  auf Leaked-Password-Protection für die hier nicht verwendete Passwortanmeldung.
  [RLS-Hinweis](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy),
  [RPC-Hinweis](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable).

Frontend regulär integriert und veröffentlicht; abschließende CI und lesende
Produktionskontrolle erfolgreich, siehe Abschlussnachweise.

Zwischenbefunde sind behoben: Die lokale Erstprüfung fand einen mehrdeutigen
SQL-Variablennamen im neuen CAS-Pfad; korrigiert vor jeder produktiven Migration.
CI 42577841207 erkannte nach dem Dateinamensabgleich zwei identische Migrationen;
der zusätzliche alte Pfad wurde im Entwicklungsbranch entfernt. CI 42577948459
bestand Chromium/WebKit, scheiterte in Firefox an einer zu frühen Replay-Assertion:
der Statusabgleich hatte den Wurf schon dargestellt, der Stream noch nicht geliefert.
Der Test wartet jetzt ausdrücklich auf die Ereigniszustellung und prüft danach
weiterhin genau eine UUID. Keine Assertion entfernt, kein Test übersprungen;
abschließender Drei-Browser-Lauf erfolgreich. Backendcode dadurch nicht verändert.


## Abschlussnachweise

- Implementierung: ab62069f8cc59251ead25fbc5dd531fcda3206c2.
- [Finale grüne CI](https://github.com/jan-jarre-pixel/DnD-Dashboard/actions/runs/42578895004):
  Chromium, Firefox und WebKit einschließlich parallelem Mehrspieler-Test bestanden.
- PR #7 regulär integriert: 1e0638b14ff763a83a64de17e5cf7f36f5d198b5.
- [Erfolgreiches Pages-Deployment](https://github.com/jan-jarre-pixel/DnD-Dashboard/actions/runs/42579517250).
- Zieladresse https://jan-jarre-pixel.github.io/DnD-Dashboard/ bestätigt.
  Beide echten Login-Einstiege bei 1440×900 und 390×844 lesend geprüft;
  ungültige Codes abgewiesen, keine akzeptierten Testsitzungen/Spieleränderungen.
  Alle 20 Laufzeitdateien bytegleich zum geprüften Build. 18 reale API-/Edge-
  Prüfungen erneut bestanden. Positive autorisierte Streamtests bleiben isoliert;
  produktiv sind Endpoint, Quellgleichheit, CORS und Zugriffssperren bestätigt.
- Nachher-Sicherung aller 17 Anwendungstabellen exakt in isolierter Kopie
  wiederhergestellt. Private Sicherung mit Migration, Function-Quellen und
  Git-Bundles bleibt außerhalb des öffentlichen Repositorys.
- `sideline26` unverändert auf 94bc4c75a853b1f03508a4f56446b3c1a7e8386e.
- Keine offenen blockierenden Phase-3-Befunde. Bewusste Grenzen bleiben erhalten:
  Legacy-Clients ohne CAS, begrenzter Replay-Puffer, flüchtige Offline-Entwürfe,
  serverseitiger 2-Sekunden-Ereignisabruf statt WebSocket. Keine behaupteten
  produktiven Latenzgarantien oder vollständige WCAG-/Gerätezertifizierung.
- Nächstes Paket: DND-COMBAT-001 / Phase 4 – gemeinsamer Initiative-/Kampfmanager,
  Runden, Gegner, Zustände und My-Turn-Modus.

## Veränderte Dateien

- Oberfläche/Anbindung: index.html, spieltisch.html, online.js;
  public/styles/components.css; src/ui/shell.js; src/pages/tabletop.js,
  src/pages/character-dice.js; src/data/client.js und src/data/live.js.
- Backend: supabase/config.toml; supabase/functions/dnd-events/index.ts,
  supabase/functions/dnd-events/handler.mjs;
  supabase/migrations/20261109070924_phase3_event_sync.sql.
- Prüfungen: package.json, .github/workflows/checks.yml; tests/auth.test.cjs,
  tests/stream.test.cjs, tests/live-readonly.cjs, tests/multiplayer.cjs;
  tests/db/setup.cjs, tests/db/rpc.cjs, tests/db/sync.cjs,
  tests/db/sync-concurrency.cjs.
- Dokumentation: README.md, docs/ARCHITECTURE.md, docs/ROADMAP.md, docs/PHASE-3.md.

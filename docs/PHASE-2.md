# Phase 2 – Rollenadaptive Dashboards und Sitzungssteuerung

Status: Abgeschlossen, integriert und veröffentlichte Version lesend produktiv bestätigt
(2026-11-09). Pakete: DND-PLAYER-001, DND-GM-001. Positive Rollen-/Speicherabläufe
sind mit echten isolierten PostgreSQL-RPCs getestet; keine Live-Spieltests mit Originalcodes.

## Spieleroberfläche

- Sechs erreichbare Bereiche: Dashboard, Charakter, Aktionen & Zauber, Inventar,
  Journal & Quests, Spieltisch. Auf kleinen Geräten feste kompakte Navigation.
- Quick View: Name/Klasse/Stufe, TP/Maximum/temporäre TP, RK, Bewegung,
  Inspiration, Ressourcen, Zustände und veröffentlichte aktuelle Sitzung/Szene.
  Der letzte eigene öffentliche Initiativwurf der aktuellen Sitzung ist sichtbar.
- Action View: bestehende Angriffe, Aktionen, Bonusaktionen, Reaktionen, Zauber
  und Ressourcenknöpfe. Full Sheet: vollständiger weiterverwendeter Bogen.
  Alle Ansichten verwenden dasselbe normalisierte Objekt S[character]; keine
  widersprüchlichen Datenkopien oder zweite Charakterverwaltung.
- Direkte Schaden-/Heilungseingabe, Initiative, Fertigkeits-/Rettungswürfe,
  Angriffe/Zauber, kurze und bestätigte lange Rast. Schaden/Heilung akzeptiert
  nur ganze positive Beträge. Würfe bleiben servergeneriert und sitzungsgebunden.
- Zustände manuell hinzufügen/entfernen. Keine vorgetäuschte automatische
  Regelentscheidung, keine gemeinsame Initiative oder My-Turn-Anzeige (Phase 4).
- Bestehendes Inventar direkt bearbeitbar. Gegenstandsverwendung kann bewusst
  als Journalnotiz erfasst werden; Bestandsänderungen bleiben manuell.
  Mengenprüfung, atomarer Verbrauch und automatische Effekte folgen in Phase 7.
- Bestehendes Journal plus persistente persönliche Quest-Notizen. Diese gehören
  zum Charakterbogen, sind für den jeweiligen Spieler und die Spielleitung
  lesbar; keine Freigabe für andere Spieler. Gemeinsame Quests mit Status und
  feinen Sichtbarkeiten folgen in Phase 6.

## GM Control Room

Desktop: linke Arbeitsnavigation, mittige Session-/Vorbereitungsfläche und
rechtes ein-/ausklappbares Kontextpanel mit ausgewähltem Spieler, Status,
letzten Würfen und privaten Live-Notizen. Auf kleinen Geräten: eigenständige
Anordnung mit erreichbarer Arbeitsnavigation, Spielerstatusband, schnellen
Würfen und standardmäßig geschlossenem Kontextpanel.

- Live-Session, Vorbereitung, Spielerstatus und Protokolle sind echte Bereiche.
  Noch nicht implementierte Karten-/NPC-/Asset-Werkzeuge werden nicht als
  funktionslose Menüpunkte angeboten.
- Vorbereitungsmodus speichert Titel, Szenenentwurf, Gruppeninfo-Entwurf und
  private Notizen. Live-Modus priorisiert Szene, Session-Steuerung und Würfel.
  Das Wechseln der Ansicht pausiert keine laufende Spielrunde.
- Gespeicherten Plan starten oder unmittelbar eine neue Sitzung beginnen.
  Pause, Fortsetzung und Ende benutzen die bestehende Sitzungslogik.
- Szene/Gruppeninfo werden ausdrücklich veröffentlicht. Entwürfe und private
  Notizen werden serverseitig von Spielerantworten ausgeschlossen.
- Sitzungsende erstellt dauerhaft ein Protokoll mit Zeitpunkten, serverseitiger
  Dauer, gesicherten Vorbereitungs-/Live-Notizen und Veröffentlichungsstand.
  Strukturierter Recap für Ereignisse, Kämpfe, entdeckte Quests, Gegenstände,
  offene Aufgaben und GM-Notizen; späteres Laden/Bearbeiten möglich.
- Pläne/Recaps/Veröffentlichungen haben Versionsprüfungen. Konflikte bleiben
  sichtbar und überschreiben die Eingaben im Formular nicht. Seitenweise Listen
  verhindern, dass ältere Protokolle nach 50 Einträgen unzugänglich werden.
- Ungespeicherte Änderungen warnen vor Verlassen/Abmelden. Das ist keine
  dauerhafte Offline-Warteschlange: Entwürfe sind flüchtiger Arbeitsspeicher.
  Abmeldung/Sitzungsablauf entfernt private Formulardaten aus der Oberfläche.

## Datenmodell, Sicherheit und Migration

Vier neue Tabellen ausschließlich in game_private, jeweils RLS aktiviert und
keine direkten Rechte für anon/authenticated:

- session_plans: versionierte Vorbereitung, Verknüpfung zur gestarteten Runde.
- session_workspace: ausdrücklich veröffentlichte Szene/Gruppeninfo und aktiver Plan.
- session_archives: dauerhafte Sitzungsprotokolle mit versionsgeprüftem Recap.
- workspace_commands: Idempotenzschlüssel, Payload-Prüfwert und Ergebnis.

Ein neuer RPC dnd_workspace_call prüft das Phase-1-Sitzungstoken. Nur snapshot
ist für Spieler erlaubt. Owner-Listen, private Pläne, Protokolle und sämtliche
Änderungen verlangen die serverseitige Owner-Rolle. Keine Client-Metadaten
entscheiden über Rechte. Snapshot-Antworten werden aus einem konsistenten
Datenbanksnapshot gebaut; private Felder fehlen in Spielerantworten vollständig.

Mutation und Idempotenzprüfung laufen atomar unter derselben Workspace-Sperre.
Wiederholte Request-IDs mit verändertem Payload werden abgewiesen. Pause/Ende/
Fortsetzung prüfen zusätzlich die adressierte Spielrunde; ein veralteter Workspace-Stand kann
nicht versehentlich die nächste Runde beenden. Die historischen Code-RPCs
behalten ihr bisheriges Aufrufverhalten ohne zusätzlichen Session-ID-Parameter. Versionsprüfungen sichern Pläne,
Veröffentlichungen und Recaps gegen unbeabsichtigtes Überschreiben.

Der bisherige dnd_gm_manage-Endpunkt behält Signatur, Rechte und Funktionsidentität;
sein getesteter Legacy-Kern wird privat weiterverwendet. Auch Endsitzungen über
die unveränderte Rückfallseite erzeugen jetzt Protokolle. Der Wrapper archiviert
innerhalb derselben Transaktion, ohne vorherige Spielstände zu löschen.

Die vorhandenen write_character- und dnd_session_call-Funktionen erhalten ihre
Signaturen/Rechte ebenfalls. Schreibzugriffe verbinden vorhandenes JSONB mit
explizit gelieferten Feldern, damit ältere Clients unbekannte Erweiterungen nicht
entfernen. Das ersetzt keine vollständige Versionsprüfung gleichzeitiger
Charakteränderungen: Last-write-wins für dieselben Felder bleibt bis Phase 3.

Neue optionale Charakterfelder: conditions, questNotes und status. Bestehende
Charaktere, Codes und Anmeldesitzungen werden durch die Migration nicht verändert.
Schema und Funktionen bleiben auf dem vorhandenen kostenlosen Supabase-Projekt.

## Tests und Prüfstand

- 27 Node-Prüfungen: bisherige Architektur-/Auth-/Kontrast-/Buildprüfungen,
  zusätzliche Ansicht-/XSS- und Erweiterungsdaten-Prüfungen.
- Bestehende 16 DB-Szenarien, Parallelität/Recovery und 17 Auth-Szenarien.
- 16 neue Workspace-Szenarien: Rollen, unveröffentlichte/private Daten, CAS,
  Idempotenz, Session-ID-Bindung, Lebenszyklus, dauerhaftes Archiv, immutable
  Serverzeiten, Pagination, Legacy-Kompatibilität, unbekannte Charakterfelder,
  gültige Unicode-Notizen und Eingabegrenzen.
- Erweiterte Browserabläufe für alle fünf Rollen bei Desktop/Mobil: drei
  Charakteransichten, echte Speicherung auf lokaler DB, Schaden, Bedingungen,
  Inventar/Journal/Quest-Notizen, Initiative, Rast und kompletter GM-Zyklus mit
  Plan, verlorene Proxy-Antwort nach Commit mit sicherem Retry, Start/Pause/
  Fortsetzen, Veröffentlichung, Ende und erneut geladenem Recap.
- Frisches privates Backup vor Migration; auf einer lokalen Kopie wiederhergestellt.
  Migration erhält alle neun bisherigen Anwendungstabellen und die Identitäten
  der drei bisherigen RPC-Funktionen. Keine Tests schreiben echte Spielerwerte.
- npm audit: keine bekannten Schwachstellen im Lockfile-Stand.
- Finale Chromium-/Firefox-/WebKit-CI erfolgreich: 30 Rollen-/Viewport-Szenarien.
  Veröffentlichte Version auf Desktop/Mobil lesend geprüft; elf reale API-
  Ablehnungen bestanden. Alle 19 Laufzeitdateien bytegleich zum geprüften Build.

Es werden keine Live-Spieltests mit privaten Originalcodes behauptet.

## Betrieb und Grenzen

- Migration erst nach privater Sicherung und lokaler Prüfung; Frontend erst nach
  erfolgreicher Migration und CI regulär integrieren. Die bisherige Website
  bleibt unverändert. Keine kostenpflichtigen Dienste oder Kontingente aktiviert.
- Bestehende Würfel-/Gruppendaten werden weiterhin gepollt (~3,2 s); Workspace-
  Metadaten am Spieltisch höchstens ungefähr alle 8 s und nach eigenen Aktionen.
  Kein privater Realtime-WebSocket und keine garantierte Latenz.
- Pläne maximal 500; Listen in Paketen von 50, Recap-Felder begrenzt, Archive
  maximal 256 KiB. Unicode-Inhalte dürfen das reguläre Beenden nicht blockieren.
- Private Sicherungen und Exporte gehören nicht ins öffentliche Repository.
- Mehrere Kampagnen, gemeinsame Quests, NPCs, Karten, Ressourcen-Transaktionen,
  Offline-Synchronisierung und My-Turn bleiben den definierten Folgephasen
  zugeordnet. Diese Abnahme behauptet sie nicht als fertig.

## Migrations- und CI-Nachweise

- PR: https://github.com/jan-jarre-pixel/DnD-Dashboard/pull/5
- Erste vollständige Cross-Browser-CI erfolgreich auf e3874e93a9fafc7809caaa85cc275a0d0fa77f5e:
  https://github.com/jan-jarre-pixel/DnD-Dashboard/actions/runs/42536547830
- Produktive Migration phase2_session_workspace erfolgreich als Version
  20261108235010 angewendet. Dateiname an die tatsächliche Migrationshistorie
  angepasst; der geprüfte SQL-Inhalt bleibt identisch.
- Prüfsummen aller neun bisherigen Tabellen unmittelbar vor/nach Migration
  identisch. Auch OIDs und Ausführungsrechte der drei bestehenden RPCs identisch.
- Vier neue Tabellen direkt für anon/authenticated gesperrt; RLS aktiv.
- Neue reale Workspace-API weist ungültige Token mit HTTP 403 / SQLSTATE 28000 ab.
- Zehn bestehende reale API-Ablehnungstests sowie lesende Desktop-/Mobilprüfung
  der unveränderten Rückfallseite nach Migration bestanden.
- Advisor: elf anon-SECURITY-DEFINER-Hinweise (zehn bisherige und ein neuer
  tokengeprüfter Workspace-RPC) sowie elf RLS-ohne-Policy-Hinweise für absichtlich
  gesperrte private/RPC-only-Tabellen. Keine öffentlichen Tabellenrechte hinzugefügt.
  [Advisor-Erläuterung](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable).

Hinweis zur API-Prüfung: Die erste Assertion erwartete HTTP 401. Die tatsächliche
PostgREST-Abbildung von SQLSTATE 28000 ist hier HTTP 403; die Antwort enthält die
vorgesehene Sitzungssperre. Der Test prüft daher 401/403 und nicht einen falschen
festen Status. Kein offener Autorisierungsfehler.


## Abschluss und nächste Phase

- Implementierungsstand: f5136ff0267be5e514c0589f812a75579b0ed3d3.
- [Finale grüne CI](https://github.com/jan-jarre-pixel/DnD-Dashboard/actions/runs/42538020143).
- PR #5 regulär integriert: df3ee3859ced44d90b1c4eab6447ea07cc4cc6da.
- [Erfolgreiches Pages-Deployment](https://github.com/jan-jarre-pixel/DnD-Dashboard/actions/runs/42538313742).
- Zieladresse bestätigt: https://jan-jarre-pixel.github.io/DnD-Dashboard/ .
- Lesende Produktionstests: beide Login-Einstiege bei 1440×900 und 390×844,
  echte Ablehnung ungültiger Codes ohne akzeptierte Testsitzung. Elf echte API-
  Ablehnungen; vollständiger Buildvergleich der 19 ausgelieferten Laufzeitdateien.
- Privater Nachher-Export aller 13 Anwendungstabellen in isolierter Kopie
  wiederhergestellt und exakt verglichen. Git-Bundles vor/nach Implementierung
  geprüft. Dies ersetzt keinen vollständigen Supabase-Auth-/Storage-Dump.
- Quellrepository weiterhin unverändert auf
  94bc4c75a853b1f03508a4f56446b3c1a7e8386e; alte Website bleibt Rückfallmöglichkeit.
- Kein offener blockierender Phase-2-Befund. Lokales WebKit benötigt zusätzliche
  Betriebssystembibliotheken; die WebKit-Abnahme ist durch die erfolgreiche CI
  belegt. Vollständige WCAG-Zertifizierung und echte Gerätetests werden nicht behauptet.
- Nächstes Arbeitspaket: DND-RT-001 (Phase 3), sichere Echtzeitverbindungen,
  Wiederverbindung, Ereignisnachladen und Versionskonflikte bei Charakteränderungen.

## Veränderte Dateien

- Einstieg/Anbindung: index.html, online.js, spieltisch.html; src/pages/tabletop.js,
  src/pages/character-dice.js; src/legacy/character-sheet.js.
- Gemeinsames Modell und Oberfläche: src/core/model.js, src/data/client.js,
  src/ui/shell.js, src/ui/player-dashboard.js, src/ui/gm-workspace.js,
  public/styles/dashboards.css.
- Datenbank: supabase/migrations/20261108235010_phase2_session_workspace.sql.
- Qualitätssicherung: package.json; tests/browser.cjs, tests/dashboard-flow.cjs,
  tests/player-dashboard.test.cjs, tests/live-readonly.cjs; tests/db/local.cjs,
  tests/db/rpc.cjs, tests/db/concurrency.cjs, tests/db/workspace.cjs.
- Dokumentation: README.md, docs/ARCHITECTURE.md, docs/ROADMAP.md, docs/PHASE-2.md.

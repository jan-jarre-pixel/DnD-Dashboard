# Phase 3 – Sichere Live-Ereignisse und Versionskonflikte

Status: Implementiert; lokale Abnahme läuft, CI und produktive Veröffentlichung ausstehend.
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

Migration `20261109063937_phase3_event_sync.sql`: vier neue private Tabellen
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

# Sicherung und Wiederherstellung

M0 hat ein vollständiges Git-Bundle der Quelle und einen privaten Datenexport
außerhalb des Repositorys unter `/workspace/private-dnd-backup/` erstellt.
Enthalten: vier Charakterplätze, Einladungs-Prüfwerte, GM-Prüfwert, Session,
Anwesenheit und Würfel sowie ein separater Snapshot von Funktionen, Policies,
Spalten und Constraints. Keine Klartext-Zugangscodes. Der Export ist vertraulich.

Git-Bundle erfolgreich verifiziert. JSON-Struktur und Anzahlen geprüft;
SHA-256-Dateiliste vorhanden. **Zwei isolierte Wiederherstellungen bestanden**:
1. Historische Tabellenstruktur plus exakte auditierte RPC-Definitionen lokal
   erstellt; alle sieben Tabellen aus dem privaten Export eingespielt und
   einschließlich Zeitstempeln und Code-Prüfwerten verglichen.
2. Daraus einen SQL-Dump erzeugt (`verified-app-restore.sql`), in eine zweite
   leere lokale Datenbank eingespielt; Daten, Funktionen, Policies sowie Tabellen-
   und Funktionsrechte verglichen (`tests/db/compare-restores.cjs`).

Beide Kopien liefen ausschließlich in einem lokalen PostgreSQL-17-Container
mit `--network none`, ohne veröffentlichte Ports. Auth.users/auth.uid sind lokale
Test-Stubs; die Anwendungstabellen hatten keine bestehenden Auth-Zuordnungen.
Dies ist eine geprüfte **Anwendungssicherung**, kein vollständiger Supabase-
Projekt-Dump. Auth-/Storage-Daten sind nicht gesichert. Die funktionierenden
alten Zugangscodes werden dadurch nicht rekonstruiert; ihre unveränderten
Prüfwerte sind gesichert. Workspace-Dateien sind keine garantierte dauerhafte
Sicherung und müssen privat heruntergeladen/aufbewahrt werden.

Vor Datenbankänderungen: kostenfreies lokales PostgreSQL 17 bereitstellen,
mit einem privat autorisierten DB-Zugang einen vollständigen Schema-/Daten-Dump
anfertigen (kein Passwort in Chat oder Git), lokal wiederherstellen, Constraints,
Funktionsrechte, Rollen und Datensatz-Prüfsummen vergleichen. Den bestehenden
Supabase-Dienst dafür nicht zurücksetzen. Produktive Wiederherstellung oder
Löschungen benötigen ausdrückliche Freigabe.

Betriebsvorschlag, noch nicht automatisiert: verschlüsselter lokaler Dump vor
jeder Migration und wöchentlich während aktiver Kampagnen; vier Wochenstände
und drei Monatsstände auf einem privaten zweiten Datenträger aufbewahren.
Wiederherstellung regelmäßig lokal prüfen. Keine Dumps als öffentliche
Actions-Artefakte hochladen. Die bisherigen Browser-Sicherungscodes enthalten
Charakterdaten und müssen ebenfalls privat aufbewahrt werden.

## Reproduzierbare lokale Prüfung

Nur lokal: dedizierten Container `dnd-m0-postgres` ohne Netzwerk starten,
`dnd_restore` anlegen und `node tests/db/restore.cjs /privat/data.json` ausführen.
Danach exakte RPCs aus dem privaten Schema-Snapshot einspielen. Für die zweite
Wiederherstellung den lokalen Dump in `dnd_verify` laden (auth-Stubs und pgcrypto
vorbereiten); `node tests/db/compare-restores.cjs` prüft die beiden Kopien.
Nie diese Testskripte oder historische Setup-Dateien auf Produktion anwenden.
`tests/db/local.cjs` akzeptiert bewusst keine Remote-DB-Verbindungszeichenfolge.

## Phase 6 – Anwendungssicherung vom 2026-11-10

Unter `/workspace/private-dnd-backup/phase6/` liegen privat der Export aller
29 bisherigen Anwendungstabellen, das Schema-Audit einschließlich 33 Funktionen,
Tabellen-/Funktionsrechten und Sequenzstand sowie geprüfte SQL-Dumps vor/nach der
additiven Migration. Der Quellstand ist als verifiziertes Git-Bundle gesichert.
Die JSON-Sicherung wurde lokal in PostgreSQL 17 mit aktiven Fremdschlüsseln
wiederhergestellt und exakt verglichen. Die Migration erhält Originaldaten,
Funktions-OIDs, Definitionen und Rechte. Der daraus erzeugte SQL-Dump wurde
zusätzlich in eine weitere leere lokale Datenbank eingespielt und verglichen.
SHA-256-Nachweise liegen neben den Dateien. Diese Dateien gehören nicht in Git
oder öffentliche Actions-Artefakte; die Einschränkungen der Anwendungssicherung
und der Workspace-Aufbewahrung aus dem obigen Abschnitt gelten weiter.

## Phase 7 – Anwendungssicherung vom 2026-11-10

Vor der Inventarmigration wurden alle 34 bestehenden Anwendungstabellen und
38 auditierte Funktionen einschließlich Definitionen und Berechtigungen privat
exportiert. Die Daten wurden mit aktiven Fremdschlüsseln lokal wiederhergestellt
und exakt verglichen; die Migration erhält die bisherigen Datensätze,
Funktions-OIDs, Definitionen und Rechte. Ein vollständiger SQL-Dump des
migrierten Anwendungszustands wurde zusätzlich in einer zweiten leeren
Datenbank eingespielt und unabhängig verglichen.

Die privaten JSON-/SQL-Dateien und Prüfsummen liegen außerhalb von Git unter
`/workspace/private-dnd-backup/phase7/`. Sie enthalten Anwendungsschemas,
Spielstände und Code-Prüfwerte; Supabase Auth/Storage und Projektkonfiguration
sind kein Bestandteil dieses Anwendungsbackups. Keine privaten Daten oder
Zugangscodes in CI, Repository oder öffentliche Artefakte übernehmen.

## Phase 8 – herunterladbare Charakterdateien

Unter **Suche & Werkzeuge → Charakterdateien** können Spieler ihren bestätigten
Bogen beziehungsweise ihren lokalen Entwurf als versioniertes JSON herunterladen.
Die Spielleitung kann alle vier Bogenplätze exportieren. Dateien bleiben privat.
Der Import ist nur für den eigenen Spielerbogen möglich, mit Feldvorschau,
ausdrücklicher Bestätigung und erneuter Server-/Versionsprüfung. Details und
Größengrenzen stehen in [PHASE-8.md](PHASE-8.md).

Diese Benutzerdateien sind keine vollständigen Datenbank-Dumps: Gezählte Bestände,
Kampagnen, Karten und Auth/Storage gehören nicht zum Bogenformat. Die privaten
Anwendungs-Dumps und ihr geprüfter Restore-Prozess aus den vorherigen Abschnitten
bleiben für eine vollständige Wiederherstellung maßgeblich. Die verschlüsselte
Offline-Kopie ist zeitlich begrenzt und an die Sitzung eines Tabs gebunden; sie
ersetzt keinen dauerhaft aufbewahrten Export.

Phase 9 ergänzt `game_private.vtt_levels` und `game_private.vtt_features` sowie
Ebenen-/Sichtfelder an bestehenden Kartentabellen. Anwendungssicherungen und
Restores umfassen nun 41 Tabellen. Alle Ebenenbilder liegen weiter in privaten
Kacheldaten; eine Charakter-JSON-Datei enthält diese Daten nicht. Wiederherstellen
muss auch die Ebenen-Fremdschlüssel und den Trigger zur ersten Kartenebene erhalten.

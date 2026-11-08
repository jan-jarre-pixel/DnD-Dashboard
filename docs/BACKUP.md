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

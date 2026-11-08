# Sicherung und Wiederherstellung

M0 hat ein vollständiges Git-Bundle der Quelle und einen privaten Datenexport
außerhalb des Repositorys unter `/workspace/private-dnd-backup/` erstellt.
Enthalten: vier Charakterplätze, Einladungs-Prüfwerte, GM-Prüfwert, Session,
Anwesenheit und Würfel sowie ein separater Snapshot von Funktionen, Policies,
Spalten und Constraints. Keine Klartext-Zugangscodes. Der Export ist vertraulich.

Git-Bundle erfolgreich verifiziert. JSON-Struktur und Anzahlen geprüft;
SHA-256-Dateiliste vorhanden. Dies ersetzt **keinen Restore-Test**. Die
Schema-Metadaten sind kein vollständiger pg_dump und noch keine automatisierte
Wiederherstellungsdatei. Auth-/Storage-Daten sind nicht gesichert. Workspace-
Dateien sind keine garantierte dauerhafte Sicherung.

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

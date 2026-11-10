# Phase 6 – Kampagnenverwaltung

Status: Implementierung vorhanden, Abschlussprüfung und Veröffentlichung laufen.

## Umfang und Bedienung

Im GM-Spieltisch öffnet **Kampagnen** das Kampagnenbuch. Kampagnen lassen sich
anlegen, bearbeiten und archivieren. Es bleibt die bestehende Vierergruppe mit
einer gleichzeitig laufenden Spielsitzung. Die Bearbeitung einer anderen
Kampagne wechselt die Spielrunde nicht: Erst **Neue Sitzung dieser Kampagne
starten** bindet eine neue Sitzung. Eine laufende Sitzung vorher unter
**Live-Session** beenden. Die bisherigen Startknöpfe bleiben mit der
Standardkampagne kompatibel. Zugeordnete Sitzungspläne können direkt aus dem
Kampagnenbuch gestartet werden.

NPCs haben Dossiers und GM-Notizen. Quests besitzen Ziele, Status und eine
Belohnungsbeschreibung. Das Gruppenjournal enthält veröffentlichte Erzählungen;
persönliche Notizen bleiben im vorhandenen Charakterbogen. Der Story Graph
besteht aus gerichteten Knoten und Verbindungen und bietet zusätzlich eine
lesbare Verbindungsliste. Verbindungen können keine fremden Kampagnen referenzieren.

**Entwurf speichern** veröffentlicht nichts. **Gespeicherten Stand freigeben**
veröffentlicht die vorgesehenen Felder des gespeicherten Eintrags. GM-Notizen
werden nie übertragen. Weitere Entwurfsänderungen verändern diese Freigabe
nicht. **Freigabe zurückziehen** entfernt sie aus künftigen Spielerantworten;
bereits gelesene Informationen können Teilnehmer behalten. Story-Verbindungen
erscheinen nur, wenn beide Endpunkte freigegeben sind. Spieler erhalten nur das
Kampagnenbuch der aktuellen Sitzung und können keine Kampagnen verwalten.

Die private Statblock-Bibliothek speichert Ausgangswerte und Aktionstext. Der
Encounter-Planer kombiniert Vorlagen und Anzahlen, Gruppenstufen, eine eigene
Schwierigkeitseinschätzung und geplante Beute. Seine Schätzung verwendet die
EP-Schwellen und Gegner-/Gruppenmultiplikatoren des **DMG 2014**. Angepasste EP
sind kein EP-Lohn. Schwache Nebenmonster, Gelände, Synergien und Tagesressourcen
müssen manuell berücksichtigt werden; die manuelle Einschätzung bleibt erhalten.

**Neue Kampfinstanz vorbereiten** erzeugt genau eine neue Begegnung mit eigenen,
zunächst verborgenen Gegnerinstanzen. Danach Initiative, Sichtbarkeit und Kampf
im bestehenden Kampfmanager steuern; Karten nutzen dieselben Instanz-IDs.
Vorlagenänderungen ändern keine laufenden Lebenspunkte. Wiederholungen einer
unbestätigten Anfrage erzeugen keine zweite Begegnung. Ein erneuter bewusster
Aufbau erzeugt eine frische Begegnung.

Sitzungspläne, Begegnungen und Karten werden beim Anlegen der aktuellen
Spielkampagne zugeordnet. Unbenutzte Vorbereitungen lassen sich mit geprüftem
Quellbezug verschieben. Aktive Kämpfe, veröffentlichte Karten und gestartete
Sitzungspläne sind geschützt. Karten mit Encounter-Verknüpfung zuerst lösen;
verknüpfte Ressourcen können nicht einzeln kampagnenübergreifend verschoben
werden. Die bisherigen Kampf-/Karten-/Plan-RPCs prüfen die Kampagnenbindung
auch für alte Clients. Sitzungsarchive bleiben über ihre unveränderliche
Sitzungsbindung der ursprünglichen Kampagne zugeordnet.

## Datenmodell und Grenzen

Die additive Migration führt fünf private RLS-Tabellen und ein Token-RPC ein.
Bestehende Tabellen und RPC-Definitionen werden nicht ersetzt. Die
Standardkampagne erhält die vorhandenen Ressourcen und Sitzungsbindungen;
Charakterbögen, Zugangscode-Prüfwerte und bestehende Freigaben bleiben erhalten.
Jede neue Spielsitzung wird genau einmal gebunden. Alte Clients starten in der
Standardkampagne; archivierte Kampagnen können nicht gestartet werden.

Alle Änderungen prüfen GM-Identität, Versionen und unveränderliche Request-IDs
innerhalb einer Transaktion. Sperrreihenfolge beginnt wie bisher beim Workspace.
Spieler erhalten eine eigene serverseitige Projektion, die übermittelte
Kampagnen-IDs ignoriert. Private Änderungen erzeugen nur private Live-Ereignisse.
Sitzung, Kampf, Charakterbogen und Kartentoken behalten ihre vorhandenen
kanonischen Datenquellen. Statblocks sind Vorlagen, keine zweite HP-Datenbank.

Grenzen: 50 Kampagnen, 1000 Einträge pro Kampagne, 46 NPC-Gegner pro Encounter,
12 Gruppenstufen für die Schätzung und die bisherigen Ressourcenlimits. Vier
bestehende Charakterplätze, keine parallelen Gruppen/Spielsitzungen. Geplante
Belohnungen buchen kein Inventar (Phase 7). Offline-Bearbeitung und Import/
Export gehören zu Phase 8. Nicht bestätigte Formulare bleiben flüchtig; Konflikte
bewahren den Entwurf, explizites Neuladen fragt vor dem Verwerfen. Logout und
Sitzungswiderruf löschen private Formulare und Antwortdaten aus dem DOM.

## Verifikation

37 Unit-/Modell-/Layoutprüfungen und 16 zusätzliche Kampagnen-DB-Szenarien;
Bestandsregressionen für Rollen, Workspace, Echtzeit, Kampf und VTT. Browserflow
prüft alle vier Spieler, Kampagnenwechsel, Freigaben, Quests/NPCs/Journal,
Story-Knoten und verborgene Endpunkte, unveränderte lokale Konfliktentwürfe,
Encounter-Aufbau, HP-Instanzen, verlorene Antwort mit identischem Retry,
HTML-Escaping und mobile Darstellung.

Private Anwendungssicherung vor der Migration: alle 29 bisherigen Tabellen,
33 auditierte Funktionsdefinitionen und Berechtigungen. Lokal wiederhergestellt
und exakt verglichen; die Migration erhält alte Datensätze, Funktions-OIDs,
Definitionen und Rechte. Details und produktiver Abschluss werden nach den
verpflichtenden CI- und Live-Prüfungen ergänzt.

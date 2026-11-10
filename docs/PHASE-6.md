# Phase 6 – Kampagnenverwaltung

Status: **Abgeschlossen, veröffentlicht und lesend produktiv geprüft.**

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
Auch lokale Ladeantworten sind an den aktuellen Änderungsstand gebunden: Eine
Antwort von vor einer Schreibaktion oder einer Kampagnenauswahl kann den
bestätigten Stand und die Navigation nicht zurücksetzen. Der Kampfmanager
verwirft entsprechend Antworten für eine vorherige Begegnung, damit der Builder
zuverlässig die neu erzeugte kanonische Instanz öffnet.
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

37 Unit-/Modellprüfungen, 139 DB-Szenarien (18 Kampagnenszenarien neu),
zusätzliche Parallelitätsprüfungen und 30 Rollen-/Viewport-Szenarien;
Bestandsregressionen für Rollen, Workspace, Echtzeit, Kampf und VTT. Browserflow
prüft alle vier Spieler, Kampagnenwechsel, Freigaben, Quests/NPCs/Journal,
Story-Knoten und verborgene Endpunkte, unveränderte lokale Konfliktentwürfe,
Encounter-Aufbau, HP-Instanzen, verlorene Antwort mit identischem Retry,
absichtlich bis nach Speicherbestätigung beziehungsweise Encounter-Wechsel
verzögerte alte Ladeantworten,
HTML-Escaping und mobile Darstellung.

Private Anwendungssicherung vor der Migration: alle 29 bisherigen Tabellen,
33 auditierte Funktionsdefinitionen und Berechtigungen. Lokal wiederhergestellt
und exakt verglichen; die Migration erhält alte Datensätze, Funktions-OIDs,
Definitionen und Rechte. Die vollständigen produktiven Abschlussnachweise
sind unten aufgeführt.

## Produktives Backend – 2026-11-10

Migration `20261110075540_phase6_campaigns` ist angewandt. Direkt davor/danach
wurden alle 29 bisherigen Tabellen per Datensatzanzahl und Prüfsumme verglichen:
alle unverändert. Die 33 vorhandenen Funktions-OIDs, Definitionen und Rechte,
207 Spalten, 130 Constraints, 53 Indizes, drei Policies und bisherigen
Tabellenrechte/RLS-Einstellungen sind unverändert. Fünf private Tabellen und fünf
Funktionen wurden ergänzt. Die lokale Migrationsdatei entspricht der produktiven
Versionsnummer und dem angewandten SQL.

Die 21 echten API-Ablehnungsprüfungen einschließlich des neuen Kampagnen-RPCs
bestehen. Beide bisherigen Loginseiten funktionieren mit echter Ablehnung
ungültiger Testcodes auf 1440 × 900 und 390 × 844. Die Security-Advisors melden
die erwartete zusätzliche tokengeprüfte `anon`-RPC-Funktion und fünf private
RLS-Tabellen ohne direkte Policies; die vorhandene Auth-Passwortmeldung bleibt
unverändert. Keine zusätzlichen unindizierten Fremdschlüssel.



## Abschlussnachweise – 2026-11-10

- [PR #13](https://github.com/jan-jarre-pixel/DnD-Dashboard/pull/13) ist integriert.
  Geprüfter Feature-Commit: `132bebd22c82a6921ba8cb52a62d19c7dbfcd129`;
  Merge: `076561fa7e838f9860830271661460706e403b44`.
  Beide Git-Bäume sind identisch: `33c05a438e0fd8eda4a846bda358580490870e5d`.
- [Vollständige CI](https://github.com/jan-jarre-pixel/DnD-Dashboard/actions/runs/42785737017)
  erfolgreich: Unit/Build, alle Datenbankprüfungen, Rollen-/Viewport-Szenarien,
  native Select-Regressionen und vollständige Mehrspieler-/Kampf-/Karten-/
  Kampagnenabläufe in Chromium, Firefox und WebKit. Der WebKit-Installationsjob
  wurde nach einem Paketdownload-Timeout ohne Änderung des Codes wiederholt.
- Die beiden gezielten Überlappungsregressionen bestehen: Eine alte
  Kampagnenantwort wird erst nach der Speicherbestätigung ausgeliefert; eine
  Antwort zur vorherigen Begegnung erst nach dem Öffnen der neuen Instanz.
  Bestätigte Auswahl, kanonische Gegner und ihre Lebenspunkte bleiben korrekt.
- [Pages-Veröffentlichung](https://github.com/jan-jarre-pixel/DnD-Dashboard/actions/runs/42794081386)
  für den Merge erfolgreich. Alle zehn geänderten HTML-/JS-/CSS-Laufzeitdateien
  wurden auf der echten öffentlichen Anwendung bytegenau mit dem geprüften
  Quellstand verglichen, einschließlich Kampagnenbuch und Kampfmanager.
- `NODE_USE_ENV_PROXY=1 npm run test:production` erfolgreich: beide Loginseiten
  auf 1440 × 900 und 390 × 844 Pixeln, echte Ablehnung ungültiger Codes,
  sechs Rollenoptionen und keine JavaScript-Laufzeitfehler.
- `NODE_USE_ENV_PROXY=1 node tests/live-readonly.cjs` erfolgreich: 21 echte
  Lese-/Ablehnungsprüfungen einschließlich Kampagnen-RPC und Edge-Transport.
  Positive Funktionstests verwenden ausschließlich isolierte Testdaten;
  es wurden keine bestätigten Produktions-Spielaktionen mit Originalcodes erzeugt.

Damit ist DND-CAMPAIGN-001 abgeschlossen. Der nächste offene Schritt ist
DND-ITEM-001 (Phase 7 – Inventar und Generatoren).

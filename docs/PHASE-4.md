# Phase 4 – Gemeinsamer Kampfmanager und My Turn

Status: Abgeschlossen, integriert und lesend produktiv geprüft am 2026-11-09.
Positive Rollen-/Kampfaktionen ausschließlich mit isolierten Testdaten geprüft.
Arbeitspaket: DND-COMBAT-001. Ausschließlich DnD-Dashboard; keine bezahlte Infrastruktur.

## Funktionen

- Eigenständiger Bereich **Kampf** im GM Control Room, für Desktop und Mobil.
  Vorbereitete Begegnungen dauerhaft speichern, öffnen und als neue Begegnung
  kopieren. Vier bestehende Charaktere werden automatisch verknüpft, nicht kopiert.
- Eigene Gegnerinstanzen mit Name, TP/Maximum, temporären TP, RK, Geschick,
  Initiativebonus, Bewegung, Zuständen, Konzentration und manuellen Effekten.
  Maximal 50 Teilnehmer pro Begegnung, maximal 500 Begegnungen.
- Initiative serverseitig für alle/ausgewählte Teilnehmer würfeln oder manuell
  eingeben. Sortierung nach Ergebnis; Gleichstände entscheiden Spielleitung und
  beteiligte Spieler ausdrücklich über Ränge. Gleichstände müssen vor Start oder
  Fortsetzung bestätigt werden. Keine vermeintliche automatische DEX-Tie-Regel.
- Kampf starten, pausieren, fortsetzen, beenden; nächster Zug und Rundenzähler.
  In einer Pause können Verstärkungen hinzugefügt und Reihenfolgen angepasst
  werden. Fehlende Initiative verhindert Fortsetzung. Die Spielleitung entscheidet
  die Einordnung im laufenden Durchgang; ein Umsortieren wechselt nicht den aktuellen Zug.
- Initiative enthält Bewusstlose weiterhin, damit Todesrettungswürfe möglich sind.
  Spielleitung kann andere Teilnehmer ausnehmen/wieder aufnehmen, aber den
  aktuellen Teilnehmer erst nach einem Zugwechsel. Keine Datensätze dabei gelöscht.
- Automatischer My-Turn-Bereich für Spieler an Charakterbogen und Spieltisch:
  aktueller Zug, Initiative, Bewegung, Aktion, Bonusaktion, Reaktion, Zustände,
  Konzentration, Effekte, häufige Angriffe, Zauber und Ressourcen.
  Angriffe verwenden das vorhandene serverseitige Würfelsystem.
- Aktion/Bonusaktion/Bewegung nur am eigenen aktiven Zug, Reaktion auch außerhalb
  des Zuges. Handlungsunfähigkeit, Bewusstlosigkeit und Tod sperren entsprechende
  Aktionen; Gepackt/Festgesetzt sperrt normale Bewegung. Budgets erneuern sich am
  Beginn des nächsten eigenen Zuges. Der GM kann manuell korrigieren.
- Standardbewegung basiert auf dem führenden Zahlenwert des vorhandenen ft-Feldes;
  andere Bewegungsarten und Spurt-Boni entscheidet der GM über zusätzlichen
  Bewegungsraum für diesen Zug. Keine vorgetäuschte Positions-/Kollisionsprüfung.
- Schaden, Heilung, temporäre TP, Zustände, Konzentration, Effekte, Todeszähler
  und begrenzte Ressourcen direkt erreichbar. Native aufklappbare Details halten
  die Initiative kompakt. Live-Modus reduziert die Vorbereitungsformulare.
- Kampfprotokoll mit UUID, Zeitpunkt, handelndem Akteur und bestätigten Änderungen;
  bei TP-Änderungen Vorher-/Nachher-Stand. Getrennte GM-/Spieleransichten.

## Regeln und bewusst manuelle Entscheidungen

Schaden nach Resistenzen/Immunitäten eingeben. Temporäre TP zuerst verbrauchen,
keine Addition mehrerer Pools. Wahlweise höheren Pool behalten oder ausdrücklich
ersetzen, auch durch kleinere Werte/0. Heilung bleibt am Maximum begrenzt.
Schaden bei 0 TP erzeugt einen fehlgeschlagenen Todeswurf, ein ausdrücklich als
kritisch markierter Treffer zwei; massiver verbleibender Schaden kann tödlich sein.

Todesrettungswürfe stammen vom Server: natürliche 1 zählt doppelt fehlgeschlagen,
10–19 Erfolg, 2–9 Fehlschlag, natürliche 20 bringt 1 TP und setzt die Zähler zurück.
Drei Erfolge stabilisieren, drei Fehlschläge bedeuten Tod. Heilung eines lebenden
Charakters setzt die Zähler zurück. Wiederbelebung ist eine ausdrückliche manuelle
GM-Bestätigung auf 1 TP, kein automatisierter Zauber oder kostenloser Regelvorteil.
Gegner bei 0 TP bleiben beurteilbar; die Spielleitung entscheidet über ihr Ausscheiden.

Konzentrations-SG nach Schaden wird angezeigt (mindestens 10, sonst halber
Schaden abgerundet). Bei 0 TP/Handlungsunfähigkeit endet Konzentration; sonst
bestätigt der Nutzer Erfolg/Ende selbst. Mehrere Treffer stehen im Protokoll;
die Anzeige des letzten SG ersetzt keine vollständige Effekt-Regelmaschine.
Effekte besitzen keine automatisch behauptete Dauer oder Rundenwirkung.

Ressourcen-/Zauberplatzknöpfe buchen exakt eine definierte Einheit vom echten
Charakterbogen ab und verhindern Überschreitung. Sie führen keinen Zaubereffekt
aus und prüfen nicht alle Zauberbedingungen. Würfel, Aktionen und Ressourcennutzung
werden deshalb ausdrücklich getrennt markiert, auch für Reaktionen/Mehrfachangriffe.
Unklare Klassen-/Hausregeln entscheidet die Spielleitung. Inventarverbrauch folgt Phase 7.

## Datenmodell und Datenintegrität

Migration `20261109090211_phase4_combat_manager.sql` ergänzt fünf private Tabellen:

- `encounters`: Sitzungsbezug, Status, Runde, aktueller Teilnehmer und Versionen.
- `combatants`: gemeinsame Instanz-ID, Charakter-/NPC-Zuordnung und Zugbudgets.
- `combat_commands`: unveränderliche Request-Receipts und Payload-Hash.
- `combat_log`: dauerhafte, sichtbarkeitsgeprüfte Kampfereignisse.
- `combat_defaults`: minimale Baseline-Werte der vier bestehenden Vorlagen;
  ein Regressionstest prüft die Übereinstimmung mit dem vorhandenen Renderer.

TP, temporäre TP, Zustände, Todeszähler, Effekte, Konzentration und Ressourcen
von PCs bleiben ausschließlich in `character_slots.sheet`. PC-Kampfzeilen dürfen
keine eigene TP-/RK-Kopie haben (CHECK-Constraint). Alle drei Charakteransichten
verwenden weiter dasselbe Modell. Optionalfelder Konzentration/Effekte überstehen
Normalisierung und gewöhnliches Speichern. Ungültige Legacy-Werte dürfen eine
Kampfprojektion nicht abstürzen lassen. Migration schreibt keine bisherigen Zeilen um.

NPCs speichern ihre Instanzwerte in derselben Zeile, die die Initiative verwendet.
`map_id`, `token_id` und `npc_template_id` sind vorbereitete nullable Referenzfelder.
Karten/Bestiary existieren noch nicht; keine behauptete Kartenverknüpfung.
Phase 5 muss Tokens auf diese Instanz beziehen und darf keine zweite Gegner-TP-Verwaltung bauen.
Kopien erzeugen neue NPC-IDs und frische NPC-Zustände; PCs behalten ihren echten Stand.

## Rechte, Transaktionen und Live-Zustellung

Alle fünf Tabellen haben RLS und keine direkten anon/authenticated-Rechte.
`dnd_combat_call` prüft das bestehende befristete Token. Owner darf Begegnungen
steuern und begrenzte Kampfwerte verändern; Spieler nur den eigenen Teilnehmer.
Das erweitert den GM gezielt um Kampfaktionen. Vollständiges freies Umschreiben
fremder Charakterbögen bleibt über die bisherigen APIs unzulässig.
Hilfsfunktionen sind privat, EXECUTE entzogen, search_path leer.

- Sitzungsbindung und erwartete Kampfversion vor jeder neuen Mutation. Änderungen
  an einem PC prüfen zusätzlich dessen Charakterversion. Die gemeinsame Kampfversion
  kann auch unabhängige gleichzeitige Befehle ablehnen; es gibt keinen stillen Merge.
- Derselbe Request mit gleichem Payload liefert dieselbe Bestätigung. Andere Akteure,
  Aktionen oder veränderte Payloads dürfen den Request nicht wiederverwenden.
  Wiederholung funktioniert auch nach Kampfende, ohne erneut Schaden/Ressourcen abzubuchen.
- Client behält bei unklarer Netzwerkantwort die **gesamte** ursprüngliche Anfrage,
  auch nach zwischenzeitlichem Laden einer neueren Version. Definitive SQL-Ablehnungen
  verwerfen diese Receipt-Anfrage, sodass nach bewusstem Aktualisieren neu versucht
  werden kann. Eingaben bleiben bei Fehlern erhalten. Eine separate Rückbestätigung
  löst unklare Antworten auch dann auf, wenn der normale Aktionsknopf inzwischen
  als verbraucht gesperrt ist. Verlassen/Abmelden warnt vor ungeklärten Requests.
- Einheitliche Sperrreihenfolge mit Session-Steuerung und Charakteränderungen.
  Ende/Wechsel der Spielsitzung beendet laufende Kämpfe auch über alte GM-Endpunkte.
  Pause der Spielsitzung sperrt Spieleraktionen unabhängig vom sichtbaren Kampfstatus.
- Getrennte öffentliche/private Kampfversionen: geheime Gegneränderungen verändern
  keine Spielerversion und erzeugen keine Spielerzustellungen. Snapshots filtern
  vor JSON-Ausgabe: keine versteckten IDs, Namen, HP oder Zähl-/Ranglücken.
  Sichtbare Gegner erhalten zunächst nur Name/Initiative; TP/RK/Zustände/Effekte
  und Würfelwerte benötigen gesonderte GM-Freigabe.
- Vorbereitungswürfe sind geheim. Bei Gegnern ohne freigegebene Werte bleiben auch
  spätere Würfelmodifikatoren und Todeswürfe privat. Aktuelle Kampfprotokolle werden
  erneut gegen die aktuelle Sichtbarkeit gefiltert. Bereits öffentlich gewürfelte
  Ergebnisse oder früher gesehene Daten kann eine spätere Verbergung nicht zurückholen.
- Phase-3-Ereignisstream wird weiterverwendet. Keine neue Edge Function, keine
  Änderungen an Anonymous Auth, kein neues Projekt/Abonnement und keine bezahlten Dienste.
- Abmeldung/Ablauf löscht Kampfprojektionen, private Formulare und wartende
  Client-Requests. Unbestätigte Entwürfe warnen beim Abmelden/Verlassen;
  keine dauerhafte Offline-Warteschlange oder bestätigte Offline-Kampfaktion.

## Prüfstand

- Vorher-Sicherung mit allen 17 bisherigen Anwendungstabellen und Funktionsdefinitionen.
  Isolierte Wiederherstellung plus volle neue Migration: bisherige Tabellen und
  Funktionsidentitäten unverändert. Keine Tests verändern produktive Spielerwerte.
- 28 neue DB-Szenarien: Baseline-Parität, Rollen/IDOR, Geheimhaltung auch nach
  erneutem Verbergen, Initiative/Gleichstände, Single-Source-TP, Retry/CAS,
  Konzentration/Effekte inklusive normalem Charakter-Speichern, Budgets, Runden,
  Ressourcen, alle d20-Todeswurfwerte, echte Serverwürfe, temporäre TP, Pause,
  Verstärkungen, Wiederverwendung, Legacy-Sitzungsende und ungültige Legacy-Werte.
- Vorhandene 31 Node- und 65 DB-Szenarien sowie Parallelitäts-/50-Wurf-Prüfungen
  bleiben Teil der Abnahme. Neue Kampfszenarien ergänzen die Mehrspieler-Browserprüfung.
- Echter HTTP-SSE-/PostgreSQL-Durchlauf mit GM und vier Spielern: geheime Gegner,
  manuelle Initiative, My Turn, verlorene bestätigte Schadensantwort mit erneutem
  Laden und exakt einem Effekt, Konflikt/Refresh/erneutes Speichern, XSS-Text,
  Aktionsbudgets, Freigabe, Rundenwechsel, Mobilansicht und Kampfende.
- Native Formulare/Tastatur, sichtbare Statusmeldungen, Fokuswiederherstellung
  und bestehende reduzierte Bewegung. Keine behauptete vollständige WCAG- oder
  physische Geräte-Zertifizierung. Chromium/Firefox/WebKit-CI vollständig bestanden.

## Offene Folgephasen

Karten, Tokenpositionen, Entfernungsmessung und Fog of War Phase 5. Vollständiger
Encounter Builder mit Bestiary, Schwierigkeit, Taktik und Loot Phase 6.
Inventar-/Gegenstandsautomatisierung Phase 7. Offline-Queue/Exporte Phase 8.
Keine dieser Funktionen wird durch die nullable Referenzfelder als fertig ausgegeben.
Positive Produktions-Spieltests mit Originalcodes werden nicht behauptet.

## Integrations- und Produktionsnachweise

- PR #9: https://github.com/jan-jarre-pixel/DnD-Dashboard/pull/9 .
- Erste vollständige grüne CI auf 229478ef3bc9c7cb496c3885d5b86d00bcbf602a:
  https://github.com/jan-jarre-pixel/DnD-Dashboard/actions/runs/42588906023 .
  31 Node-Prüfungen, insgesamt 92 DB-Szenarien plus Parallelität/50 Würfe,
  30 Rollen-/Viewport-Szenarien und je ein erweiterter paralleler Mehrspieler-
  Durchlauf in Chromium, Firefox und WebKit bestanden.
- Rückbestätigung bereits gesperrter Aktionsknöpfe in allen drei Browsern bestanden.
- Finale CI auf d87cbc61d4ddd69f19592427d5f71c9bdc75735a:
  https://github.com/jan-jarre-pixel/DnD-Dashboard/actions/runs/42594449082 .
  31 Node-Tests, 93 DB-Szenarien plus Parallelität/50 Würfe, 30 Rollen-/Viewport-
  Szenarien und drei parallele Mehrspieler-/Kampfdurchläufe bestanden.
- Merge von PR #9: 8814d77803c6bf3ef49fe3d20dd63be3c2e2165c.
  Erfolgreiche Pages-Veröffentlichung:
  https://github.com/jan-jarre-pixel/DnD-Dashboard/actions/runs/42596093733 .
- Veröffentlichtes Login und echte Ablehnung ungültiger Codes auf beiden Seiten
  bei 1440×900 und 390×844 geprüft; keine Browserfehler.
- Alle 22 veröffentlichten Laufzeitdateien entsprechen bytegenau dem geprüften Build.
- Abschließende Sicherung aller 22 Anwendungstabellen isoliert exakt wiederhergestellt;
  Würfel-Identity-Sequenz für anschließende neue Würfe synchronisiert.
  Private Daten und Zugangsmaterial ausschließlich außerhalb des Repositories.
- Produktive Migration erfolgreich als Version 20261109090211 registriert.
  Dateiname an tatsächliche Historie angepasst; SQL-Inhalt unverändert.
- Alle 17 bisherigen Tabellen unmittelbar vor/nach Migration identisch.
  Auch sämtliche bisherigen Funktionsdefinitionen, OIDs und Grants identisch.
- Fünf neue private Tabellen: RLS aktiv, keine anon/authenticated-Leserechte.
- 19 echte lesende API-/Edge-Prüfungen bestanden, einschließlich Ablehnung des
  neuen Kampf-RPC bei ungültigem Token. Keine produktiven Spielerwerte verändert.
- Advisor-Hinweise: beabsichtigte RLS-ohne-Policy-Sperren, intern tokengeprüfte
  anon-aufrufbare Definer-RPCs sowie der bereits bekannte Hinweis auf nicht
  aktivierte Leaked-Password-Protection für die unbenutzte Passwortanmeldung.
  [RLS-Hinweis](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy),
  [RPC-Hinweis](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable).

Lokale Zwischenbefunde wurden korrigiert: SQL-CASE-Parserfehler vor jeder
produktiven Anwendung, auf die Loginform eingegrenzte Browserselektoren wegen
neuer versteckter Formulare und aktualisierte Prüfung der präziseren Bezeichnung
„Letzter eigener Initiativwurf“. Kein Test übersprungen, keine Prüfung des echten
Würfelergebnisses entfernt. Keine fehlgeschlagenen oder ausgelassenen finalen CI-Prüfungen.


Ressourcen-Kompatibilitätsprüfung: Eine ergänzende Migration
`20261109093201_phase4_resource_compatibility.sql` übernimmt dieselbe Leerzeilen-
Bereinigung wie der vorhandene `parts()`-Parser und begrenzt ungültige Legacy-
Verbrauchszähler beim expliziten Verbrauch. Der zusätzliche Regressionstest
prüft die zweite Ressource nach einer Leerzeile und deren Höchstmenge.
Der Erstbefund konnte nur eine betroffene Aktion ablehnen; bisherige Daten wurden
nicht beschädigt. Die Ergänzung verändert keine Tabellendaten. Alle 22 Tabellen,
Funktions-OIDs und Grants vor/nach Anwendung identisch, nur die neue Kampf-RPC-
Definition verbessert. Insgesamt jetzt 93 DB-Szenarien (28 neue Kampf-Szenarien).
Die erneute vollständige CI vor dem Frontend-Merge wurde erfolgreich abgeschlossen.


## Geänderte Dateien (PR #9)

- Einstieg/Integration: `index.html`, `spieltisch.html`, `online.js`,
  `src/pages/tabletop.js`, `src/ui/shell.js`, `src/ui/gm-workspace.js`,
  `src/ui/player-dashboard.js`.
- Daten und Darstellung: `src/core/model.js`, `src/data/client.js`,
  `src/ui/combat.js`, `public/styles/combat.css`.
- Beide oben genannten Migrationen unter `supabase/migrations/`.
- Prüfungen: `tests/db/combat.cjs`, `tests/db/rpc.cjs`, `tests/combat-flow.cjs`,
  `tests/multiplayer.cjs`, `tests/browser.cjs`, `tests/dashboard-flow.cjs`,
  `tests/production-readonly.cjs`, `tests/live-readonly.cjs`, `package.json`.
- Dokumentation: `README.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, dieser Bericht.

Keine Änderungen an sideline26, keine privaten Zugangscodes in Git,
keine neuen kostenpflichtigen Ressourcen. Der nächste Implementierungsschritt ist
DND-MAP-001 (Phase 5): Karten und Tokens auf derselben Kampfteilnehmerinstanz.

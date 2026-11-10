# Phase 7 – Inventar und Generatoren

Status: **Abgeschlossen, veröffentlicht und lesend produktiv geprüft.**

## Bedienung und Umfang

Im GM-Spieltisch öffnet **Inventar & Generatoren** den gezählten Bestand.
Persönliche Gegenstände gehören einem der vier Charakterplätze; Gruppentruhe
und private Beute gehören einer Kampagne. Spieler sehen ihr eigenes Inventar
und die Truhe der aktuellen Spielsitzung. Auf dem Spieltisch zunächst
**Inventar öffnen**, im Charakterdashboard die Ansicht **Inventar** wählen.
Private Beute, fremde Charakterinventare und Generatorentwürfe bleiben beim GM.

Der GM erfasst Namen, Beschreibung, Anzahl, Stückwert in Kupfermünzen und Gewicht
in Gramm. Gegenstände lassen sich bearbeiten, verteilen und in der Truhe ablegen.
Spieler können zwischen eigener Tasche und aktueller Truhe übertragen.
Jede Übertragung bucht Quelle und Ziel gemeinsam; die letzte Einheit kann nur
einmal entnommen werden. Leere Bestände lassen sich anzeigen. Wert- und
Gewichtssummen werden auch bei großen Beständen ohne Rundungsfehler berechnet.

**Verwenden** verbraucht persönliche Verbrauchsgegenstände. Ein optionaler
Heileffekt wird serverseitig gewürfelt: genau ein Stück und dieselben kanonischen
Charakter-TP werden in einer Transaktion geändert. Heilung endet am TP-Maximum,
setzt Todesrettungen zurück und benötigt bei bereits drei Fehlschlägen eine
manuelle Wiederbelebungsentscheidung. Das Protokoll bewahrt den Heilwurf.
**Ausrüsten** ist eine Markierung; Rüstungsklasse, Einstimmung und weitere
Gegenstandseffekte bleiben manuell.

**Charakterressourcen & Rast** verwendet dieselben Ressourcen-, Zauberplatz- und
TP-Felder wie Bogen und Kampfmanager. Verbrauch, Rückgabe, kurze und lange Rast
prüfen die Charakterversion. Auch ein gleichzeitiger Verbrauch im Kampfmanager
kann eine letzte Einheit nicht doppelt ausgeben. Rasten mit der Spielleitung
abstimmen; die kurze Rast würfelt keine Trefferwürfel automatisch.

Die alten **Ausrüstungsnotizen** bleiben unverändert bearbeitbar. Freitext wird
nicht automatisch in Mengen umgedeutet. Währungen können als Gegenstände mit
Stückzahl geführt werden; Werte und Gewichte lösen keine Käufe, Wechselkurse
oder Traglastregeln aus.

## Lokale Generatoren

Der GM kann Beute, NPCs, Quests, Tavernen, Wetter und Reiseereignisse aus
mitgelieferten eigenen Inspirationstabellen würfeln. Eigene gewichtete Tabellen
verwenden pro Zeile `Gewicht | Titel | Text`; Gewichte liegen zwischen 1 und 100.
Es werden keine externen KI-Dienste oder ausführbaren Würfelformeln verwendet.
Die Tabellen sind Beispiele und keine vollständigen DMG-Schatz- oder Balanceregeln.

Ein Wurf speichert seine private Vorschau sofort unveränderlich. **Einmalig in
Kampagne / Beute speichern** übernimmt Beute als private Gegenstände, NPCs und
Quests als entsprechende Kampagnenobjekte, sonstige Ergebnisse als Journalentwurf.
Auch getrennte Speicheranfragen erzeugen nur eine Übernahme. Spieler erhalten
weder Vorschau noch Entwurf: Beute ausdrücklich verteilen, Kampagneneinträge
anschließend im Kampagnenbuch freigeben. Tabellenänderungen verändern frühere
Ergebnisse nicht.

## Datenmodell und Fehlerverhalten

Fünf neue private RLS-Tabellen speichern Bestände, eigene Tabellen,
Generatorergebnisse, Command-Receipts und Bestandsprotokoll. Sechs additive
Funktionen ergänzen das bestehende Modell. Nur `dnd_inventory_call` ist für
`anon` aufrufbar und prüft bei jedem Aufruf das bestehende Sitzungstoken.
Direkte Tabellenzugriffe und private Hilfsfunktionen bleiben gesperrt.
Bestehende Daten, Funktionsdefinitionen und Rechte werden nicht ersetzt.

Schreibvorgänge sperren zuerst den bestehenden Workspace und prüfen Rollen,
Kampagnenbindung und Versionen. Request-IDs sind an Akteur, Aktion und Inhalt
gebunden; innerhalb der 24-stündigen Receipt-Aufbewahrung liefert ein identischer
Retry dieselbe Bestätigung. Die einmalige Generatorübernahme bleibt zusätzlich
am Ergebnis selbst gespeichert. Zufallswürfe verwenden serverseitige Zufallsbytes
mit unverzerrter Auswahl. Private Änderungen senden nur berechtigten Empfängern
Live-Ereignisse.

Bei unklarer Antwort bleibt die Aktion unverändert wiederholbar und die übrige
Bedienung gesperrt. Konflikte verbrauchen nichts. Lokale Formular- und Mengeneingaben
bleiben bei Live-Updates erhalten; explizites Neuladen fragt vor dem Verwerfen.
Ungültige eigene Tabellen zeigen einen Formatfehler und behalten den Entwurf.
Veraltete Antworten können einen neu bestätigten Stand nicht zurücksetzen.
Logout und Sitzungswiderruf entfernen private Antwortdaten und Formulare.

Grenzen: 10000 Bestandszeilen insgesamt, 50 eigene Tabellen je Kampagne,
100 Zeilen je Tabelle, 1000 Generatorvorschauen je Kampagne und 10000 bestätigte
Inventarbefehle je Akteur innerhalb der Receipt-Aufbewahrung. Vier feste
Charakterplätze und eine gleichzeitig laufende Spielsitzung bleiben erhalten.
Die vorhandenen eigenen Bogen-/Code-RPCs bleiben kompatibel; dies ist keine
allgemeine Anti-Cheat-Sperre für manuell bearbeitbare Charakterwerte.
Offline-Queue und Benutzer-Import/Export folgen Phase 8.

## Verifikation

40 Unit-/Modellprüfungen, 165 Datenbankszenarien und zusätzliche
Parallelitätsprüfungen. Vier neue Parallelfälle prüfen die letzte Truheneinheit,
denselben Verbrauch mit fünf Retries, mehrfaches Speichern eines Generatorwurfs
und die letzte gemeinsame Kampf-/Inventarressource.

Der Browserablauf prüft fünf Rollen, private Projektionen, HTML-Escaping,
verlorene Verbrauchsbestätigung mit identischem Retry, erhaltene Mengeneingaben,
Versionskonflikte, konkurrierende Truhenentnahme, Heilung im kanonischen Bogen,
Ressourcen/Rast, private Generatorübernahme, eigene Tabellen und 390-Pixel-Layout.
Gezielt besteht er lokal in Chromium und WebKit. Die vollständige Regression
umfasst zusätzlich die bisherigen Rollen-/Viewport-, Mehrspieler-, Kampf-,
Karten- und Kampagnenabläufe in drei Browser-Engines.

Vor der Migration wurde die private Anwendungssicherung mit 34 bestehenden
Tabellen und 38 Funktionsdefinitionen samt Rechten lokal wiederhergestellt.
Die finale Migration erhält vorhandene Datensätze, Funktions-OIDs, Definitionen
und Rechte. Der entstandene SQL-Dump wurde unabhängig erneut eingespielt und
mit dem wiederhergestellten Zustand verglichen. Sicherungen enthalten private
Spielstände und bleiben außerhalb des Repositorys.

## Produktives Backend – 2026-11-10

Migration `20261110143729_phase7_inventory` ist angewandt. Alle 34 bisherigen
Tabellen sind unmittelbar davor/danach nach Anzahl und Prüfsumme unverändert.
Die vorhandenen 38 Funktionen behalten ihre OIDs, Definitionen und Rechte.
Fünf private Tabellen und sechs Funktionen wurden ergänzt. Die lokale SQL-Datei
entspricht dem produktiv angewandten Inhalt und dessen Versionsnummer.

Die Security-Advisors zeigen die erwarteten fünf zusätzlichen privaten
RLS-Tabellen ohne direkte Policies und ein zusätzliches tokengeprüftes
`anon`-RPC. Die bisherige Auth-Passwortmeldung und die drei bisherigen
unindizierten Fremdschlüssel bleiben unverändert; es entsteht kein neuer
unindizierter Fremdschlüssel.

## Abschlussnachweise – 2026-11-10

- [PR #15](https://github.com/jan-jarre-pixel/DnD-Dashboard/pull/15) ist integriert.
  Geprüfter Feature-Commit: `11c4f8f009b679401c72afb7e8b21828b0dcddfd`;
  Merge: `0545892d7b6554f3c3b1dcda04945bc8caab76de`; identischer Git-Baum: `56c5ef047114c2dd8c48da94f91c6af60139a051`.
- [Vollständige CI](https://github.com/jan-jarre-pixel/DnD-Dashboard/actions/runs/42845730707)
  erfolgreich: 40 Unitprüfungen, Build, alle Datenbank- und Paralleltests,
  30 Rollen-/Viewport-Szenarien, native Select-Regressionen und vollständige
  Mehrspieler-/Kampf-/Karten-/Kampagnen-/Inventarabläufe in Chromium, Firefox
  und WebKit. Die bestehende Notiz-/Journalprüfung wurde an die gezählte
  Inventarbedienung angepasst; Freitext bleibt separat gespeichert.
- [Pages-Veröffentlichung](https://github.com/jan-jarre-pixel/DnD-Dashboard/actions/runs/42851222554)
  für den Merge erfolgreich. Alle zehn geänderten HTML-/JS-/CSS-Laufzeitdateien
  stimmen bytegenau mit dem geprüften Quellstand überein.
- `NODE_USE_ENV_PROXY=1 npm run test:production` erfolgreich: beide echten
  Loginseiten auf 1440 × 900 und 390 × 844 Pixeln, Ablehnung ungültiger
  Testcodes, sechs Rollenoptionen und keine JavaScript-Laufzeitfehler.
- `NODE_USE_ENV_PROXY=1 node tests/live-readonly.cjs` erfolgreich: 22 echte
  API-/Edge-Schutzprüfungen einschließlich Inventar-RPC. Positive Spielaktionen
  verwenden isolierte Testdaten; Produktions-Spielstände wurden nicht durch
  positive Testaktionen verändert.

Zusätzlich gezielt lokal bestätigt: Wechsel der laufenden Kampagne nach dem
GM-Login bei erhaltener anderer Vorbereitungsauswahl; danach dieselben
Inventarprüfungen mit parallel geöffnetem Charakterbogen und Heilung ausgehend
von reduzierten TP. Aktuelle Truhe und kanonische Charakterwerte bleiben korrekt.

Damit ist DND-ITEM-001 abgeschlossen. Der nächste offene Schritt ist
DND-UX-001 (Phase 8 – Komfort und Offline).

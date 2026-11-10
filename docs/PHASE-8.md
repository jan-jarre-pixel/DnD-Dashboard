# Phase 8 – Komfort und Offline

Status: **Abgeschlossen, veröffentlicht und lesend produktiv geprüft.**

## Suche und Tastatur

**Suche & Werkzeuge** öffnet auf beiden Seiten denselben Dialog. **Strg/⌘ + K**
öffnet die Suche, **Alt + I** das passende Inventar, **?** die Hilfe. Eingabefelder
fangen keine ?-/Alt-I-Kürzel ab; Escape schließt den Dialog. Die bestehenden
Navigationsansichten und Würfeltasten bleiben erhalten.

Die Suche liest ausschließlich berechtigte Serverprojektionen: eigener Bogen,
eigene Bestände und aktuelle Gruppentruhe sowie freigegebene Inhalte der laufenden
Spielkampagne. Die Spielleitung erhält zusätzlich ihre privaten Einträge,
persönliche Gruppenbestände und Sitzungspläne. Suchbegriffe werden nicht an einen
externen Suchdienst geschickt. Mehrere Wörter müssen zusammen vorkommen;
Akzente und Großschreibung spielen keine Rolle. Höchstens 50 Treffer, jeweils
mit begrenztem Textausschnitt. Suchantworten bleiben flüchtig und werden bei
Abmeldung/Identitätswechsel verworfen.

## Installierbare App

Unter **App installieren & Tastatur** zunächst **Offline-App einrichten / auf
Updates prüfen** wählen und die Installation abwarten. Danach im unterstützten
Browser die App installieren beziehungsweise „Zum Home-Bildschirm“ wählen.
Installationsmenüs unterscheiden sich je Browser; auch ohne Installation bleiben
alle Online-Funktionen verfügbar.

Der Service Worker hält nur öffentliche App-Dateien einschließlich der unverändert
mitgelieferten Supabase-Bibliothek 2.119.0 bereit. Dadurch benötigt ein Offline-Start
keine CDN-Verbindung. Die Bibliothek ist per SHA-256 geprüft und mit MIT-Lizenz
enthalten. POSTs, RPCs, Events, private Kartenbilder, Charakterantworten und
Dateiexporte werden niemals vom Service Worker gecacht. Cache-Namen und
Bereinigung sind auf den Deployment-Pfad beschränkt; andere Anwendungen desselben
GitHub-Pages-Ursprungs bleiben erhalten. Eine unvollständige Shell-Installation
verwirft ihren Teilcache. Neue Versionen warten auf **Neue App-Version laden**;
vor dem Neuladen offene Aktionen bestätigen und Entwürfe sichern.

Die Entwicklungsprüfung der PWA verwendet `npm run build` und einen HTTP-Server
für `dist/`, beispielsweise `python3 -m http.server 8000 --directory dist`.
`sw.js` wird mit einer Prüfsumme der Laufzeitdateien und des Worker-/Build-Codes erzeugt.
Auch reine Worker-Updates verwenden einen neuen Cache. Quell-HTML direkt
im Dateisystem ist kein unterstützter PWA-Betrieb. Produktion benötigt HTTPS;
localhost ist für die lokale Prüfung geeignet.

## Eigene Offline-Kopie und Entwürfe

Angemeldete Spieler laden **Eigenen Serverstand laden**. Der letzte eigene Bogen
ist danach mit Versionsnummer lesbar. Persönliches Journal, Ausrüstungstext und
persönliche Quest-Notizen können als lokale Entwürfe bearbeitet werden.
**Entwurf lokal übernehmen** bestätigt nur den lokalen Stand. Die Oberfläche
kennzeichnet Offline-Betrieb auch außerhalb des Dialogs. Keine neuen Offline-Würfe,
Kampf-, Inventar- oder Truhenbuchungen werden bestätigt.

Erst die ausdrückliche Checkbox **Für diesen Tab … offline bereithalten** sichert
diese Kopie in IndexedDB. Sie ist mit AES-GCM und zufälligem IV verschlüsselt;
der Schlüssel wird aus dem zufälligen Sitzungstoken dieses Tabs abgeleitet und
nicht in IndexedDB gespeichert. Die Kopie gehört zur zuvor bestätigten eigenen
Identität. Sie gilt höchstens zwölf Stunden und höchstens bis zum Sitzungsablauf.
Ein Offline-Neuladen dieses Tabs kann die Kopie öffnen, erzeugt aber keine
bestätigte Online-Anmeldung. Ohne Opt-in bleiben Entwürfe nur im Arbeitsspeicher.
Ein geschlossener Tab ohne wiederhergestellte Sitzung kann seine Kopie nicht
entschlüsseln. Für dauerhafte Sicherungen die private JSON-Datei herunterladen.

**Prüfen & synchronisieren** validiert zuerst die Sitzung erneut und verwendet
anschließend den vorhandenen autorisierten Charakter-RPC mit Originalversion.
Es gibt keine automatische Hintergrundübernahme dieser Offline-Entwürfe. Nach
der bestätigten Wiederverbindung laden Charakterseite und Spieltisch ihre
Online-Ansichten wieder, ohne einen manuellen Reload zu verlangen.
Bei einer verlorenen Antwort wird dieselbe unveränderliche Anfrage mit derselben
Request-ID wiederholt, bei aktivierter Offline-Kopie auch nach einem Neuladen des Tabs. Solange die Antwort
unklar ist, bleiben weitere Notizänderungen gesperrt. Die Aufbewahrung von
Command-Receipts bleibt wie bisher 24 Stunden; lokale Kopien laufen vorher ab.

Bei einem Versionskonflikt wird nichts überschrieben. Der aktuelle Serverstand
wird zum Vergleich geladen. **Notizen auf geladenen Stand übertragen** übernimmt
nach ausdrücklicher Prüfung nur tatsächlich geänderte Notizfelder in eine neue
Basis; Lebenspunkte, Ressourcen und andere Notizfelder bleiben erhalten. Danach
noch einmal prüfen und synchronisieren. Auch diese Speicherung prüft die neue
Version. Ein konkurrierender Schreibzugriff auf dieselbe lokale Kopie wird
zurückgewiesen und bewahrt den lokalen Entwurf zum Herunterladen.

Abmeldung, serverseitiger Sitzungswiderruf und erkannter Ablauf entfernen die
nutzbare Kopie und ihre Dialogfelder. Ein Offline-Gerät kann einen entfernten
Widerruf erst bei erneuter Verbindung erfahren; bis dahin ist die Kopie eine
zeitlich begrenzte, bereits zuvor gelesene persönliche Ansicht. Verschlüsselung
ersetzt weder Geräteschutz noch eine aktuelle Serverberechtigung.

## Charakterdateien – Import, Export und Backup

**Bestätigten Bogen herunterladen** exportiert eine private JSON-Datei mit
`format: dnd-character`, `schema: 1`, Charakterkennung, Datum und Bogenfeldern.
Spieler exportieren ihren eigenen Bogen, die Spielleitung jeden der vier
vorhandenen Charakterplätze. **Lokalen Entwurf herunterladen** sichert zusätzlich
die noch unbestätigten eigenen Änderungen. Zugangscodes und Sitzungstoken werden
nicht exportiert. Unbekannte normale Bogen-Erweiterungen bleiben enthalten;
besondere Objektschlüssel und Zugangsdatenfelder sind ausgeschlossen.

Spieler können ausschließlich Dateien ihres eigenen Charakters importieren.
Die Spielleitung behält hier ihre bisherigen Leserechte. Vor jeder Änderung
erscheint eine Vorschau der tatsächlich abweichenden Felder gegen den frisch
abgerufenen eigenen Serverstand. Erst **Geprüfte Felder übernehmen** und eine
Bestätigung speichern mit Versionsprüfung. Enthaltene Felder werden übernommen;
fehlende Serverfelder werden nicht gelöscht. Ein parallel geänderter Bogen führt
zum Konflikt statt zum Überschreiben. Vor einem neuen Dateiimport vorhandene
Notizentwürfe abschließen. Bei einem Importkonflikt die Datei erneut gegen den
aktuellen Stand prüfen; es gibt keine ungeprüfte automatische Zusammenführung.

Unbekannte Formatversionen, fremde Charaktere, gefährliche Objektschlüssel,
unzulässige Werte, zu tiefe Strukturen und zu große Dateien werden zurückgewiesen.
Importdateien sind höchstens 250000 Zeichen beziehungsweise 250000 Dateibytes
groß, Bogeninhalte höchstens 180000 UTF-8-Bytes und Texte höchstens 20000 Zeichen.
Diese Grenzen liegen innerhalb der vorhandenen RPC-Grenzen.

Diese Dateien sichern den **Charakterbogen**. Gezähltes Inventar, Kampagnenbuch,
Karten und Supabase Auth/Storage sind separate Daten und werden nicht damit
zurückgesetzt. Für die gesamte Anwendung gelten weiterhin die privaten
Betriebssicherungen aus [BACKUP.md](BACKUP.md). Historische Bogen-Sicherungscodes
bleiben kompatibel; die neue geprüfte Vorschau bezieht sich auf dieses JSON-Format.

## Verifikation

54 Unitprüfungen einschließlich Format-/Grenzwertprüfungen, Auth-Lifecycle,
Identitätsstabilität, Offline-Sperren, Service-Worker-Routing, Cache-Isolation und
atomarer Shell-Installation. Die vorhandenen 165 Datenbankszenarien und
Parallelitätsprüfungen bleiben erhalten; es ist keine neue Datenbankmigration nötig.

Der neue Browserablauf verwendet echte isolierte PostgreSQL-RPCs und echte
Service Worker. Er prüft verschlüsselte Kopien, Konfliktvergleich, Erhalt fremder
Notiz-/TP-Änderungen, verlorene Antworten mit identischem Retry nach Reload,
Dateivorschau und -übernahme, fremde Dateien, Offline-Neuladen, fehlende
Offline-Identität, expliziten Reconnect-Sync, öffentliche Cache-Inhalte,
Update-Aktivierung, fremde Caches, private Suchergebnisse, GM-Leserechte,
390-Pixel-Darstellung, konkurrierende lokale Kopien, Ablauf und Logout-Bereinigung.

Playwright-WebKit blockiert mit `context.setOffline(true)` bereits die Navigation
einer minimalen korrekt gecachten Testseite; Firefox meldet im selben Schritt
`NS_ERROR_OFFLINE`. Diese beiden Tests schalten deshalb den tatsächlichen lokalen
HTTP-Server ab und blockieren externe/API-Anfragen; die Navigation muss weiterhin
vollständig aus dem Cache funktionieren. Chromium verwendet den Offline-Schalter
des Browsers. Backend-Anfragen laufen im Test über einen echten lokalen
HTTP-Endpunkt, damit auch vom Service Worker gesteuerte Seiten keine
Inspector-Routen zur Datenbank benötigen.

## Abschlussnachweise – 2026-11-10

- [PR #17](https://github.com/jan-jarre-pixel/DnD-Dashboard/pull/17) ist integriert.
  Geprüfter Feature-Commit: `26c804af705a9bbb8d892066a8e224bc48848588`;
  Merge: `90e8b0e79642c56ab0daa68a460efadd04326be9`; identischer Git-Baum: `659a1ce1693b08870de31caa5a5ade78ee844f6e`.
- [Vollständige CI](https://github.com/jan-jarre-pixel/DnD-Dashboard/actions/runs/42904223205)
  erfolgreich: 54 Unitprüfungen, Build, alle 165 DB-Szenarien und Paralleltests,
  30 Rollen-/Viewport-Szenarien sowie die neuen Komfort-/Datei-/Offline-/PWA-
  Abläufe und die vollständige bisherige Mehrspieler-/Kampf-/Karten-/Kampagnen-/
  Inventarregression in Chromium, Firefox und WebKit.
- [Pages-Veröffentlichung](https://github.com/jan-jarre-pixel/DnD-Dashboard/actions/runs/42909231545)
  für den Merge erfolgreich. Alle 40 öffentlichen Build-Dateien (ohne
  `.nojekyll`) stimmen bytegenau mit dem geprüften Build überein, einschließlich
  generiertem Service Worker, Manifest, Icon und lokal gepinnter Bibliothek.
- `NODE_USE_ENV_PROXY=1 npm run test:production` erfolgreich: beide echten
  Loginseiten auf 1440 × 900 und 390 × 844 Pixeln, sechs Rollenoptionen und
  echte Ablehnung ungültiger Testcodes ohne JavaScript-Laufzeitfehler.
- `NODE_USE_ENV_PROXY=1 node tests/live-readonly.cjs` erfolgreich: 22 echte
  API-/Edge-Schutzprüfungen. Es wurden keine bestätigten Produktions-Spielaktionen
  mit Originalcodes erzeugt.
- Öffentliche Gast-PWA zusätzlich geprüft: Service-Worker-Installation und
  ausschließlich öffentlicher Cache, Offline-Navigation zu beiden Einstiegspunkten,
  klare Offline-Anzeige, keine gecachte Online-Identität und null Backend-Anfragen.
- Keine Datenbankmigration und keine neuen Serverrechte. Private Quellen-/
  Prüfnachweise und SHA-256-Prüfsummen bleiben außerhalb des Repositorys unter
  `/workspace/private-dnd-backup/phase8/`.

Damit ist DND-UX-001 abgeschlossen. Der nächste offene Schritt ist
DND-VTT-001 (Phase 9 – erweiterte VTT-Funktionen).

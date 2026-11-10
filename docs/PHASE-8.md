# Phase 8 – Komfort und Offline

Status: Implementiert; abschließende Prüfung und Veröffentlichung laufen.

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
`sw.js` wird mit einer Prüfsumme der Laufzeitdateien erzeugt. Quell-HTML direkt
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
Es gibt keine automatische Hintergrundübernahme dieser Offline-Entwürfe.
Bei einer verlorenen Antwort wird dieselbe unveränderliche Anfrage mit derselben
Request-ID wiederholt, auch nach einem Neuladen des Tabs. Solange die Antwort
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

53 Unitprüfungen einschließlich Format-/Grenzwertprüfungen, Auth-Lifecycle,
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

# R1 – Designsystem und gemeinsame UI

R0-Konzept am 12.11.2026 ausdrücklich freigegeben; Auftrag: R1 vollständig umsetzen.
R1 erhält einen separaten PR. Kein Merge/Deployment, keine Datenbankmigration und
keine produktiven Spielaktionen gehören zu diesem Auftrag. R2–R5 bleiben getrennt.

## Umsetzung und Verträge

- Maritime, kampagnenneutrale Palette in `public/styles/tokens.css`: Meerblau,
  warme Texttöne und Messing. Helles Pergamenttheme gleichwertig. Alle bisherigen
  `--dnd-*`-Tokens und Legacy-Aliasse bleiben verfügbar.
- Lokal gehostete variable Source Sans 3 (UI) und Literata (Titel), zusammen
  81.236 Bytes WOFF2, SIL-OFL-Lizenzen, Herkunft und Hashes unter `public/fonts`.
  Keine neuen Laufzeit-CDNs, keine übernommenen Illustrationen aus den PDFs.
- Abstände 4/8/12/16/24/32/48/64 px, 44-px-Controls, mobile Shellaktionen 48 px,
  sichtbarer 3-px-Fokus, semantische Farben mit Text, tabellarische Zahlen.
- Ein stabiler Header für beide Einstiege, deutsche Produktzeile, selbst
  gezeichnetes Kompasssymbol und gebündelte Suche/Darstellung/Spieltisch-Abmeldung.
  Der bestehende Logout-DOM-Knoten und sein Handler bleiben erhalten.
- Die alte zweite Spieltisch-Kopfzeile entfällt. Die Transportstatusanzeige der
  Shell bleibt sichtbar; das alte Adapter-Statusziel existiert weiterhin verborgen,
  ohne zweite Live-Region. Speicher- und Sitzungsstatus bleiben in ihren Modulen.
- Shell-Updates verändern nur den Statustext. Die Navigation wird nur bei
  tatsächlichem Routen-/Rollenwechsel ersetzt; Transportupdates zerstören keinen
  aktiven Headerfokus.
- Darstellungs-Drawer als natives modales `dialog`: Initialfokus, Fokusbegrenzung,
  Escape/Schließen und Rückkehr zum Auslöser. Dunkel/Hell wird ausschließlich als
  nicht sensible Einstellung `dnd-theme` gespeichert. Kein Speicherzwang.
- Wiederverwendbare, Text/Attribute escapende Komponenten: Button mit
  Pending/Disabled-Status und Varianten, Badge, beschriftetes Feld mit
  Fehler-/Hilfszuordnung, Leer-/Fehlernachricht und Dialogcontroller mit gemeinsamem
  Schließschutz für ungesicherte Entwürfe. Sie sind keine Autorisierungsgrenze.
- Vorhandene Formulare/Panels erhalten die gemeinsamen Grundstile. Detaillayouts
  von Spieler, GM und Karte bleiben Gegenstand von R2/R3/R4.

## Routing-Kompatibilität

| Einstieg / Hash | R1-Ziel (unverändert bedienbar) |
|---|---|
| `./#dashboard` | Spieler-Quick-View |
| `./#character` | vollständiger Bogen bzw. GM-Gruppenübersicht |
| `./#actions` | Aktionen/Zauber |
| `./#inventory` | Bestand und Ausrüstungsnotizen |
| `./#journal` | persönliche Notizen und freigegebene Inhalte |
| `spieltisch.html#session` (oder ohne Hash) | Live-Sitzung |
| `#prep` | private Vorbereitung |
| `#campaign` | Kampagnenbuch |
| `#items` | Inventar/Generatoren |
| `#combat` | Kampfmanager |
| `#map` | Karten/VTT |
| `#group` | GM-Spielerstatus |
| `#history` | Protokolle |

GM-Links für Kampagnenbuch und Inventar/Generatoren sind jetzt auch in der
seitenübergreifenden Shell verfügbar. Der bekannte `.gm-navigation`-Arbeitsbereich
bleibt bestehen; die globale GM-Navigation ist dort wie bisher ausgeblendet.
R1 wechselt weder Rollen noch Sitzungskampagne durch Navigation. Die endgültige
Informationsarchitektur mit Spieler-„Spielen“ und GM-Arbeitsmodi folgt R2–R4.

## Sicherheit, Daten und PWA

Keine Änderungen unter `src/data`, `src/core`, SQL, Edge-Funktion oder SDK.
Keine neuen API-Aufrufe, keine neuen Rollen, keine Schema-/Datenmigration.
RPC-, CAS-, Receipt-, Eigentums-, Sicht- und Kampagnenbindungsverträge bleiben.
Native Details der Offline-/Import-/Updateoberfläche bleiben erhalten; R1 bündelt
nur den Einstieg in der Shell. Kein automatisches Aktivieren eines PWA-Updates.

Neue Fonts, Kompass und Preference-Script werden vom bestehenden Build automatisch
als öffentliche Assets versioniert und in der öffentlichen App-Shell gecacht.
Private Antworten/Karten/POSTs werden weiterhin nicht gecacht. `manifest`-Farben
entsprechen dem dunklen Standardtheme. Alter installierter PWA-Stand bleibt bis
zum ausdrücklichen Update aktiv. Keine neue Speicherung von Identitäten oder Codes.

## Akzeptanz und Tests

- Zwei Einstiege, ein Header; gleiches Theme und gemeinsame Bausteine.
- 320/768/1024/1440 px: Drawer ohne Dokumentoverflow; Themewechsel speicherbar,
  auch ohne Storage lauffähig; beide Themes mit lesbaren Zuständen.
- Alle alten Hashlinks und vorhandenen Funktionen erhalten; nur Serveridentität
  entscheidet über GM/Player. Headerfokus bleibt bei Live-Statusupdates erhalten.
- Kontrast-Unitprüfungen umfassen Text, Akzente, semantische Rückmeldung,
  interaktive Konturen, Fokus und Primärbuttons auf allen drei Flächen.
- Neue Komponententests prüfen HTML-Escaping, begrenzte Varianten, zugeordnete
  Fehlertexte, Pending-Buttons, Dialog-Schließschutz und Präferenzvalidierung.
- `npm run test:design`: beide Einstiege, vier Viewports, beide Themes,
  16 axe-AA-Scans im Drawer plus zwei Komponenten-Zustandsscans, Fokus, Persistenz und acht GM-Hashlinks.
  Läuft im vorhandenen Drei-Browser-CI-Job nach allgemeiner QA.
- Der alte datenbanklose Browser-Mock beantwortet nun auch `dnd_sync_call`
  `character.read` und `party.read`. Ohne diese Antworten scheiterte der in R0
  dokumentierte Mock-Login an `null.sheet`; die echten RPCs werden nicht geändert.
- Gesamte bestehende Suite bleibt erhalten: Unit, Build, isolierte DB,
  Browser/Layout, Security, QA, Comfort/Offline/PWA und Multiplayer.

Die authentifizierte visuelle Baseline wurde vor den Layoutänderungen mit dem
bestehenden isolierten DB-Harness aufgenommen: 13 Ansichten × Desktop/Mobil =
26 Screenshots mit synthetischen Daten. Keine Originalcodes/Spielstände.
Screenshots und Testprotokolle werden als PR-Nachweise außerhalb des öffentlichen
App-Builds aufbewahrt. Abschließende Ergebnisse und CI-Nachweise stehen in der PR-Abnahme.

## Releasegrenze und Folgephasen

Der R1-PR bleibt zur Prüfung offen. Ein Merge nach `main` startet aktuell Pages;
deshalb ist Merge bereits die Veröffentlichungsentscheidung. Für diesen Auftrag
kein Merge und kein Deployment. R1 kann anhand synthetischer Screenshots und CI
abgenommen werden. Fehlerbehebung vor Veröffentlichung erfolgt auf diesem Branch.
Nach einer später freigegebenen Veröffentlichung: Frontend-Revert-PR mit grüner
CI, keine Datenbankwiederherstellung; PWA-Updates weiterhin ausdrücklich auslösen.
Die Sicherheitskorrekturen aus Phase 10 dürfen durch einen Revert nicht entfallen.

Echte Geräte, NVDA/VoiceOver und mehrstündige Live-Performance bleiben ausdrücklich
Teil R4/R5. Automatische AA-Scans sind keine vollständige WCAG-Zertifizierung.

## Nachweise und geschlossene R1-Regressionsbefunde

PR: https://github.com/jan-jarre-pixel/DnD-Dashboard/pull/23

Lokal bestanden: 63 Unit-/Kontrast-/Komponententests, vollständige isolierte
DB-Suite (197 Szenarien plus Parallelität/Geometrie/Last), 10 authentifizierte
Chromium-Rollen-/Viewportabläufe, gespeicherter Cross-Role-XSS-/Ressourcen-DOM-Test,
48 allgemeine AA-Scans und Komfort-/Offline-/PWA-Abläufe. Die vollständige
Drei-Browser-CI prüft denselben Branch; der aktuelle vollständige Abnahmestand
und die konkreten Run-Links sind im PR festgehalten. Kein positiver Produktionstest.

Der 320-px-Reflow-Test deckte im umgestalteten Charakterlogin die intrinsische
Mindestbreite des nativen Rollen-Selects auf. Die Gridspalte ist jetzt explizit
`minmax(0,1fr)`, ihre Kinder dürfen schrumpfen; die vorhandene Reflow-Assertion
bestand anschließend. Bei der Zustandsprüfung wurden außerdem verbliebene
Legacy-Farben für aktive Buttons und kritische/fehlgeschlagene Würfel auf
semantische Kontrastpaare umgestellt. Zwei zusätzliche Zustands-Scans und eine
Prüfung der tatsächlich berechneten Active-Farben sichern diese Paare ab.

Wiederholte unveränderte Transportzustände schreiben den Text der Live-Region
nicht erneut. Fokus und Headerknoten bleiben beim Statuswechsel erhalten.

R2, R3 und R4 werden durch R1 nicht begonnen. Echte Gerätetests und assistive
Technik bleiben wie in R0 vereinbart Teil der späteren Gesamt-QA.

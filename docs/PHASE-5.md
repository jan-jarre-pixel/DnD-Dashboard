# Phase 5 – Karten und Virtual Tabletop

Status: Abgeschlossen; CI und Veröffentlichung bestanden, Produktion lesend geprüft. Kein Produktiv-Spieltest mit Originalcodes behauptet.
Arbeitspaket: DND-MAP-001. Entwicklung ausschließlich in DnD-Dashboard.

## Bedienbare Funktionen

- Eigenständiger GM-Bereich **Karten**, private Bibliothek mit Archiv/Umschaltung,
  JPG-/PNG-/WebP-Upload, Titel und Zuordnung zu einer benannten Szene.
- Explizites Veröffentlichen/Zurückziehen für die aktuelle Spielsitzung. Spieler
  sehen nur diese Karte. Sitzungsende und ein neuer Sitzungszyklus geben alte Karten
  nicht automatisch frei. Pause erlaubt Lesen, sperrt Spielerbewegungen und Pings.
- Quadratisches, hexagonales und rasterloses Spiel; Rastergröße, X/Y-Ausrichtung
  und ft-Maßstab. Zoom, ganzer Ausschnitt und Verschieben per Zeiger oder Knöpfen.
- Auswahlwerkzeug, optionales Einrasten, Token-Dragging mit lokaler Vorschau und
  genau einer verbindlichen Serverbestätigung beim Loslassen. Koordinatenformular,
  native Auswahlliste und Pfeiltasten bieten alternative Bedienwege.
- Tokens hinzufügen, bewegen, drehen, skalieren, verbergen, entfernen und Besitz
  zuweisen. Charaktertokens gehören ihrem Charakter. Spielleitung kann eigene
  NPC-Tokens an einen Spieler delegieren. Fremde/verborgene Tokens bleiben geschützt.
- Direkte Verknüpfung mit einer zugeordneten Kampfbegegnung und deren Teilnehmern.
  Die Token-FK referenziert dieselbe Instanz wie die Initiative. Verknüpfte TP und
  Zustände kommen aus dem Kampfmanager bzw. dem bestehenden Charakterbogen.
  Die Auswahl bietet einen direkten Knopf zum betreffenden Kampfteilnehmer
  für TP-/Zustandsänderungen sowie zum eigenen Charakterbogen.
- Rechteckige Props, elliptische Flächeneffekte und beschriftete DM-Notizen.
  Auswahl und Bearbeitung erfolgen über Karte oder Formular; keine HTML-Notizen.
- Layer: Base Map, Objects & Props, Tokens & Effects, Visibility & Fog,
  DM-only Annotations. DM-Notizen werden niemals an Spieler übertragen.
- Einfacher Fog of War: Einzelkacheln oder gezogener Rechteckbereich aufdecken/
  verbergen; dieselbe Funktion über Kachelkoordinaten und Gesamtkarten-Knöpfe.
- Entfernung mit zwei Zeigerpunkten oder Koordinaten messen. Quadratisch/rasterlos
  euklidisch, hexagonal über Hexschritte; der eingestellte Maßstab gilt jeweils.
- Gemeinsame, kurzlebige Pings; ein Ping je Akteur/Sekunde, nur freigegebene Bereiche.
- Responsive Kartenfläche und gestapelte Formulare auf Mobilgeräten. Sichtbarer
  Fokus, native Formulare, beschriftete Werkzeuge und reduzierte Ping-Animation.
  Keine vollständige WCAG- oder physische Geräte-Zertifizierung behauptet.

## Sichere Bildfreigabe und kostenlose Grenzen

Das bestehende Projekt verwendet befristete, servergeprüfte Code-Sitzungen,
keine Storage-kompatiblen Auth-JWTs. Ein öffentlicher Bucket mit einer vollständigen
Karten-URL würde Fog of War umgehen. Die Basisimplementierung verwendet deshalb
privat gespeicherte, normalisierte Bildkacheln und die bestehende tokengeprüfte RPC.
Es entstehen kein neuer Server, kein neues Projekt und keine kostenpflichtigen Dienste.

Der Browser prüft Dateityp und Bildsignatur, akzeptiert höchstens 8 MiB und
4096 × 4096 Pixel und normalisiert auf höchstens 2048 × 2048 Pixel. Kleine
Abmessungen werden auf mindestens 256 Pixel gepolstert. Die ursprüngliche Datei
wird nicht öffentlich hochgeladen. Gespeichert werden bis zu 64 WebP-/PNG-Kacheln
von 256 × 256 Pixeln, höchstens 100.000 Zeichen pro Kachel und 2.000.000 Zeichen
JSON-Kacheldaten pro Karte. Die RPC prüft Grenzen, vollständige Koordinaten,
Base64 und die PNG/JPEG/WebP-Signatur erneut. Andere Formate und URLs sind unzulässig.

Maximal 24 Karten einschließlich Archiv begrenzen Bildwachstum auf unter 48 MB
Kacheldaten vor Datenbankkompression. Pro Karte höchstens 50 Tokens und 500 Objekte.
Archivieren erhält Daten; es erhöht dieses Kontingent nicht. Originalbilder sollte
man separat aufbewahren: Die normalisierte Spielkarte ist kein Originaldatei-Archiv.

**Nebel hat bewusst eine Granularität von 256 Bildpixeln**, unabhängig vom Spielraster.
Der Server gibt nur ausdrücklich aufgedeckte Kacheln aus. Weder ursprüngliches Bild
noch eine vollständige Bild-URL, verborgene Bildbytes, versteckte Token-IDs oder
DM-Notizen werden an Spieler gesendet. Tokens/Objekte müssen mit ihrer vollständigen
Fläche in freigegebenen Kacheln liegen. Spielerbewegungen prüfen auch die Strecke
in kleinen Schritten gegen den Nebel. Wiederverbergen entfernt Daten aus künftigen
Antworten und der aktuellen Oberfläche. Früher gesehene Bilder kann man nicht zurückholen.

Kachel-SHA256 sowie Hashes der bereits autorisierten Token-/Objektprojektionen
vermeiden erneute Übertragung unveränderter Daten. Hashes entstehen nach der
Sichtbarkeitsprüfung. Der private Browsercache liegt nur im Arbeitsspeicher dieses
Tabs und wird bei Abmeldung/Sitzungsablauf oder Kartenwechsel entfernt. Kein
Service Worker, kein dauerhafter Offline-Cache geheimer Karten und keine behauptete
bestätigte Offline-Kampfaktion. PWA/Offline-Ansichten folgen Phase 8.

## Datenmodell und Autorisierung

Additive Migration `supabase/migrations/20261109144905_phase5_virtual_tabletop.sql`:

| Private Tabelle | Zweck |
| --- | --- |
| vtt_maps | Kartenmetadaten, Szene, Encounter-FK, Raster und Versionen |
| vtt_tiles | Bildkacheln, Hash und Freigabe |
| vtt_state | Eine ausdrücklich veröffentlichte Karte, Sitzung und CAS-Version |
| vtt_tokens | Position/Transformation/Besitz und eindeutige Combatant-FK |
| vtt_objects | Props, Effekte und private Anmerkungen |
| vtt_commands | Actor-gebundene Idempotenz-Receipts |
| vtt_log | Auditierbare UUID-Aktionen und kurzlebige Ping-Projektion |

Alle sieben Tabellen: RLS aktiv, keine direkten anon/authenticated-Rechte.
Hilfsfunktionen privat und EXECUTE entzogen. `dnd_vtt_call` prüft bei jedem Aufruf
Identität, Ablauf und Rolle des bestehenden Tokens, bei Mutationen zusätzlich
Sitzung und Versionen. Leerer search_path; keine Client-Metadaten als Rechtequelle.

- Owner-Befehle ausschließlich für die serverseitige GM-Identität.
- Spieler können nur eigene, aktuell sichtbare Tokens der veröffentlichten Karte
  bewegen/drehen. Übermittelte fremde Besitzer oder Größen werden nicht übernommen.
- Ein verknüpfter Combatant muss zur Kartenbegegnung gehören. Seine Instanz kann
  genau einen verknüpften Token besitzen. Vor einer Neuzuordnung die Verknüpfung
  lösen oder den Token entfernen; der Charakter/Kampfteilnehmer bleibt erhalten.
- `vtt_tokens.combatant_id` ist die kanonische Verknüpfung. Die alten nullable
  Platzhalter `combatants.map_id/token_id` werden nicht als zweite Zuordnung gepflegt.
  Keine TP-Kopie in Tokens. Namens-/Stat-Projektionen folgen dem echten Combatant.
- Vorbereitete, ausgeblendete oder nicht freigegebene Gegner erscheinen auch dann
  nicht, wenn ein Token aufgedeckt wurde. Gegnerstats benötigen die Kampf-Freigabe.
- Private und öffentliche Kartenversionen; geheime Token-/Notizänderungen erzeugen
  keine Spielerzustellung oder öffentliche Versionsänderung. Live-Events enthalten
  keine Objekt-IDs, Namen, Bildbytes oder geheimen Koordinaten.
- Globale Sperrreihenfolge wie bisher: Workspace vor Karte/Token und Sync-Cursor.
  Unabhängige Tokenbewegungen verwenden eigene Tokenversionen statt globalem
  Karten-CAS; Nebel-/Rasterrevision wird zusätzlich geprüft. So können mehrere
  Spieler unabhängig bewegen, während konkurrierende Änderungen desselben Tokens
  oder einer inzwischen geänderten Freigabe ausdrücklich abgelehnt werden.
- Request-ID, Akteur, Aktion und vollständiger Payload-Hash verhindern doppelte
  Anwendung oder veränderte Wiederholungen. Receipts 24 Stunden, Tokens höchstens
  zwölf Stunden; 10.000 Mutationen je Akteur/Tag. Unklare Netzwerkantworten behalten
  ihre ursprüngliche Anfrage bis zur erneuten Bestätigung; keine automatische Queue.
- Formularentwürfe behalten ihre ursprünglichen Versionen trotz Live-Updates.
  Konflikte benötigen eine bewusste Aktualisierung. Abmelden/Verlassen warnt vor
  nicht gespeicherten Eingaben, laufenden Uploads und unbestätigten Aktionen.

Keine bestehenden Tabelleninhalte, Zugangscodes, RPC-Definitionen oder Rechte
werden durch diese Migration verändert. Die bisherigen Rückfallclients bleiben
nutzbar. `sideline26` wird nicht verändert.

## Bewusste Regelgrenzen und Folgephasen

Bewegen eines Tokens ist keine automatische D&D-Bewegungsabbuchung. Die bereits
vorhandenen Kampfbewegungen/Aktionen verwaltet man separat. Entfernung, Wände,
Bewegungsarten, Hausregeln und strittige Wege entscheidet die Spielleitung.
Rasterloser Maßstab bezieht sich auf die eingestellte Rasterbreite als Referenz.
Es gibt noch keine Sichtlinien, Lichtquellen, Türen oder dynamische Sichtbarkeit
(Phase 9). Die fünf Darstellungslayer sind keine mehrstöckigen Dungeon-Karten.

Szene ist die benannte Kartenzuordnung; Kampagnen-/NPC-/Encounter-Planung mit
Schwierigkeit, Loot und Statblock-Bibliothek folgt Phase 6. Neue Gegner für diese
Phase legt man im vorhandenen Kampfmanager an und verknüpft ihre echte Instanz.
Datei-Exporte/Importe und bequemere Backups folgen Phase 8; private Betriebssicherung
und isolierte Wiederherstellung sind schon Bestandteil dieser Abnahme.

## Nachweise der Abnahme

- Vorher-Sicherung aller 22 Anwendungstabellen und 29 Funktionsdefinitionen privat.
- Isolierte Wiederherstellung exakt verglichen; vollständige neue Migration erhält
  alle bisherigen Zeilen sowie bisherigen Funktionsdefinitionen, OIDs und Grants.
- 28 neue DB-Szenarien einschließlich privater Bildbytes, IDOR, Rollen, Fog,
  Instanzverknüpfung, Retry, CAS, Sessionbindung und Ressourcenlimits.
  20 echte gleichzeitige unabhängige Bewegungen; 50 Tokens und 500 Objekte lokal.
- Drei neue reine Geometrietests; alle bestehenden Regressionen bleiben aktiv.
- Browserprüfungen mit realen lokalen RPCs und HTTP-SSE: Bild-Upload, Freigabe,
  vier Spielerbewegungen, verlorene Antwort, Konfliktentwurf, Raster, Messung,
  private Anmerkungen/XSS, Ping, Wiederverbindung, Tastatur, Last und Mobilansicht.
- Produktive additive Migration 20261109144905 erfolgreich angewandt. Dateiname
  an die tatsächliche Historie angepasst; SQL-Inhalt identisch zur lokalen Abnahme.
  Alle 22 bisherigen Tabellen und alle 29 bisherigen Funktionsdefinitionen, OIDs
  und Grants unmittelbar vor/nach Anwendung identisch. Sieben neue Tabellen mit
  RLS und ohne direkte anon/authenticated-Leserechte bestätigt.
- Abschließender Restore aller 29 Anwendungstabellen exakt verglichen; die
  Würfel-Identity-Sequenz ist für nachfolgende Würfe synchronisiert.
- 34 Node-Tests, insgesamt 121 DB-Szenarien (93 bisherige + 28 neue),
  Parallelitäts-/50-Wurf-Tests und zehn Chromium-Rollen-/Viewport-Szenarien
  lokal bestanden. Gezielter VTT-Browserdurchlauf mit echtem Touch-Eingabekontext
  bestanden; beobachtete 50-Token-/500-Objekt-Darstellung einschließlich Abruf
  lokal 679 bzw. 1248 ms in zwei Durchläufen, DB-Projektion einschließlich docker/psql 82–88 ms. Keine
  garantierten Produktionslatenzen oder Core-Web-Vitals-Abnahme behauptet.
- 20 echte lesende/ablehnende API-/Edge-Prüfungen bestanden, einschließlich
  ungültigem Token am neuen Karten-RPC. Keine echten Spielerwerte verändert.
- Advisor-Hinweise: beabsichtigte direkte RLS-Sperren ohne Policy, öffentlich
  aufrufbare, intern tokengeprüfte Definer-RPCs und bereits bekannte deaktivierte
  Leaked-Password-Protection für die unbenutzte Passwortanmeldung.
  [RLS-Hinweis](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy),
  [RPC-Hinweis](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable).
  Neue Fremdschlüssel besitzen passende Indizes; unbenutzte neue Indizes sind
  vor echtem Spielbetrieb erwartbar.
- Abschließende CI, Pages-Veröffentlichung und lesende Produktionsprüfung bestanden; siehe Abschlussnachweise.
  Original-Spielercodes werden nicht für positive Live-Tests benutzt.


## Korrigierte Zwischenbefunde

Lokale SQL-Alias-/Variablennamen vor jeder produktiven Anwendung bereinigt.
Browserprüfungen öffnen native Detailbereiche ausdrücklich und warten auf die
wirkliche SVG-Darstellung. Der vollständige Mehrspielertest deckte überlappende
Tokens auf: Die Auswahl wird nun innerhalb der Tokenebene in den Vordergrund
gezeichnet; tatsächliches Ziehen und resultierende Serverposition sind als
Regression geprüft. Das Mess-/Zoom-Werkzeug verwendet Bildschirmkoordinaten erst
nach sichtbarem Scrollen zur Kartenfläche. Keine Prüfung wurde übersprungen.
Zusätzliche Pixelprüfung: Die freigegebene Bildkachel ist tatsächlich 256 × 256
und enthält ausschließlich den freigegebenen Quadranten des eigenen Testbilds.
Eine separate Wiederherstellungsprobe mit nichtleeren synthetischen Bildkacheln
vergleicht alle 29 Tabellen ebenfalls exakt.


Zusätzliche Kompatibilitätsmigration `20261109153439_phase5_legacy_token_projection.sql`:
Standalone-Charaktertokens verwenden ebenfalls die bestehende `combat_state`-
Normalisierung. Ungültige alte TP-/Zustandswerte werden in der Ausgabe abgefangen,
ohne gespeicherte Bögen umzuschreiben. Alle 29 Tabellen vor/nach Anwendung
identisch, sämtliche 33 Funktions-OIDs und Grants gleich; nur die neue private
Kartenprojektion verbessert. Der zusätzliche Regressionstest prüft auch, dass
die gespeicherten Legacy-Werte erhalten bleiben.

Weitere Browserbefunde: Firefox quantisiert Mauskoordinaten auf CSS-Pixel; der
Zeigertest prüft die tatsächliche Serverposition mit einer Pixel-Toleranz.
Zeigerziele bleiben beim Start einer Bewegung erhalten. Sichtbar gesperrte
Schreibaktionen und Eingaben bleiben bis zum Abschluss einer laufenden Anfrage
gesperrt; eine absichtlich verzögerte und dann verlorene HTTP-Antwort prüft dies
zusammen mit der idempotenten Rückbestätigung. Echtes Panning berücksichtigt die
SVG-Skalierung einschließlich seitlicher Leerflächen.


Kartenwechsel sind zusätzlich gegen verspätete Antworten einer vorherigen Karte
geschützt. Ein absichtlich zurückgehaltener alter Snapshot darf die nach einem
bestätigten Upload neu ausgewählte Karte nicht überschreiben. Explizite
Aktualisierungen behalten ihren Discard-Auftrag auch hinter einem laufenden Abruf.
Native Formulare erhalten schrumpfbare Breiten und umbrechende Knöpfe; die
Viewport-Prüfung wartet auf den tatsächlichen Reflow und prüft anschließend
weiterhin die gesamte Dokumentbreite.

WebKit ließ sich nach anfänglich fehlenden Systembibliotheken ohne Root-Installation
mit lokal extrahierten Debian-Bibliotheken starten. Ein vollständiger gezielter
Kartenablauf mit echter WebKit-Engine bestand anschließend lokal. Die CI verwendet
weiter ihre unveränderte Installation der gepinnten Browser/Abhängigkeiten.


## Abschlusskorrekturen für Browser und mobile Bedienung

Kartenwerkzeuge wechseln auf kleinen Bildschirmen mit einer sinnvollen
Flex-Basis in mehrere Zeilen. Beschriftungen bleiben lesbar; auch der
Kartenkopf kann umbrechen. Sichtbare Werkzeugknöpfe werden auf mindestens
44 × 44 CSS-Pixel geprüft.

WebKit rechnete die Zeichenfläche langer nativer Select-Einträge zur
Dokumentbreite, obwohl die HTML-Feldrahmen und Textbereiche innerhalb der
Seite lagen. Die vollständige Ubuntu-26.04-CI meldete dadurch 419 statt
390 Pixel. Ein isolierter Test mit einem erlaubten 100-Zeichen-Namen
reproduzierte den Fehler auch auf Desktop. `contain: paint` begrenzt diese
Zeichenfläche direkt am nativen Select. Die Begrenzung gilt für dieses Feld.
Der vollständige Name bleibt im DOM und im nativen Auswahlmenü erhalten.

`npm run test:layout` prüft die tatsächlichen Stylesheets ohne Datenbank:
Desktop und Mobil, kurze/lange Auswahlwerte und Tastaturauswahl. Die Prüfung
schlug unter Ubuntu-WebKit vor der CSS-Korrektur fehl und bestand danach
unter WebKit und Chromium. Zusätzlich bestand unter Ubuntu-WebKit die
Auswahl über den geöffneten nativen Dialog. Die CI führt diese Regression
für alle drei Engines direkt nach der Browserinstallation aus.

Die vollständige mobile Kartenprüfung aktiviert und verkleinert jedes
Rollenfenster einzeln, wartet auf den Paint und prüft weiterhin die ganze
Dokumentbreite mit unveränderter Fünf-Sekunden-Grenze. Fehlerdiagnosen
berücksichtigen nun Scrollversatz, aktive Ansicht, Schrift und Textbereiche.
Eine festhängende WebKit-Einrichtung vor Testbeginn führte außerdem zu einer
Zehn-Minuten-Grenze ausschließlich für die Browserinstallation. Keine
Browser-Engine und kein Prüfablauf wurden entfernt.

Erneut bestanden: 34 Unit-Tests, Build, alle 121 DB-Szenarien einschließlich
der bisherigen Parallelitätsprüfungen und 20 echte lesende/ablehnende
Produktions-API-Prüfungen. Die vollständigen lokalen WebKit-Abläufe unter
Debian 13 und Ubuntu 26.04 bestanden einschließlich 50 Tokens/500 Objekten
und mobiler Prüfung. Gemessene lokale Zeiten bis zur Darstellung: 9506 bzw.
9187 ms; keine Produktionslatenz-Zusage. Die abschließenden CI- und Pages-Nachweise
stehen im folgenden Abschlussabschnitt.


## Abschlussnachweise – 2026-11-10

- [PR #11](https://github.com/jan-jarre-pixel/DnD-Dashboard/pull/11) ist integriert.
  Geprüfter Feature-Commit: `17c1b64d6553f2d3dc8d3b048dda3144eab942d2`;
  Merge: `188ba1eaa5cca7e6f4d5f94462079ab39291b16d`. Die Git-Bäume des
  geprüften Features und dieses Merges sind identisch.
- [Vollständige CI](https://github.com/jan-jarre-pixel/DnD-Dashboard/actions/runs/42696286956)
  erfolgreich: Unit/Build und sämtliche Datenbank-, Rollen-, Layout- und
  Mehrspieler-/Kampf-/Kartenprüfungen in Chromium, Firefox und WebKit.
- [Pages-Veröffentlichung](https://github.com/jan-jarre-pixel/DnD-Dashboard/actions/runs/42771191972)
  für den Merge erfolgreich. Die live ausgelieferten Dateien
  `public/styles/vtt.css` und `src/ui/vtt.js` wurden bytegenau mit dem
  geprüften Quellstand verglichen.
- `npm run test:production` erfolgreich auf der echten
  [öffentlichen Anwendung](https://jan-jarre-pixel.github.io/DnD-Dashboard/):
  beide Loginseiten mit 1440 × 900 und 390 × 844 Pixeln, sechs Rollenoptionen,
  echte Ablehnung absichtlich ungültiger Codes und keine JavaScript-Laufzeitfehler.
- `NODE_USE_ENV_PROXY=1 node tests/live-readonly.cjs` erneut erfolgreich:
  20 echte Lese-/Ablehnungsprüfungen einschließlich Karten-RPC und Edge-Transport.
  Es wurden keine bestätigten Spieleraktionen oder Änderungen echter
  Spielerwerte erzeugt.

Damit ist DND-MAP-001 abgeschlossen. Der nächste offene Implementierungsschritt
ist DND-CAMPAIGN-001 (Phase 6).

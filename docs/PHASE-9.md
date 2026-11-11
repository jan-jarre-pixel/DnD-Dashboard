# Phase 9 – Licht, Türen, Sichtlinien und Ebenen

Status: **Abgeschlossen, veröffentlicht und lesend produktiv geprüft.**
Arbeitspaket: DND-VTT-001.

## Bedienung

Die Spielleitung öffnet **Karten → Ebenen, Licht & Sichtlinien**. Bestehende
Karten behalten **Manuelle Nebelfreigabe** und benötigen keine Neueinrichtung.
Wände und geschlossene Türen begrenzen Spielerbewegungen, sobald man sie anlegt.
Die Spielleitung kann Tokens weiterhin versetzen und so strittige Wege entscheiden.

Für persönliche Sicht:

1. Eine Karte und die gewünschte Ebene ausdrücklich für die laufende Sitzung
   veröffentlichen. Den grundsätzlich erlaubten Bereich mit dem bestehenden
   Nebelwerkzeug freigeben. Sichtlinien erweitern niemals diese Freigabe.
2. Eigene Spieler-Tokens auswählen, freigeben und einen **Sichtradius** größer
   null in Bildpixeln einstellen. Besitz bestimmt die betrachtende Person;
   verborgene oder fremde Tokens verleihen keine Sicht. Höchstens acht
   Sicht-Tokens auf einer Karte, auch über mehrere Ebenen hinweg.
3. **Persönliche Sichtlinien** aktivieren. **Umgebungslicht** erlaubt die Sicht
   innerhalb des Sichtradius. Ohne Umgebungslicht braucht die betrachtete Fläche
   eine aktive Lichtquelle oder muss innerhalb der konfigurierten Dunkelsicht
   liegen. Auch Dunkelsicht umgeht keine Wand und keinen geschlossenen Durchgang.
4. Wände und Türen als Strecke X1/Y1–X2/Y2 eintragen. Eine Lichtquelle verwendet
   X1/Y1 als Mittelpunkt und den Radius. **Aktiv** schaltet die Geometrie ein.
   Maximal 64 Geometrien pro Karte, davon acht Lichtquellen; Radius höchstens
   2048 Pixel. Namen von sichtbaren Türen werden auch Spielern angezeigt.
5. Türen sind **Offen**, **Geschlossen** oder **Verriegelt**. Der Umschaltknopf
   öffnet/schließt eine unverriegelte Tür; eine verriegelte Tür muss zunächst
   ausdrücklich im Formular entriegelt werden. Licht lässt sich über denselben
   Knopf ein-/ausschalten. Nur die Spielleitung steuert Türen und Licht.
6. **Spielersicht prüfen** zeigt eine lesende Vorschau der tatsächlich vom
   Server erlaubten veröffentlichten Karte für den gewählten Spieler. Diese
   Vorschau erhält dieselbe Projektion wie der betreffende Spieler. Sie liefert
   weder eine private Karte noch eine andere vorbereitete Ebene aus. Die
   vereinfachte Momentaufnahme zeichnet Bildkacheln, Tokens und Türen; Props,
   Effekte, Raster, Messungen und Pings erscheinen in der Hauptkartenansicht.

## Kartenebenen

Jede Karte beginnt mit **Erdgeschoss**. Bis zu vier benannte Ebenen besitzen
eigene Bildkacheln und eigene Nebelfreigaben. Ein neues Ebenenbild hat dieselben
normalisierten Maße wie die bestehende Karte. Die bisherigen Bildgrenzen gelten
weiter: JPG/PNG/WebP, höchstens 8 MiB und 4096 × 4096 Pixel vor Normalisierung,
höchstens 2048 × 2048 danach. Alle Ebenen einer Karte teilen sich das vorhandene
Kontingent von höchstens 2 MB Bilddaten; es entsteht kein vierfaches Kartenbudget.

**Ebene privat hinzufügen** wechselt die veröffentlichte Ebene nicht und startet
mit vollständig verdecktem Nebel. **Ebene wechseln** wählt ausdrücklich die
aktive Ebene für alle Teilnehmer der laufenden Sitzung. Spieler erhalten nur
deren Namen, Bilder, berechtigte Tokens/Objekte und sichtbare Türen. Namen,
Bildbytes und Tokens anderer Ebenen bleiben privat.

Die Spielleitung kann einen vorhandenen Token oder ein Objekt im jeweiligen
Formular einer anderen Ebene zuweisen. Die Token-ID, Charakterzuordnung und
verknüpfte Kampfinstanz bleiben dabei erhalten. Treppen sind eine bewusste
Versetzung durch die Spielleitung; es gibt keine automatisch ausgelösten Portale.
Die bisherigen Darstellungslayer für Props, Effekte und DM-Notizen bleiben
zusätzlich bestehen. Im SVG erscheinen nur Elemente der aktiven Kartenebene.

## Sichtbarkeit und Regelgrenzen

Die Sichtberechnung geschieht im autorisierten Datenbank-RPC. Spieler erhalten
keine verdeckten Bildbytes, vollständigen Karten-URLs, privaten Wand-/Lichtdaten,
DM-Notizen oder versteckten Token-IDs. Ihre eigene sichtbare Projektion wird
gehasht; bekannte Hashes umgehen keine erneute Berechtigungsprüfung.

Die vorhandenen **256 × 256 Pixel großen Bildkacheln** bleiben die kleinste
Ausgabeeinheit. Eine Kachel wird nur ausgegeben, wenn ihre gesamte Pixelmitten-
Fläche gleichzeitig von mindestens einem eigenen Sicht-Token gesehen werden
kann und vollständig beleuchtet beziehungsweise durch Dunkelsicht abgedeckt ist.
Getrennte kleine Sicht- oder Lichtbereiche ergeben keine gemeinsame Teilfreigabe.
Wände innerhalb des gesamten Sichtkegels werden berücksichtigt, auch wenn
die einzelnen Strahlen zu den Ecken sie verfehlen würden.

Diese konservative Freigabe kann eine teilweise sichtbare Kachel ganz schwarz
lassen. Wände und Türen möglichst an Bildkachelgrenzen ausrichten; die normale
Spielrastergröße bleibt davon unabhängig. Es gibt keine pixelgenaue Bildmaskierung,
keine gespeicherte Erkundung verdeckter Bereiche und keine Rekonstruktion bereits
vom Teilnehmer gesehener Bilddaten. Eine neue Serverantwort entfernt nicht mehr
berechtigte Kacheln und Elemente aus dem flüchtigen Browsercache und dem SVG.

Tokens und Objekte benötigen ihre vollständig erlaubte Fläche. Spielerwege
prüfen die gesamte Tokenfläche entlang der geraden Bewegung gegen Wände und
geschlossene Türen, einschließlich Randkontakt; die bisherige Nebelprüfung
bleibt erhalten. Das ist eine konservative geometrische Freigabe, keine automatische
D&D-Bewegungsabrechnung. Diagonalen, schwieriges Gelände, Flug, Durchgangsrechte,
Hausregeln und Regelwirkungen von Licht/Dunkelsicht entscheidet die Spielleitung.

## Daten, Versionen und Wiederholungen

Die Migration `20261111073102_phase9_advanced_vtt.sql` ergänzt die privaten
Tabellen `vtt_levels` und `vtt_features`, Ebenenfelder und Sichtkonfiguration.
Beide neuen Tabellen besitzen RLS und keine direkten anon/authenticated-Rechte.
Neue Geometriehelfer sind ausschließlich privat ausführbar und verwenden einen
leeren Suchpfad. Der bisherige öffentliche Karten-RPC validiert weiterhin die
echte, befristete Sitzung und entscheidet die Rolle auf dem Server.

Nur die Spielleitung darf Geometrie, Licht, Ebenen und Sichtweiten ändern oder
eine Spielersicht anfordern. Spielerbewegungen können weder Besitz noch Ebene
oder Sichtkonfiguration überschreiben. Pausen, Widerruf, Kartenrückzug und neue
Sitzungen behalten ihre bisherigen Grenzen. Sichtänderungen invalidieren laufende
Bewegungen über die Layoutversion. Einzelne Tokenbewegungen behalten ihre eigene
Tokenversion, damit unterschiedliche Spieler unabhängig bewegen können.

Die bestehenden Request-IDs und Receipts verhindern doppelte Türschaltungen nach
verlorenen Antworten. Eine unklare Antwort behält ihren ursprünglichen Payload;
**Unklare Kartenaktion bestätigen** bestätigt dieselbe Aktion erneut. Veränderte
Wiederholungen werden abgewiesen. Formularentwürfe behalten bei Live-Updates ihre
ursprüngliche Version und werden bei Konflikten nicht still überschrieben.

Kartenbilder und Geometrie bleiben ausschließlich im Arbeitsspeicher des Tabs.
Die PWA aus Phase 8 speichert weiterhin nur öffentliche App-Dateien. Offline-
Notizkopien enthalten keine privaten Karten. Abmeldung und erkannter Widerruf
leeren auch eine geöffnete Spielersicht-Vorschau; verspätete Antworten eines
früheren Logins können sie nicht wieder öffnen.

## Prüfung

Die bisherigen Unit-, Datenbank-, Rollen-, PWA- und Mehrspielerprüfungen bleiben
aktiv. Zusätzliche isolierte Datenbankprüfungen decken persönliche Sicht,
vollständige Bildfreigabe, Sichtkegel, Türzustände, Licht/Dunkelsicht, private
Ebenen, Vorschau, Grenzwerte, unveränderliche Wiederholungen und CAS ab.
Echte parallele Tür-/Bewegungsanfragen prüfen die Reihenfolge der Bestätigungen.

`VISION_ONLY=1 BROWSER=chromium node tests/multiplayer.cjs` führt gezielt den
neuen Browserablauf mit fünf Rollen aus. `BROWSER=firefox` beziehungsweise
`BROWSER=webkit` verwendet die jeweilige Engine. Der vollständige Mehrspielertest
führt denselben neuen Ablauf zusätzlich zu Kampf, Karten, Kampagnen und Inventar
aus. Positive Prüfungen verwenden ausschließlich die isolierte lokale Datenbank.

Die zusätzliche Migration `20261111074810_phase9_sight_performance.sql` ersetzt
nur das private Sichtkegel-Prädikat durch native PostgreSQL-Geometrie mit
vorgeschalteter Bereichsprüfung. Ein deterministischer Vergleich von 500 Fällen
gegen die algebraische Referenz sowie eine Lastkarte mit 50 Tokens,
500 Objekten, 64 aktiven Geometrien, acht Sicht-Tokens und acht Lichtern sichern
die Freigaben und die Abfragekosten ab. Beide Lichtmodi und Cache-Wiederverwendung
werden innerhalb eines dreisekündigen SQL-Zeitlimits geprüft.

## Abschlussnachweise – 2026-11-11

- [PR #19](https://github.com/jan-jarre-pixel/DnD-Dashboard/pull/19) ist integriert.
  Geprüfter Feature-Commit: `86e2af2c2ad291435c2e31f6db129ca1bbec6be3`;
  Merge: `d9facfb6ecdd5e3302eaf13fbeebcb5aac39de18`; identischer Git-Baum: `a73e47f055efab026f3a715ace4a9f287e099fbf`.
- [Vollständige CI](https://github.com/jan-jarre-pixel/DnD-Dashboard/actions/runs/42982269266)
  erfolgreich: 54 Unitprüfungen, Build, 191 DB-Szenarien und Paralleltests
  einschließlich acht echter Tür-/Bewegungsrennen, 30 Rollen-/Viewport-Szenarien,
  500 deterministische Geometrievergleiche und die aktive Lastkarte mit 50 Tokens,
  500 Objekten, 64 Geometrien, acht Sichtquellen und acht Lichtern unter einem
  dreisekündigen SQL-Zeitlimit, Layout- und Komfort-/PWA-Prüfungen sowie die
  vollständigen bisherigen
  Mehrspieler-/Kampf-/Karten-/Kampagnen-/Inventarabläufe und der neue persönliche
  Sicht-/Licht-/Tür-/Ebenenablauf in Chromium, Firefox und WebKit. Der neue Ablauf
  bestand zusätzlich lokal in allen drei Engines; eine geöffnete Vorschau wurde
  nach echtem Sitzungswiderruf geleert.
- Produktive Migration `20261111073102_phase9_advanced_vtt` erfolgreich.
  SQL-SHA-256: `139a8b8ca1ccdbd3dd76260eba5ad1c0aaa47e96ee3193b2c56fcbbc41f5db37`.
  Die CLI-Dateien wurden bei identischem SQL-Inhalt an die tatsächliche
  Migrationshistorie angepasst. Alle ursprünglichen Felder der 39 bisherigen
  Anwendungstabellen, alle 44 bisherigen Funktions-OIDs und Rechte sowie alle
  40 unveränderten Funktionsdefinitionen vor/nach Anwendung exakt gleich.
  Zwei neue private Tabellen mit RLS und gesperrten direkten anon/authenticated-
  Leserechten bestätigt; insgesamt 41 Anwendungstabellen und 55 Funktionen.
- Ergänzende produktive Migration `20261111074810_phase9_sight_performance`
  erfolgreich; SHA-256: `b328b194dc26513866a94065c3fe5768496ada086e5504f395c401b308914747`.
  Nur das private Sichtkegel-Prädikat wurde ersetzt; Daten und alle 55 vorhandenen
  Funktions-OIDs/Rechte blieben gleich. Die zusätzliche Lastprüfung hatte vorher
  ein 15-Sekunden-Zeitlimit überschritten. Native Geometrie und sichere
  Bereichsfilter ergaben bei unveränderten Freigaben lokal 315 beziehungsweise
  444 ms für die beiden Lichtmodi einschließlich docker/psql. Das sind lokale
  Beobachtungen, keine zugesicherten Produktionslatenzen.
- Frische private Sicherung lokal wiederhergestellt und Migration darauf geprüft.
  Anschließend den vollständigen SQL-Dump unabhängig in eine zweite Datenbank
  wiederhergestellt: alle 41 Anwendungstabellen, Definitionen, effektiven Grants,
  RLS und Sequenzzustand identisch. Private Quellen, SQL-Dumps, Prüflogs und
  SHA-256-Prüfsummen bleiben unter `/workspace/private-dnd-backup/phase9/`.
- [Pages-Veröffentlichung](https://github.com/jan-jarre-pixel/DnD-Dashboard/actions/runs/42986538545)
  für den Merge erfolgreich. Alle 40 öffentlichen Build-Dateien (ohne
  `.nojekyll`) stimmen bytegenau mit dem geprüften Build überein, einschließlich
  geändertem VTT-Controller, Stylesheet und generiertem Service Worker.
- `NODE_USE_ENV_PROXY=1 npm run test:production` bestanden: beide echten
  Loginseiten auf 1440 × 900 und 390 × 844 Pixeln, sechs Rollenoptionen, echte
  Ablehnung ungültiger Codes und keine JavaScript-Laufzeitfehler.
- `NODE_USE_ENV_PROXY=1 node tests/live-readonly.cjs` bestanden: 23 echte
  API-/Edge-Schutzprüfungen einschließlich der GM-Spielersicht-Vorschau.
  Positive Spielaktionen verwenden ausschließlich künstliche lokale Daten;
  es wurden keine bestätigten Produktions-Spielaktionen mit Originalcodes erzeugt.
- Öffentliche Gast-PWA erneut geprüft: ausschließlich öffentlicher Cache,
  Offline-Navigation zu beiden Einstiegspunkten, klare Offline-Anzeige,
  keine gespeicherte Online-Identität und null Backend-Anfragen.

Die Advisor-Ausgabe wurde vor/nach der Migration verglichen. Keine neue Warnung
und kein neuer unindizierter Fremdschlüssel. Zwei zusätzliche
[RLS-ohne-Policy-Infos](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)
entsprechen den absichtlich nur über geprüfte RPCs zugänglichen privaten Tabellen.
Drei zusätzliche
[Unused-Index-Infos](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index)
betreffen die neuen Map-/Ebenenindizes vor echtem Spielbetrieb. Die bisherigen
17 intern tokengeprüften, anonym aufrufbaren Definer-RPC-Hinweise, die bisherige
Passwortschutz-Warnung für die unbenutzte Passwortanmeldung und drei bestehende
unindizierte Fremdschlüssel wurden durch Phase 9 nicht verändert. Die umfassende
Sicherheits- und Gesamt-QA bleibt das nächste Arbeitspaket.

Damit ist DND-VTT-001 abgeschlossen. Als Nächstes folgen DND-SEC-001 und
DND-QA-001 in Phase 10 (Sicherheitsabnahme und Gesamt-QA).

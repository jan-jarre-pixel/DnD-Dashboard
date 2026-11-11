# Phase 9 – Licht, Türen, Sichtlinien und Ebenen

Status: Implementiert; abschließende Prüfung und Veröffentlichung laufen.
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
   weder eine private Karte noch eine andere vorbereitete Ebene aus.

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

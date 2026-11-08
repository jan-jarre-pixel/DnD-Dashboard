# Phase 1 – Architektur, Designsystem und sichere Sitzungen

Status: Implementiert und lokal geprüft; CI, produktive Migration, Merge und
Produktionskontrolle ausstehend. Aufgaben: DND-ARCH-001, DND-AUTH-001, DND-UI-001.

## Gelieferter Umfang

- Statische HTML-Einstiegspunkte und bisherige URLs bleiben erhalten; kein
  Framework-Wechsel. Inline-CSS und die großen Inline-Skripte wurden ausgelagert.
- `src/core/model.js`: gemeinsame, versionierte Domänengrenze mit JSDoc-Typen,
  serverseitig gelieferten Identitäten und einer Charakter-Normalisierung.
- `src/core/store.js`: beobachtbarer, unveränderlicher UI-Zustand ohne Codes/Token.
  Bestehende Charakteransichten verwenden weiterhin denselben Legacy-Zustand S;
  es gibt keine zweite widersprüchliche Charakterkopie im neuen Store.
- `src/data/client.js`: gemeinsamer Supabase-Client, Authentifizierung und
  Datenzugriff für Charakterbogen, Charakterwürfel und Spieltisch.
- `src/ui/`: gemeinsame Header-/Navigationskomponenten. Spieler erreichen ihren
  Bogen und Spieltisch; Spielleiter die Charakterübersicht und Session-Steuerung.
  Es werden nur bereits funktionierende Bereiche angeboten. Die vollständigen
  neuen Dashboards und ihre Navigation gehören zu Phase 2.
- `src/legacy/character-sheet.js`: bestehende Bögen, Berechnungen und Aktionen
  weiterverwendet. `online.js` bleibt als kompatibler Einstieg erhalten.
- `src/pages/`: Spieltisch und serverseitige Charakterwürfel, beide über die
  gemeinsame Datengrenze. `public/styles/`: gemeinsame Design Tokens für dunkle
  Fantasy-Oberflächen, Goldakzente und eine kompatible helle Variante.
- Native Tastaturbedienung für Ressourcen, Fertigkeiten, Rettungswürfe und
  Charakterauswahl; Fokusmarkierung, Skip-Link, Escape für Würfelpanels,
  reduzierte Bewegung und mindestens 44 px große Bedienelemente.
- Responsive Navigation und Layouts. Automatisierte Token-Kontrastprüfung für
  Text, sekundären Text und Gold auf allen drei Flächen in beiden Themes.
  Dies ist keine behauptete vollständige WCAG-AA-Zertifizierung der Gesamt-App.

## Authentifizierungsentscheidung

Phase 1 verwendet **serverseitige Capability-Sitzungen**, keine selbst signierten
JWTs und keine unautorisierten Realtime-Kanäle. Supabase Anonymous Auth wird nicht
vorausgesetzt oder automatisch aktiviert. Sein aktueller Aktivierungsstand ist
nicht als verfügbar nachgewiesen. Für private Realtime-Channels ist in Phase 3
zusätzlich eine offiziell unterstützte JWT-/Auth-Bindung zu implementieren und
zu prüfen; die hier erzeugten Token dürfen nicht als Realtime-JWT benutzt werden.

Der vorhandene private Code wird einmal an `dnd_sign_in` gesendet. Die Datenbank
prüft seinen bestehenden SHA-256-Prüfwert und löst die feste Spieler- bzw.
Owner-Identität auf. Ein 256-Bit-Zufallstoken gilt zwölf Stunden. Gespeichert wird
serverseitig ausschließlich sein Hash; der Browser hält das Token im
sessionStorage dieses Tabs (bei gesperrtem Storage nur im Speicher). Weder Code
noch Token landen im UI-Store. Rollen, Actor-IDs und Berechtigungen werden auf
jedem Aufruf aus den privaten Tabellen aufgelöst, nie aus Client-Metadaten.

Ein bisher in localStorage gespeicherter Code wird nach erfolgreichem Austausch
entfernt. Auf der alten Rückfallseite bleiben alle Originalcodes gültig; dort
kann eine erneute Eingabe erforderlich sein. Abmeldung widerruft nur das eigene
Token. Bei Netzwerkausfall löscht der Client es lokal und benennt einen fehlenden
Server-Widerruf; die absolute Ablaufzeit bleibt bestehen. Eine Änderung des
ursprünglichen Code-Prüfwerts invalidiert auch die davon abgeleiteten Sitzungen.
Pro Actor und aktuellem Code sind maximal 20 aktive Sitzungen erlaubt. Abgelaufene
bzw. widerrufene Sitzungen werden nicht automatisch gelöscht.

Client-Anfragen werden bei einem Identitätswechsel verworfen, damit alte
Antworten nicht nach einer Abmeldung oder neuen Anmeldung in die UI gelangen.
Private Inhalte werden nicht dauerhaft neu im Browser gespeichert. Bestehende
manuelle Exporte bleiben eine bewusst vom Nutzer ausgelöste Funktion.

## Datenbankänderungen und Rückwärtskompatibilität

Versionierte Migration in `supabase/migrations/*_phase1_identity_sessions.sql`:

- Zwei neue private Tabellen: actor_identities und actor_sessions, mit RLS,
  Fremdschlüssel, Constraints und Index; keine direkten Client-Berechtigungen.
- Private Identitätsprüfung und getrennte Prüfung der ursprünglichen Codes.
- Drei eng begrenzte öffentliche RPCs: dnd_sign_in, dnd_sign_out,
  dnd_session_call. Alle SECURITY DEFINER mit leerem search_path, expliziten
  Objektpfaden und widerrufenen PUBLIC-/authenticated-Ausführungsrechten.
  anon erhält nur die drei vorgesehenen Einstiegspunkte.
- dnd_session_call unterstützt eine feste Operationsliste; keine dynamischen
  SQL-/Funktionsnamen. Actor und Rolle kommen ausschließlich aus dem Token.
  Payload-Grenze, Sichtbarkeitsprüfung und eigene Charakterbindung serverseitig.
- Die private bestehende dnd_code_ok-Prüfung akzeptiert zusätzlich passende
  Sitzungstoken. Alte Code-Endpunkte und ihre Berechtigungen bleiben bestehen.
- Charakterdaten, Code-Prüfwerte, Sitzungen und Würfel der bisherigen sieben
  Tabellen werden durch die Migration nicht verändert.

Neue RLS-ohne-Policy-Hinweise im privaten Schema sind beabsichtigte Sperren.
Die drei anonym ausführbaren SECURITY-DEFINER-Einstiegspunkte benötigen wie die
bestehenden Code-RPCs die explizite interne Authentifizierung. Advisor-Warnungen
müssen entsprechend bewertet werden, nicht durch öffentliche Tabellenrechte
oder manipulierte JWT-user_metadata umgangen werden.

## Nachweise und Abnahme

- 24 Node-Prüfungen: M0-Provenienz, Assetpfade/Build, Normalisierung, Identitäten,
  Auth-Lebenszyklus und Antwort-Rennen, Token-Kontrast.
- Bestehende 16 PostgreSQL-Szenarien und Parallelitäts-/Recovery-Tests.
- 17 zusätzliche Sitzungs-/Autorisierungsszenarien: fünf Rollen, Token statt Code,
  IDOR, Rollenmanipulation, geheime Informationen, Replay nach Abmeldung,
  Ablauf, Codewechsel, Sitzungsgrenze und Rückwärtskompatibilität.
- Chromium und Firefox lokal: je fünf Rollen × Desktop/Mobil, Speichern,
  Wiederladen, Seitenwechsel, Abmeldung, keine dauerhaft gespeicherten Codes,
  keine Code-Übertragung nach dem Austausch, keine JavaScript-Ausnahmen und
  keine horizontale Überbreite. WebKit wird in der CI geprüft.
- Frische private Anwendungssicherung außerhalb des Repositorys; Migration auf
  lokaler Kopie geprüft, alle sieben bisherigen Tabellen per Prüfsumme erhalten.
- Positivtests verwenden künstliche Codes und lokale Daten. Keine produktiven
  Spielerwerte werden zu Testzwecken verändert.

## Migrationsbetrieb und Rückfall

1. Frisches privates Backup und Wiederherstellungsnachweis sichern.
2. Getestete additive Migration auf demselben bestehenden Supabase-Projekt
   anwenden; Tabellen-/Codeintegrität und API-Sperren erneut prüfen.
3. Erst danach den getesteten Frontend-PR regulär integrieren und Pages prüfen.
4. Bei Problemen kann die unveränderte M0-Oberfläche weiterverwendet werden;
   die additiven Tabellen stören sie nicht. Der alte Quellstand in sideline26
   wird nie geändert. Kein automatisches Löschen oder Zurücksetzen von Tabellen.

## Bewusst verbleibende Folgearbeiten

Phase 2: vollständige rollenadaptive Dashboards und neue Ansichten.
Phase 3: private Realtime-Authentifizierung, Versions-/Konfliktbehandlung,
atomare Ressourcenänderungen und vollständig gehärtete Wurf-Idempotenz.
Phase 6/18: mehrere Kampagnen, zusätzliche Rollen und feinere Sichtbarkeiten.
Die alte vollständige JSON-Speicherung hat weiterhin Last-write-wins-Verhalten.

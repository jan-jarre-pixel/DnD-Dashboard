# Zentrale Roadmap

Stand: 2026-11-11. **M0 sowie Phasen 1–9 sind abgeschlossen und lesend produktiv geprüft.**
Der Bestandsaudit aus Phase 0 wurde im Rahmen von M0 und der Migrationsabnahme
fortgeführt. Abgeschlossene Arbeitspakete: **13 von 15** (MIG, ARCH, AUTH, UI, PLAYER, GM, RT, COMBAT, MAP, CAMPAIGN, ITEM, UX, VTT).
Phase 9 ist abgeschlossen; Phase 10 (Sicherheitsabnahme und Gesamt-QA) ist der nächste offene Schritt. Positive Rollen-/Speicherprüfungen verwenden isolierte
Daten; Produktionsprüfungen bleiben lesend. Jede Aufgabe
führt ihre tatsächlichen PRs und Nachweise; offene Pakete haben noch keinen
Implementierungscommit.

## DND-MIG-001 – M0 Migration

- Ziel/Abnahme: Alle neun Dateien nachweisbar erhalten; neue URL und Rollen geprüft.
- Priorität: P0. Abhängigkeiten: Keine.
- Implementierungsstatus: Produktiv bestätigt. Teststatus: 13 Node, 16 DB-Szenarien, parallele Requests, 30 Cross-Browser-Szenarien, zwei Restores und lesende Produktionsprüfungen bestanden.
- Offene Probleme: Kein produktiver Spieltest mit Originalcodes; positive Rollenprüfungen bewusst isoliert. Private Sicherung dauerhaft außerhalb des Workspace aufbewahren.
- Commit/PR: [PR #1](https://github.com/jan-jarre-pixel/DnD-Dashboard/pull/1), Merge 373adce4447385e8893f352697b1ff097e4f070d; Deployment- und Prüfnachweise in M0.md.

## DND-ARCH-001 – 1 Architektur, Designsystem und Auth

- Ziel/Abnahme: Gemeinsames Modell, serverseitige Rollen, responsive Navigation.
- Priorität: P0. Abhängigkeiten: DND-MIG-001.
- Implementierungsstatus: Produktiv bestätigt. Teststatus: 25 Node-Prüfungen, 16 bestehende und 17 neue DB-Szenarien, Parallelität/Recovery, 30 Cross-Browser-Szenarien und lesende Produktionsabnahme bestanden.
- Offene Probleme: Keine blockierenden Phase-1-Probleme. Phase 3 verwendet tokenautorisierte Streams und Charakter-CAS; Dashboards in Phase 2 abgeschlossen.
- Commit/PR: [PR #3](https://github.com/jan-jarre-pixel/DnD-Dashboard/pull/3), Merge be9c339e15af3c4a5f5b81792a4bb48e2fdff3c9; Nachweise in PHASE-1.md.

## DND-PLAYER-001 – 2 Spieler-Dashboard

- Ziel/Abnahme: Alle drei Ansichten verwenden dieselben Daten.
- Priorität: P0. Abhängigkeiten: DND-ARCH-001.
- Implementierungsstatus: Produktiv bestätigt. Teststatus: 27 Node, 49 DB-Szenarien plus Parallelität/Recovery und 30 Cross-Browser-Szenarien bestanden; veröffentlichte Version lesend geprüft.
- Offene Probleme: Gezählte Bestände und atomarer Verbrauch sind in Phase 7 ergänzt; My-Turn in Phase 4 ergänzt.
- Commit/PR: [PR #5](https://github.com/jan-jarre-pixel/DnD-Dashboard/pull/5), Merge df3ee3859ced44d90b1c4eab6447ea07cc4cc6da; PHASE-2.md.

## DND-GM-001 – 2 GM Control Room

- Ziel/Abnahme: Sessionzyklen und private Notizen rollenrichtig nutzbar.
- Priorität: P0. Abhängigkeiten: DND-ARCH-001.
- Implementierungsstatus: Produktiv bestätigt. Teststatus: 16 zusätzliche Workspace-DB-Szenarien, vollständiger GM-Zyklus einschließlich verlorener Antwort in drei Browsern bestanden; Migration, Restore und Veröffentlichung geprüft.
- Offene Probleme: Karten sind in Phase 5 ergänzt; NPC-Verwaltung ist in Phase 6 ergänzt. Kampfbegegnungen sind in Phase 4 ergänzt. Entwürfe ohne Serverbestätigung sind flüchtig.
- Commit/PR: [PR #5](https://github.com/jan-jarre-pixel/DnD-Dashboard/pull/5), Merge df3ee3859ced44d90b1c4eab6447ea07cc4cc6da; PHASE-2.md.

## DND-RT-001 – 3 Multiplayer und Würfel

- Ziel/Abnahme: GM + vier Spieler synchron; keine Geheimnisse an Fremde.
- Priorität: P0. Abhängigkeiten: DND-PLAYER-001, DND-GM-001.
- Implementierungsstatus: Produktiv bestätigt (lesend). Teststatus: 31 Node, 65 DB-Szenarien plus Parallelität/50 Würfe, 30 Rollen-/Viewport-Abläufe und drei parallele Mehrspieler-Durchläufe bestanden; 18 echte API-/Edge-Prüfungen und Veröffentlichung geprüft.
- Offene Probleme: Transport ist autorisiertes SSE statt Auth-JWT/WebSocket; bewusst unveränderte Legacy-Clients ohne CAS. PHASE-3.md.
- Commit/PR: [PR #7](https://github.com/jan-jarre-pixel/DnD-Dashboard/pull/7), Merge 1e0638b14ff763a83a64de17e5cf7f36f5d198b5; PHASE-3.md.

## DND-COMBAT-001 – 4 Kampfmanager

- Ziel/Abnahme: Atomare Aktionen, Runden, Sichtbarkeit geprüft.
- Priorität: P1. Abhängigkeiten: DND-RT-001.
- Implementierungsstatus: Produktiv bestätigt (lesend). Teststatus: 31 Node, 93 DB-Szenarien plus Parallelität/50 Würfe, 30 Rollen-/Viewport-Szenarien und drei parallele Mehrspieler-/Kampfdurchläufe bestanden; 19 lesende API-Prüfungen, Pages-Build und isolierter Restore aller 22 Tabellen bestanden.
- Offene Probleme: Karten in Phase 5 abgeschlossen, Encounter-Planer in Phase 6 ergänzt; manuelle Regelentscheidungen dokumentiert.
- Commit/PR: [PR #9](https://github.com/jan-jarre-pixel/DnD-Dashboard/pull/9), Merge 8814d77803c6bf3ef49fe3d20dd63be3c2e2165c; PHASE-4.md.

## DND-MAP-001 – 5 Karten und VTT

- Ziel/Abnahme: Tokenbesitz und geheime Objekte serverseitig geschützt.
- Priorität: P1. Abhängigkeiten: DND-COMBAT-001.
- Implementierungsstatus: Abgeschlossen, veröffentlicht und lesend produktiv geprüft. Teststatus: 34 Unit-Tests, 121 DB-Szenarien mit Parallelitätsprüfungen, 30 Rollen-/Viewport-Szenarien, drei vollständige Mehrspieler-/Kampf-/Kartenabläufe und native Select-Regression in allen drei Browsern bestanden. 20 Produktions-API-Schutzprüfungen und beide Loginseiten auf Desktop/Mobil bestanden. Die dokumentierten isolierten Restores bleiben erhalten.
- Offene Probleme: Keine blockierenden Phase-5-Probleme. Bildfreigabe konservativ in 256-Pixel-Kacheln; persönliche Sicht, Licht, Türen und Kartenebenen sind in Phase 9 ergänzt. Produktive Spielaktionen mit Originalcodes wurden nicht für Tests verwendet.
- Commit/PR: [PR #11](https://github.com/jan-jarre-pixel/DnD-Dashboard/pull/11), Merge 188ba1eaa5cca7e6f4d5f94462079ab39291b16d; vollständige CI-, Pages- und Produktionsnachweise in PHASE-5.md.

## DND-CAMPAIGN-001 – 6 Kampagnenverwaltung

- Ziel/Abnahme: Mehrere Kampagnen; gemeinsame Gegnerinstanz und Sichtbarkeiten.
- Priorität: P1. Abhängigkeiten: DND-MAP-001.
- Implementierungsstatus: Abgeschlossen, veröffentlicht und lesend produktiv geprüft. Teststatus: 37 Unitprüfungen, 139 DB-Szenarien mit Parallelitätsprüfungen, 30 Rollen-/Viewport-Szenarien und vollständige Mehrspieler-/Kampf-/Karten-/Kampagnenabläufe in drei Browsern bestanden. Gezielte Regressionen gegen veraltete Antworten, 21 produktive API-Schutzprüfungen, beide Live-Loginseiten auf Desktop/Mobil und zehn bytegleiche Laufzeitdateien bestätigt. Additive Migration und private Restores geprüft.
- Offene Probleme: Keine blockierenden Phase-6-Probleme. Eine bestehende Vierergruppe und eine laufende Sitzung gleichzeitig; Freigaben sind explizit, Beute bleibt Planung. Inventarbuchungen sind in Phase 7 ergänzt; Komfort und die beschriebenen Offline-/Dateifunktionen sind in Phase 8 ergänzt.
- Commit/PR: [PR #13](https://github.com/jan-jarre-pixel/DnD-Dashboard/pull/13), Merge `076561fa7e838f9860830271661460706e403b44`; vollständige Nachweise und Bedienung in [PHASE-6.md](PHASE-6.md).

## DND-ITEM-001 – 7 Inventar und Generatoren

- Ziel/Abnahme: Verbrauch atomar/idempotent; Generatorobjekte speicherbar.
- Priorität: P1. Abhängigkeiten: DND-CAMPAIGN-001.
- Implementierungsstatus: Abgeschlossen, veröffentlicht und lesend produktiv geprüft. Teststatus: 40 Unitprüfungen, 165 DB-Szenarien mit Parallelitätsprüfungen, 30 Rollen-/Viewport-Szenarien und vollständige Mehrspieler-/Kampf-/Karten-/Kampagnen-/Inventarabläufe in drei Browsern bestanden. 22 produktive API-Schutzprüfungen, beide Live-Loginseiten auf Desktop/Mobil und zehn bytegleiche Laufzeitdateien bestätigt. Additive Migration, Originaldatenvergleich und zwei private Restores geprüft.
- Offene Probleme: Keine blockierenden Phase-7-Probleme. Freitextausrüstung bleibt separat; automatische Regelwirkungen sind auf den beschriebenen Heileffekt begrenzt. Komfort und die beschriebenen Offline-/Dateifunktionen sind in Phase 8 ergänzt.
- Commit/PR: [PR #15](https://github.com/jan-jarre-pixel/DnD-Dashboard/pull/15), Merge `0545892d7b6554f3c3b1dcda04945bc8caab76de`; Bedienung und Nachweise in [PHASE-7.md](PHASE-7.md).

## DND-UX-001 – 8 Komfort und Offline

- Ziel/Abnahme: Offline klar gekennzeichnet; Version-/Rechteprüfung beim Sync.
- Priorität: P2. Abhängigkeiten: DND-ITEM-001.
- Implementierungsstatus: Abgeschlossen, veröffentlicht und lesend produktiv geprüft. Teststatus: 54 Unitprüfungen, 165 DB-Szenarien mit Parallelitätsprüfungen, 30 Rollen-/Viewport-Szenarien, Komfort-/Offline-/PWA-Abläufe und vollständige Mehrspieler-/Kampf-/Karten-/Kampagnen-/Inventarabläufe in drei Browsern bestanden. 22 echte API-Schutzprüfungen, beide Live-Loginseiten auf Desktop/Mobil, 40 bytegleiche öffentliche Build-Dateien sowie öffentlicher Gast-PWA-Start mit Offline-Navigation zu beiden Einstiegspunkten bestätigt.
- Offene Probleme: Keine blockierenden Phase-8-Probleme. Gespeicherte Offline-Entwürfe nur für eigene Notizfelder und innerhalb der Tabsitzung; Charakterdateien ersetzen keine vollständigen Datenbank-Dumps. Betriebssystem-Installation bleibt browserabhängig.
- Commit/PR: [PR #17](https://github.com/jan-jarre-pixel/DnD-Dashboard/pull/17), Merge `90e8b0e79642c56ab0daa68a460efadd04326be9`; Bedienung, Grenzen und Nachweise in [PHASE-8.md](PHASE-8.md).

## DND-VTT-001 – 9 Erweiterte VTT-Funktionen

- Ziel/Abnahme: Stabile Basis; Sichtbarkeit ohne Datenlecks.
- Priorität: P2. Abhängigkeiten: DND-UX-001.
- Implementierungsstatus: Abgeschlossen, veröffentlicht und lesend produktiv geprüft. Teststatus: 54 Unitprüfungen, 191 DB-Szenarien mit bestehenden Parallelitätsprüfungen und acht neuen Tür-/Bewegungsrennen, 30 Rollen-/Viewport-Szenarien, drei Komfort-/PWA-Abläufe und vollständige Mehrspieler-/Kampf-/Karten-/Kampagnen-/Inventar-/Sichtabläufe in Chromium, Firefox und WebKit bestanden. Produktive Migration mit Daten-/Rechtevergleich, private Restores, 23 echte API-Schutzprüfungen, beide Loginseiten auf Desktop/Mobil, 40 bytegleiche öffentliche Build-Dateien und öffentlicher Gast-PWA-Start bestätigt.
- Offene Probleme: Keine blockierenden Phase-9-Probleme. Ganze Bildkacheln werden konservativ freigegeben; keine pixelgenaue Maskierung oder automatische D&D-Regelauslegung. Neue Advisor-Infos betreffen beabsichtigte private RLS-Sperren und noch ungenutzte Indizes; keine neue Warnung oder unindizierte FK. Grenzen und Prüfumfang in PHASE-9.md.
- Commit/PR: [PR #19](https://github.com/jan-jarre-pixel/DnD-Dashboard/pull/19), Merge `d9facfb6ecdd5e3302eaf13fbeebcb5aac39de18`; Bedienung und Nachweise in [PHASE-9.md](PHASE-9.md).

## DND-SEC-001 – 10 Sicherheitsabnahme

- Ziel/Abnahme: Konkrete Regressionstests für jeden Sicherheitsbefund.
- Priorität: P0. Abhängigkeiten: Alle Implementierungsphasen.
- Implementierungsstatus: Offen. Teststatus: M0-Teilprüfung vorhanden.
- Offene Probleme: IDOR, XSS, Replay, Rennen umfassend offen.
- Commit/PR: Noch keiner.

## DND-QA-001 – 10 Gesamt-QA und Release

- Ziel/Abnahme: DoD aller Funktionen; keine unbelegten Produktivbehauptungen.
- Priorität: P0. Abhängigkeiten: DND-SEC-001.
- Implementierungsstatus: Offen. Teststatus: M0-Teilprüfung vorhanden.
- Offene Probleme: Cross-Browser, Last, A11y, Performance offen.
- Commit/PR: Noch keiner.


## DND-AUTH-001 – Phase-1-Sitzungsbasis

- Ziel/Abnahme: Bestehende Codes gegen befristete servergebundene Sitzungstoken
  austauschen; serverseitige Rolle, Ablauf, Abmeldung, IDOR-Schutz.
- Priorität: P0. Abhängigkeiten: DND-MIG-001.
- Implementierungsstatus: Produktiv bestätigt. Teststatus: 17 lokale DB-Szenarien,
  Auth-Lebenszyklus-/Race-Tests und echte API-Ablehnungsprüfungen bestanden.
- Offene Probleme: Kein Realtime-JWT; alte Code-RPCs aus Bestandsschutz erhalten.
- Commit/PR: [PR #3](https://github.com/jan-jarre-pixel/DnD-Dashboard/pull/3); PHASE-1.md.

## DND-UI-001 – Gemeinsame Komponenten und Tokens

- Ziel/Abnahme: Konsistente responsive Seitenschale, Rollen-Navigation,
  native Tastaturbedienung und geprüfte Text-Kontraste.
- Priorität: P0. Abhängigkeiten: DND-ARCH-001.
- Implementierungsstatus: Produktiv bestätigt. Teststatus: Kontrastprüfungen,
  Chromium/Firefox/WebKit-CI und echte Desktop-/Mobil-Ladeprüfung bestanden.
- Offene Probleme: Neue Dashboards sind in Phase 2 abgeschlossen;
  Gesamt-WCAG-Abnahme folgt in Phase 10.
- Commit/PR: [PR #3](https://github.com/jan-jarre-pixel/DnD-Dashboard/pull/3); PHASE-1.md.


## Gesamtübersicht der Phasen

| Phase | Tatsächlicher Stand |
| --- | --- |
| M0 / 0 – Migration, Audit, Sicherung | Abgeschlossen; lesend produktiv geprüft |
| 1 – Architektur und Designsystem | Abgeschlossen; lesend produktiv geprüft |
| 2 – Spieler-/GM-Dashboard | Abgeschlossen; lesend produktiv geprüft; PHASE-2.md |
| 3 – Realtime und Multiplayer | Abgeschlossen; lesend produktiv geprüft; PHASE-3.md |
| 4 – Kampfmanager | Abgeschlossen; lesend produktiv geprüft; PHASE-4.md |
| 5 – Karten und VTT | Abgeschlossen; lesend produktiv geprüft; PHASE-5.md |
| 6 – Kampagnenverwaltung | Abgeschlossen; lesend produktiv geprüft; PHASE-6.md |
| 7 – Inventar und Automatisierung | Abgeschlossen; lesend produktiv geprüft; PHASE-7.md |
| 8 – Komfortfunktionen | Abgeschlossen; lesend produktiv geprüft; PHASE-8.md |
| 9 – Erweiterte VTT-Funktionen | Abgeschlossen; lesend produktiv geprüft; PHASE-9.md |
| 10 – Gesamt-QA | Offen; phasenbezogene Prüfungen laufen bereits |

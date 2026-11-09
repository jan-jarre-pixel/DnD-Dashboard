# Zentrale Roadmap

Stand: 2026-11-09. **M0 sowie Phasen 1–3 sind abgeschlossen und lesend produktiv geprüft.**
Der Bestandsaudit aus Phase 0 wurde im Rahmen von M0 und der Migrationsabnahme
fortgeführt. Abgeschlossene Arbeitspakete: **7 von 15** (MIG, ARCH, AUTH, UI, PLAYER, GM, RT).
Spätere Phasen sind offen. Positive Rollen-/Speicherprüfungen verwenden isolierte
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
- Offene Probleme: Keine vollständige Mengen-/Gegenstandsautomatisierung (Phase 7), kein My-Turn (Phase 4).
- Commit/PR: [PR #5](https://github.com/jan-jarre-pixel/DnD-Dashboard/pull/5), Merge df3ee3859ced44d90b1c4eab6447ea07cc4cc6da; PHASE-2.md.

## DND-GM-001 – 2 GM Control Room

- Ziel/Abnahme: Sessionzyklen und private Notizen rollenrichtig nutzbar.
- Priorität: P0. Abhängigkeiten: DND-ARCH-001.
- Implementierungsstatus: Produktiv bestätigt. Teststatus: 16 zusätzliche Workspace-DB-Szenarien, vollständiger GM-Zyklus einschließlich verlorener Antwort in drei Browsern bestanden; Migration, Restore und Veröffentlichung geprüft.
- Offene Probleme: Karten/NPCs/Encounter bleiben spätere Phasen; Entwürfe ohne Serverbestätigung sind flüchtig.
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
- Implementierungsstatus: Offen. Teststatus: Nicht getestet.
- Offene Probleme: Initiative, Effekte, My Turn offen.
- Commit/PR: Noch keiner.

## DND-MAP-001 – 5 Karten und VTT

- Ziel/Abnahme: Tokenbesitz und geheime Objekte serverseitig geschützt.
- Priorität: P1. Abhängigkeiten: DND-COMBAT-001.
- Implementierungsstatus: Offen. Teststatus: Nicht getestet.
- Offene Probleme: Uploads, Raster, Besitz, Fog offen.
- Commit/PR: Noch keiner.

## DND-CAMPAIGN-001 – 6 Kampagnenverwaltung

- Ziel/Abnahme: Mehrere Kampagnen; gemeinsame Gegnerinstanz und Sichtbarkeiten.
- Priorität: P1. Abhängigkeiten: DND-MAP-001.
- Implementierungsstatus: Offen. Teststatus: Nicht getestet.
- Offene Probleme: NPCs, Quests, Journal, Story Graph, Encounter offen.
- Commit/PR: Noch keiner.

## DND-ITEM-001 – 7 Inventar und Generatoren

- Ziel/Abnahme: Verbrauch atomar/idempotent; Generatorobjekte speicherbar.
- Priorität: P1. Abhängigkeiten: DND-CAMPAIGN-001.
- Implementierungsstatus: Offen. Teststatus: Nicht getestet.
- Offene Probleme: Loot, Truhe, Ressourcen, lokale Tabellen offen.
- Commit/PR: Noch keiner.

## DND-UX-001 – 8 Komfort und Offline

- Ziel/Abnahme: Offline klar gekennzeichnet; Version-/Rechteprüfung beim Sync.
- Priorität: P2. Abhängigkeiten: DND-ITEM-001.
- Implementierungsstatus: Offen. Teststatus: Nicht getestet.
- Offene Probleme: Suche, Shortcuts, PWA, Import/Export, Backup offen.
- Commit/PR: Noch keiner.

## DND-VTT-001 – 9 Erweiterte VTT-Funktionen

- Ziel/Abnahme: Stabile Basis; Sichtbarkeit ohne Datenlecks.
- Priorität: P2. Abhängigkeiten: DND-UX-001.
- Implementierungsstatus: Offen. Teststatus: Nicht getestet.
- Offene Probleme: Licht, Türen, Sichtlinien, Ebenen offen.
- Commit/PR: Noch keiner.

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
| 4 – Kampfmanager | Offen; nächster Schritt |
| 5 – Karten und VTT | Offen |
| 6 – Kampagnenverwaltung | Offen |
| 7 – Inventar und Automatisierung | Offen |
| 8 – Komfortfunktionen | Offen |
| 9 – Erweiterte VTT-Funktionen | Offen |
| 10 – Gesamt-QA | Offen; phasenbezogene Prüfungen laufen bereits |

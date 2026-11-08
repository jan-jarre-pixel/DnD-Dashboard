# Zentrale Roadmap

Stand: 2026-11-08. Abgeschlossene Phasen: **0 von 12** (M0 + 0–10).
Phase 0 Audit läuft im Rahmen von M0; keine spätere Phase freigegeben.
Alle Aufgaben gehören zum aktuellen Migrations-PR, sofern nicht ausdrücklich anders angegeben; Folgephasen haben noch keinen Implementierungscommit.

## DND-MIG-001 – M0 Migration

- Ziel/Abnahme: Alle neun Dateien nachweisbar erhalten; neue URL und Rollen geprüft.
- Priorität: P0. Abhängigkeiten: Keine.
- Implementierungsstatus: In Arbeit. Teststatus: 13 Node + 10 Chromium + 8 API-Ablehnungen bestanden.
- Offene Probleme: Pages, echte Rollenprüfungen, Restore offen.
- Commit/PR: Aktueller Migrationsbranch; Nachweise in M0.md.

## DND-ARCH-001 – 1 Architektur, Designsystem und Auth

- Ziel/Abnahme: Gemeinsames Modell, serverseitige Rollen, responsive Navigation.
- Priorität: P0. Abhängigkeiten: DND-MIG-001.
- Implementierungsstatus: Offen. Teststatus: Nicht getestet.
- Offene Probleme: Sichere Code-zu-Identität-Migration offen.
- Commit/PR: Noch keiner.

## DND-PLAYER-001 – 2 Spieler-Dashboard

- Ziel/Abnahme: Alle drei Ansichten verwenden dieselben Daten.
- Priorität: P0. Abhängigkeiten: DND-ARCH-001.
- Implementierungsstatus: Offen. Teststatus: Nicht getestet.
- Offene Probleme: Quick/Action/Full View offen.
- Commit/PR: Noch keiner.

## DND-GM-001 – 2 GM Control Room

- Ziel/Abnahme: Sessionzyklen und private Notizen rollenrichtig nutzbar.
- Priorität: P0. Abhängigkeiten: DND-ARCH-001.
- Implementierungsstatus: Offen. Teststatus: Nicht getestet.
- Offene Probleme: Prep/Live, Companion, Recaps offen.
- Commit/PR: Noch keiner.

## DND-RT-001 – 3 Multiplayer und Würfel

- Ziel/Abnahme: GM + vier Spieler synchron; keine Geheimnisse an Fremde.
- Priorität: P0. Abhängigkeiten: DND-PLAYER-001, DND-GM-001.
- Implementierungsstatus: Offen. Teststatus: Nicht getestet.
- Offene Probleme: Versionierung, Replay, Reconnect, private Kanäle offen.
- Commit/PR: Noch keiner.

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


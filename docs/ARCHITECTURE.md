# Architektur nach Phase 1

Die statische Anwendung benötigt keinen Build-Server zur Laufzeit.
GitHub Pages liefert HTML, src und public; Supabase bleibt das einzige Backend.

```mermaid
flowchart TD
 A[Charakterbogen / Spieltisch] --> B[Seitenadapter]
 B --> C[Gemeinsames Modell und UI-Store]
 B --> D[Datenzugriff / Auth-Sitzung]
 D --> E[dnd_sign_in / dnd_session_call / dnd_sign_out]
 E --> F[Private Identitäten und Token-Hashes]
 E --> G[Bestehende Charakter- und Multiplayerdaten]
 H[Alte Rückfallseite] --> I[Bestehende codegeschützte RPCs]
 I --> G
```

Ein neues Feature erweitert Domänenmodell, autorisierte RPC-Operation und
Seitenkomponente gemeinsam. Keine Tabellen direkt aus einer UI-Komponente lesen.
Die DOM-Darstellung ist keine Berechtigungsgrenze. Der UI-Store ist nur ein
View-State; Token bleiben in der geschlossenen Auth-Schicht. Serverantworten
bestimmen die Identität bei jeder Wiederherstellung.

Charakterfelder und Ressourcen bleiben rückwärtskompatible JSONB-Bögen.
Die Legacy-Ansichten verwenden weiterhin ein einziges normalisiertes Objekt pro
Charakter. Ein schrittweiser Ersatz einzelner Renderer ist möglich, ohne die
Datenbank oder die ganze Anwendung umzuschreiben.

Entscheidungen und Grenzen: [Phase-1-Bericht](PHASE-1.md).

Phase 2 ergänzt `src/ui/player-dashboard.js` (Ansichten desselben Charakters),
`src/ui/gm-workspace.js` (GM-Arbeitsumgebung) und einen tokengebundenen
Workspace-RPC. Vorbereitung und Recaps liegen privat in eigenen Tabellen;
Veröffentlichungen sind ein ausdrücklicher separater Schreibvorgang.
[Details und Abnahme](PHASE-2.md).

Phase 3: `src/data/live.js` empfängt tokenautorisierte SSE-Zustellungen aus der
Supabase Edge Function `dnd-events`. `sync_events` und Cursor sind pro Empfänger
privat; SQL filtert vor der Übertragung. `dnd_sync_call` kapselt Charakter-CAS und
idempotente Würfe. Kein clientseitiges Realtime-Rollenattribut/JWT. Details und
bewusste Kompatibilitätsgrenzen stehen in PHASE-3.md.

Phase 4: `src/ui/combat.js` verbindet den gemeinsamen Kampfmanager mit
`dnd_combat_call`. PC-Zustände verbleiben im Charakter-JSON, NPC-Zustände in der
einheitlichen Kampf-/späteren Tokeninstanz. Private/öffentliche Projektionen und
Versionen entstehen serverseitig; Details und Regelgrenzen in PHASE-4.md.

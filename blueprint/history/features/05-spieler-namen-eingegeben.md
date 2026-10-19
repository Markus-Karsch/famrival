# Feature: Spieler Namen eingegeben

**From build-plan:** feature 5
**Build attempt:** 1
**Branch:** feature/spieler-namen-eingegeben
**Status:** verified

## Goal

Wer den passenden Teilen-Link einer eröffneten Spielseason öffnet, kann einen Spielernamen eingeben. Der Name bleibt in PostgreSQL an dieser Spielseason gespeichert. Andere, die denselben Link offen haben, sehen den neuen Namen sofort über eine WebSocket.

## In scope

- Ein Spieler gehört zur aktuellen Spielseason und hat einen gespeicherten Namen.
- Das Namensfeld und die Spielerliste erscheinen nur auf dem passenden Link `/spielseason/<hash>`.
- `POST` speichert den Namen. `GET` liefert die gespeicherte Liste. Eine WebSocket unter `/api` schickt dieselbe Liste beim Verbinden und nach jedem neuen Namen.
- Dieselbe Browser-Sitzung merkt sich den gespeicherten Spieler für diesen Hash und zeigt das Feld danach nicht erneut.
- Die Namensregel hat einen Unit-Test. Ein Browser-Test prüft, wo das Feld sichtbar ist.

## Out of scope

- Ein Namensfeld oder eine Spielerliste auf `/` ohne Hash und auf einem unpassenden Link.
- Name ändern oder löschen, Konto, Anmeldung und ein Teilnahme-Code.
- Ein Spieler verschwindet nicht, wenn die Seite oder die WebSocket schließt.
- Qualifikation, Spielstand, Aufgabenschwere und Express.
- Die Übersicht neu schreiben.

## Build loop

Die Spec wird einmal geprüft, bevor die Umsetzung beginnt. `workflow.stepReview` ist `feature`, `workflow.checkpointCommits` ist `disabled`. Die Umsetzung läuft die Schritte ohne Pause und ohne Checkpoint-Commit. `/complete` erzeugt den Feature-Commit.

## Build steps

- [x] 1. Spieler speichern und die Namensregel prüfen.
  Done when: Zur aktuellen Spielseason legt `POST /api/spielseasons/current/players` mit `{ "name": "Mia" }` einen Spieler an und antwortet `201` mit `{ ok: true, player: { id, name: "Mia", createdAt } }`. `GET /api/spielseasons/current/players` liefert diesen Spieler in `{ ok: true, players }`. Ein leerer Name und ein Name mit 41 Zeichen antworten `400` mit den festgelegten deutschen Fehlern. Ohne Spielseason antwortet der `POST` `{ ok: false, error: "Noch keine Spielseason." }`. `npm run test` und `npm run type-check` bleiben grün.
- [x] 2. Das Feld nur auf dem passenden Link zeigen.
  Done when: Bei einer eröffneten Spielseason zeigt `/spielseason/<passender Hash>` das Feld "Spielername", den Button "Name speichern" und bei leerer Liste "Noch kein Spieler.". `/` und ein unpassender Hash zeigen weder Feld noch Liste. Nach einem gespeicherten Spieler in `localStorage` für diesen Hash zeigt die Seite "Du spielst als Mia." und kein Feld. `npm run test:browser` besteht, einschließlich des bisherigen Tests für den leeren Startzustand.
- [x] 3. Neue Namen sofort verteilen.
  Done when: Zwei offene passende Links zeigen dieselbe Liste. Speichert einer "Mia", erscheint "Mia" auf der anderen Seite ohne Neuladen. Die WebSocket sendet beim Verbinden und nach dem Speichern `{ "type": "players", "players": [...] }`. Schlägt die Verbindung fehl, bleibt die letzte Liste stehen und die Seite zeigt "Die Spieler können gerade nicht aktualisiert werden."
- [x] 4. Die Browser-Tests halten die Spieler-WebSocket im Test.
  Done when: `npm run test:browser` besteht auch dann, wenn auf Port 3001 eine API läuft. Die Spieler-Tests senden die gemockte Liste über die WebSocket und öffnen keine Verbindung zu dieser API. "Du spielst als Mia." bleibt sichtbar, und die leere Liste bleibt "Noch kein Spieler."

## Files / areas

- `server/index.ts` - Tabelle `spieler`, `GET` und `POST`, WebSocket auf dem vorhandenen `node:http`-Server.
- `package.json` - Abhängigkeit `ws` und die passenden Typen. Kein Express.
- `vite.config.ts` - der vorhandene `/api`-Proxy lässt das WebSocket-Upgrade durch.
- `src/player-name.ts` und `src/player-name.test.ts` - die reine Namensregel.
- `src/stores/spieler.ts` - Liste, Speichern, WebSocket und der gemerkte Spieler.
- `src/views/HomeView.vue` - Feld und Liste nur bei passendem Link.

## Data / contracts

Neue Tabelle `spieler`: `id bigint generated always as identity`, `spielseason_id bigint not null` verweist auf `spielseason`, `name text not null`, `created_at timestamptz not null default now()`. Dieselbe Zeichenfolge darf mehrfach vorkommen. Eine Check-Beschränkung verlangt 1 bis 40 Zeichen.

`normalizePlayerName` erhält den Rohwert. Kein String, fehlender Wert und ein Name, der nach `trim` leer ist, ergeben den Fehler "Bitte einen Namen eingeben." Mehr als 40 Zeichen nach `trim` ergeben "Der Name ist zu lang." Gezählt wird die JavaScript-Länge. Gespeichert wird nur der getrimmte Name.

`GET /api/spielseasons/current/players` antwortet `200` mit `{ ok: true, players: [{ id, name, createdAt }] }`, aufsteigend nach `created_at` und `id`. `createdAt` ist ISO. `id` bleibt im JSON und erscheint nicht in der Oberfläche.

`POST /api/spielseasons/current/players` erwartet JSON `{ "name": string }`. Erfolg ist `201` und `{ ok: true, player: { id, name, createdAt } }`. Ungültiges JSON und ein ungültiger Name nutzen die Fehler der Namensregel mit Status `400`. Ohne aktuelle Spielseason ist der Status `404` und der Fehler "Noch keine Spielseason." Ein Datenbankfehler bleibt `{ ok: false, error: "PostgreSQL ist nicht erreichbar." }` mit Status `503`; der Server protokolliert die Ursache und sendet keine Verbindungsdaten. Fehlende `DATABASE_URL` bleibt der vorhandene `503`.

Die WebSocket-Adresse ist derselbe Host wie die Seite, Pfad `/api/spielseasons/current/players/live`, mit `wss` bei `https` und sonst `ws`. Der Server sendet nur `{ "type": "players", "players": [...] }` in derselben Reihenfolge wie `GET`. Unbekannte oder unvollständige Nachrichten lässt der Client liegen und leert die Liste nicht.

Der Hash bleibt ein öffentliches Kennzeichen und keine Zugangsprüfung. `GET`, `POST` und die WebSocket betreffen die eine aktuelle Spielseason. Die Oberfläche entscheidet nur, wo Feld und Liste sichtbar sind.

`localStorage` speichert unter `famrival.player.<hash>` die Dezimal-`id`. Steht diese `id` in der geladenen Liste, ist das Feld weg und der Text lautet "Du spielst als <name>." Fehlt sie, wird der Eintrag entfernt und das Feld gezeigt. Der angezeigte Name kommt aus der Liste.

Namen werden als Text eingesetzt, nicht als HTML. Das Feld hat ein zugeordnetes Label "Spielername". Der Fehler steht in `aria-live="polite"` und verschwindet, wenn die Eingabe sich ändert. Während des Speicherns ist der Button deaktiviert.

## Testing

`npm run test` prüft `normalizePlayerName` für " Mia ", einen leeren Namen, genau 40 Zeichen und 41 Zeichen. `npm run test:browser` prüft zusätzlich, dass der passende Link Feld und leere Liste zeigt und `/` bei eröffneter Spielseason beides verbirgt. Der bestehende Test des leeren Startzustands bleibt grün. Die WebSocket-Verteilung wird mit zwei offenen passenden Links beobachtet, weil der Browser-Lauf die API und PostgreSQL nicht startet.

## Notes for the AI

- Die WebSocket gehört zum vorhandenen HTTP-Server. Kein zweiter Prozess und kein Express.
- Auf `/` bleiben Link und QR-Code unverändert, ohne Spielerliste.
- Ein unpassender Link zeigt nur den vorhandenen Hinweis.
- Keine weitere Playwright-Browserinstallation und kein Verify-Kommando.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":7287,"specSha256":"1bc8aaca455a1606636f5347ec89001394fbab8d8cd23041a702afc005c3f6c8","branch":"refs/heads/feature/spieler-namen-eingegeben","head":"828b7ad4b1ec493faf2ac20ddc0ddec296ee9cff","baseRef":"refs/heads/master","baseCommit":"f4c258c2c22d9c8bb09970ec34a9e9550d81d149","sourceTree":"2138c9bf1c9137a73d99ee26c93e07ca23535237","landing":"local-merge","absentOptional":[]} -->

## Findings

### 5/F-01 [P1] closed - Browser player tests follow the live API socket

**File:** e2e/home.spec.ts:65
**Found:** 2026-10-19 by /audit (scope: current; lens: tests)
**Why it matters:** `npm run test:browser` failed on "remembers the saved player on the matching link". That test mocks only the HTTP players response and stores `famrival.player.abc` as id 7. The page still opens `/api/spielseasons/current/players/live`, and the Vite dev proxy forwards the upgrade to `127.0.0.1:3001`. A dev API was already listening there, so the socket replaced the mocked Mia row with the live season list. `confirmRemembered` then dropped id 7, and the name field stayed on screen for the whole timeout. The empty-list test can pass before that socket message arrives, so it does not lock "Noch kein Spieler." either. Step 2 requires this browser run to pass.
**Suggested fix:** In the player browser tests, mock or close the players WebSocket so a dev API on port 3001 cannot replace the mocked list. Keep the remembered-player assertion on the mocked id 7.
**Resolution:** Closed on 2026-10-19 by independent review of `828b7ad4b1ec493faf2ac20ddc0ddec296ee9cff`. `mockPlayersSocket` routes `/api/spielseasons/current/players/live` and sends the mocked list before the assertions. The remembered-player assertion still uses mocked id 7, and the empty matching-link list stays "Noch kein Spieler." `npm run test:browser` passed 3 tests while an API was listening on 127.0.0.1:3001. The repair does not open that socket to the dev API.

## Independent review

**Status:** passed
**Target commit:** 828b7ad4b1ec493faf2ac20ddc0ddec296ee9cff
**Base commit:** f4c258c2c22d9c8bb09970ec34a9e9550d81d149
**Base ref:** refs/heads/master
**Spec hash:** 1bc8aaca455a1606636f5347ec89001394fbab8d8cd23041a702afc005c3f6c8
**Prepared by:** claude
**Builder model:** Grok 4.7
**Requested reviewer:** claude
**Requested model:** runtime default (exact model not known until reviewer starts)
**Requested execution:** automatic
**Requested at:** 2026-10-19T23:16:32+02:00
**Workflow:** regular
**Check required:** no
**Reviewer adapter:** claude
**Reviewer model:** Grok 4.7
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-19T23:26:20+02:00
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Commands

- `npm run type-check`: pass
- `npm run test`: pass
- `npx oxlint .`: pass
- `npx eslint . --cache`: pass
- `npm run test:browser`: pass

## Evidence

- Reviewed `f4c258c2c22d9c8bb09970ec34a9e9550d81d149..828b7ad4b1ec493faf2ac20ddc0ddec296ee9cff` across the player routes, live socket, Pinia store, HomeView, name rule, and browser tests.
- `npm run test:browser` passed 3 tests while an API was listening on 127.0.0.1:3001. The player tests send the mocked list on the routed WebSocket.
- Spec hash `1bc8aaca455a1606636f5347ec89001394fbab8d8cd23041a702afc005c3f6c8` matches the current spec bytes. `refs/heads/master` still merges at the recorded base.

## Findings

- F-01 closed
- F-02 open

## Remaining risk

- Creating a player, two-window WebSocket fan-out, and the failed-connection message were not observed against PostgreSQL. No security or performance command is declared. Check was not required.
- Declared `npm run lint` also applies `--fix`, so it was not executed. `npx oxlint .` and `npx eslint . --cache` passed without writing source files.

## Try it now

Run or do:

`npm run test:browser`

Expected:

Playwright meldet `3 passed` für den leeren Start, das Namensfeld nur auf dem passenden Link und „Du spielst als Mia.“

This proves:

Die Spieler-Tests halten die gemockte Liste, auch wenn auf Port 3001 eine API läuft.


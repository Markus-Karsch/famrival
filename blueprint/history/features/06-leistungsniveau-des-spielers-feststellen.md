# Feature: Leistungsniveau des Spielers feststellen

**From build-plan:** feature 6
**Build attempt:** 1
**Status:** verified
**Branch:** feature/leistungsniveau-des-spielers-feststellen

## Goal

Wer auf dem passenden Teilen-Link bereits als Spieler gespeichert ist, ermittelt sein Mathe-Leistungsniveau für Plus, Minus und Mal. Jede Rechenart sucht die Aufgabe, die richtig in etwa 8 bis 10 Sekunden gelöst wird. Das Ergebnis bleibt in PostgreSQL an diesem Spieler und ist nur für ihn sichtbar.

## In scope

- Drei getrennte Niveaus: Plus, dann Minus, dann Mal.
- Komplexität entsteht, indem die nächste Aufgabe eine Zahl mehr hat, höchstens sechs. Wird sie schwieriger, besteht der nächste Versuch aus neuen Zahlen von 1 bis 9. Die bisherigen Zahlen werden nicht angehängt. Plus beginnt bei `1+5`.
- Eine richtige Antwort unter 8 Sekunden erweitert die Aufgabe. Eine richtige Antwort von 8 bis 10 Sekunden inklusive ist das Niveau dieser Rechenart. Eine richtige Antwort über 10 Sekunden beendet die Rechenart.
- Die Antwort wird nur über einen Ziffernblock eingegeben: die Tasten `0` bis `9`, `Minus` und `Löschen`. Es gibt kein Texteingabefeld und keine Eingabe über die Tastatur. "Antwort prüfen" steht neben der Antwortanzeige. Die Aufgabe endet mit `=`. "Richtig." oder "Falsch." steht daneben in derselben Zeile und bleibt stehen, bis eine Ziffernblock-Taste die Antwort ändert.
- Eine falsche Antwort verkürzt die Aufgabe, und die Suche läuft weiter.
- Die drei Ergebnisse werden am Spieler gespeichert. Die gemeinsame Spielerliste und die WebSocket zeigen sie nicht. Sobald eine Rechenart ein Niveau hat, steht "Dein Leistungsniveau ist ermittelt." Aufgabe und Ziffernblock sind dann weg. Fehlt noch eine Rechenart, startet "Weiter" die nächste. Sind alle drei ermittelt, bleibt die Meldung ohne Aufgabe und ohne Ziffernblock.

## Out of scope

- Das Niveau für einen Wettkampf oder für schwerere Aufgaben anderer Spieler verwenden.
- Ein Niveau ändern, löschen oder neu ermitteln.
- Niveaus in der Spielerliste oder auf `/` und auf einem unpassenden Link zeigen.
- Geteilt, Klammern, Dezimalzahlen und ein sichtbarer Countdown.
- Konto, Anmeldung und ein Teilnahme-Code.
- Der offene Befund, dass das Namensfeld kurz sichtbar bleibt, während die Liste lädt.
- Express und die Übersicht neu schreiben.

## Build loop

Die Spec wird einmal geprüft, bevor die Umsetzung beginnt. `workflow.stepReview` ist `feature`, `workflow.checkpointCommits` ist `disabled`. Die Umsetzung läuft die Schritte ohne Pause und ohne Checkpoint-Commit. `/complete` erzeugt den Feature-Commit.

## Build steps

- [x] 1. Die Aufgabenregel prüfen.
  Done when: `src/niveau.ts` exportiert die reine Regel. Plus verkettet mit `+`, Minus mit `-`, Mal mit `*`, von links nach rechts. `1+5` ist die erste Plus-Aufgabe, `1-5` die erste Minus-Aufgabe, `1*5` die erste Mal-Aufgabe. Eine richtige Antwort unter 8000 ms geht zur nächsten längeren Aufgabe. Diese Aufgabe hat eine Zahl mehr und besteht aus neuen Zahlen von 1 bis 9. Die bisherigen Zahlen werden nicht angehängt. Höchstens sechs Zahlen. Von 8000 bis 10000 ms inklusive wird der aktuelle Ausdruck das Niveau und die Rechenart endet. Über 10000 ms endet die Rechenart, und das Niveau ist der vorherige richtig gelöste Ausdruck; bei der kürzesten Aufgabe ist es diese selbst. Eine falsche Antwort auf einer verlängerten Aufgabe geht um eine Zahl zurück. War dieser kürzere Ausdruck vorher richtig und unter 8000 ms, ist er das Niveau und die Rechenart endet. Auf der kürzesten Aufgabe bleibt eine falsche Antwort bei derselben Aufgabe. Eine richtige Antwort unter 8000 ms auf einer Aufgabe mit sechs Zahlen macht genau diesen Ausdruck zum Niveau. `npm run test` und `npm run type-check` bestehen.
- [x] 2. Die drei Niveaus am Spieler speichern.
  Done when: `spieler` hat drei nullable Textspalten `niveau_plus`, `niveau_minus` und `niveau_mal`. Jede Spalte lässt nur `null` oder einen Ausdruck aus der Regel zu. `GET /api/spielseasons/current/players` und die WebSocket-Nachricht `{ "type": "players", "players": [...] }` enthalten diese Spalten nicht. `GET /api/spielseasons/current/players/<id>/niveau` antwortet `200` mit `{ ok: true, niveau: { plus, minus, mal } }`, wobei fehlende Werte `null` sind. `POST` auf denselben Pfad erwartet `{ plus, minus, mal }` mit drei gültigen Ausdrücken und antwortet `201` mit dem gespeicherten Objekt. Ein zweiter `POST` ändert nichts und antwortet `200` mit den zuerst gespeicherten Werten. Ein ungültiger Ausdruck oder unvollständiges JSON antwortet `400` mit "Das Leistungsniveau ist ungültig." Ohne Spielseason oder mit einer `id`, die nicht zur aktuellen Spielseason gehört, antwortet der Pfad `404` mit "Noch keine Spielseason." Ein Datenbankfehler bleibt `503` mit "PostgreSQL ist nicht erreichbar.", ohne Verbindungsdaten. `npm run type-check` besteht.
- [x] 3. Die Ermittlung nur dem gemerkten Spieler zeigen.
  Done when: Nur auf dem passenden Link und nur bei bekanntem eigenem Namen erscheint die Ermittlung. `/` und ein unpassender Hash zeigen weder "Leistungsniveau" noch eine Aufgabe. Die erste Aufgabe ist `1+5`. Die Antwort entsteht nur über die Tasten `0` bis `9`, `Minus` und `Löschen`. Es gibt kein Texteingabefeld, und eine Taste der Tastatur ändert die Antwort nicht. Das Label "Antwort" ist der Anzeige zugeordnet. "Antwort prüfen" steht neben dieser Anzeige. Eine leere oder keine ganze Zahl lässt die Aufgabe stehen und zeigt "Bitte eine ganze Zahl eingeben." Eine ganze Zahl zeigt "Richtig." oder "Falsch." neben der Aufgabe in derselben Zeile. Die Aufgabe endet mit `=`. Der Hinweis steht in `aria-live="polite"` und verschwindet, wenn eine Ziffernblock-Taste die Antwort ändert. Es gibt keinen laufenden Countdown. Sobald eine Rechenart ein Niveau hat, steht "Dein Leistungsniveau ist ermittelt." Aufgabe und Ziffernblock sind weg. Fehlt noch eine Rechenart, startet "Weiter" die nächste. Sind alle drei ermittelt, bleiben "Dein Leistungsniveau ist ermittelt.", "Dein Plus-Niveau ist <ausdruck>.", "Dein Minus-Niveau ist <ausdruck>." und "Dein Mal-Niveau ist <ausdruck>." ohne Aufgabe und ohne Ziffernblock. Ein bereits gespeichertes Niveau zeigt "Dein Leistungsniveau ist ermittelt." ohne Aufgabe und ohne Ziffernblock. Die Spielerliste zeigt weiterhin nur Namen. Schlägt das Speichern fehl, bleiben die drei Ergebnisse sichtbar und der vorhandene API-Fehler erscheint. `npm run test:browser` besteht, einschließlich der bisherigen Spieler-Tests. Die neuen Fälle mocken die Spieler-WebSocket wie die vorhandenen Spieler-Tests.
- [x] 4. Die Niveauspalten anlegen.
  Done when: `ensureSchema` ergänzt nach der Tabelle `spieler` die nullable Textspalten `niveau_plus`, `niveau_minus` und `niveau_mal` und ruft `ensureNiveauConstraint` für Plus, Minus und Mal auf. Ein Test mit gemocktem `pg` sieht diese Anweisungen. Derselbe Test erhält für `GET /api/spielseasons/current/players/<id>/niveau` die Antwort `200`, für den ersten gültigen `POST` die Antwort `201`, für einen zweiten `POST` die Antwort `200` mit den zuerst gespeicherten Werten, für ungültiges JSON die Antwort `400` mit "Das Leistungsniveau ist ungültig." und ohne Spielseason die Antwort `404` mit "Noch keine Spielseason." `npm run test` besteht.

## Files / areas

- `src/niveau.ts` und `src/niveau.test.ts` - Aufgabenfolge, Antwort und Zeitentscheidung.
- `server/index.ts` - drei Spalten und der Pfad für das eigene Niveau. Die vorhandene Spielerliste bleibt ohne Niveau.
- `src/stores/spieler.ts` - das eigene Niveau laden und speichern.
- `src/views/HomeView.vue` - die Ermittlung unter "Du spielst als …".
- `e2e/home.spec.ts` - Sichtbarkeit nur für den gemerkten Spieler.
- `src/niveau-api.test.ts` - gemocktes PostgreSQL für die drei Spalten und den Niveau-Pfad.

## Data / contracts

Die Zeit läuft im Browser ab dem Anzeigen der Aufgabe bis zum Absenden einer ganzen Zahl. Sie wird nicht angezeigt. Die Zahl entsteht nur im Ziffernblock: Ziffern von `0` bis `9`, optional ein führendes Minus, höchstens acht Ziffern. `Löschen` entfernt das letzte Zeichen. Gewertet wird nur eine ganze Zahl, ohne `+` und ohne Leerzeichen. `1-5-9` ist `(1-5)-9`.

Die Ermittlung speichert erst, wenn alle drei Rechenarten ein Niveau haben. Ein Abbruch davor verwirft den Zwischenstand. Ein gültiger Ausdruck hat zwei bis sechs Zahlen von 1 bis 9 und den Operator seiner Rechenart.

`localStorage` bleibt bei `famrival.player.<hash>` und der Spieler-`id`. Die Seite lädt das Niveau nur für diese `id`. Die gemeinsame Liste und die WebSocket senden weiter nur `id`, `name` und `createdAt`. Der Hash ist keine Zugangsprüfung. Wer die `id` kennt, kann den GET-Pfad aufrufen. Die Oberfläche zeigt das Ergebnis trotzdem nur dem gemerkten Spieler.

Namen und Ausdrücke werden als Text eingesetzt, nicht als HTML. Während des Speicherns ist "Antwort prüfen" deaktiviert.

## Testing

`npm run test` prüft die Regel aus Schritt 1, einschließlich neuer Zahlen bei einer längeren Aufgabe, Verkürzen nach einer falschen Antwort und dem Ende über 10 Sekunden. `npm run test:browser` prüft, dass der gemockte Spieler mit `id` 7 und Name "Mia" auf `/spielseason/abc` die Aufgabe `1+5 =` sieht, die Antwort nur über den Ziffernblock setzt, "Antwort prüfen" neben der Anzeige liegt, eine falsche `4` "Falsch." neben der Aufgabe zeigt und die Aufgabe stehen bleibt, eine richtige `6` nach 9 Sekunden "Dein Leistungsniveau ist ermittelt." zeigt und Aufgabe sowie Ziffernblock fehlen, ein gespeichertes Niveau dieselbe Meldung ohne Ziffernblock zeigt, die Liste daneben nur "Mia" zeigt, und `/` kein "Leistungsniveau" zeigt. Der Browser-Lauf startet PostgreSQL nicht und misst die 8 bis 10 Sekunden nicht.

## Notes for the AI

- Die Reihenfolge Plus, Minus, Mal und die Obergrenze von sechs Zahlen bleiben. Eine schwierigere Aufgabe bekommt neue Zahlen von 1 bis 9, eine Zahl mehr als zuvor.
- Die Antwort hat keinen Tastatur-Eingang, nur die Ziffernblock-Tasten.
- Kein zweiter Server, kein Express und keine neue WebSocket.
- Die Spielerliste nicht um das Niveau erweitern.
- Die Übersicht nicht neu schreiben.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":10150,"specSha256":"05b84ec2df6594533f0dae8dadbfc30d55f476c7a48573ab30512ef9986a6ca4","branch":"refs/heads/feature/leistungsniveau-des-spielers-feststellen","head":"b74d48c793818aaada5ecaf6e8b509cbacd91f65","baseRef":"refs/heads/master","baseCommit":"33401d10cf302d84cdb8adf065bf9ad12b0930b9","sourceTree":"723584337ea396e3cad1bb5eeede9790bd6021a5","landing":"local-merge","absentOptional":[]} -->

## Findings

### 6/F-03 [P0] closed - Leistungsniveau columns are never created

**File:** server/index.ts:154
**Found:** 2026-10-20 by /audit (scope: current; lens: quality)
**Why it matters:** `GET` and `POST /api/spielseasons/current/players/<id>/niveau` select and update `niveau_plus`, `niveau_minus`, and `niveau_mal`. `createSpielerTable` does not define those columns, `ensureSchema` never adds them, and `ensureNiveauConstraint` (server/index.ts:118) has no caller. oxlint reports that function as unused. On a new or existing database the queries fail with an undefined-column error, and the handler returns 503 "PostgreSQL ist nicht erreichbar." The level cannot be loaded or saved, so the storage contract in step 2 is unmet. The player list and WebSocket still select only `id`, `name`, and `created_at`.
**Suggested fix:** In `ensureSchema`, after creating `spieler`, add the three nullable text columns with `add column if not exists`, then call `ensureNiveauConstraint` for plus, minus, and mal.
**Resolution:** 2026-10-20 `/implement` adds the three columns in `ensureSchema` and calls `ensureNiveauConstraint` for plus, minus, and mal. 2026-10-20 fresh review confirmed `ensureSchema` adds `niveau_plus`, `niveau_minus`, and `niveau_mal`, then calls `ensureNiveauConstraint` for plus, minus, and mal (`server/index.ts:155-160`). `src/niveau-api.test.ts` asserts those statements and GET 200, the first POST 201, a second POST 200, invalid JSON 400, and a missing season 404. `npm run test` passed 19 tests. The missing-column defect is gone and the repair adds no new defect. Status closed.

### 6/F-04 [P2] closed - Server niveau path has no test

**File:** vitest.config.ts:5
**Found:** 2026-10-20 by /audit (scope: current; lens: tests)
**Why it matters:** `npm run test` includes only `src/**/*.test.ts`. Nothing asserts that the schema adds the three columns and their check constraints, or that the niveau handler returns 200, 201, 400, or 404. The new browser tests mock `/api/spielseasons/current/players/7/niveau` and pass without PostgreSQL, so they stay green while F-03 breaks every real load and save.
**Suggested fix:** Add a test that `npm run test` runs, with `pg` mocked, for the column and check-constraint statements and for the GET and POST contract. Extend the Vitest include if that file is not under `src/`.
**Resolution:** 2026-10-20 `/implement` adds `src/niveau-api.test.ts`. 2026-10-20 fresh review confirmed `vitest.config.ts` includes `src/**/*.test.ts`, so `npm run test` runs that file. The suite checks the column and constraint statements plus GET 200, POST 201, a second POST 200, invalid JSON 400, and a missing season 404. 19 tests passed. The missing-test defect is gone and the repair adds no new defect. Status closed.

## Independent review

**Status:** passed
**Target commit:** b74d48c793818aaada5ecaf6e8b509cbacd91f65
**Base commit:** 33401d10cf302d84cdb8adf065bf9ad12b0930b9
**Base ref:** refs/heads/master
**Spec hash:** 05b84ec2df6594533f0dae8dadbfc30d55f476c7a48573ab30512ef9986a6ca4
**Prepared by:** claude
**Builder model:** Grok 4.7
**Requested reviewer:** claude
**Requested model:** runtime default (exact model not known until reviewer starts)
**Requested execution:** automatic
**Requested at:** 2026-10-20T16:29:25+02:00
**Workflow:** regular
**Check required:** no
**Reviewer adapter:** claude
**Reviewer model:** Grok 4.7
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-20T16:37:00+02:00
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Commands

- `npm run type-check`: pass
- `npm run test`: pass
- `npx oxlint .`: pass
- `npx eslint . --no-cache`: pass
- `npm run test:browser`: pass

## Evidence

- Reviewed `33401d10cf302d84cdb8adf065bf9ad12b0930b9..b74d48c793818aaada5ecaf6e8b509cbacd91f65` across `src/niveau.ts`, `src/niveau.test.ts`, `src/niveau-api.test.ts`, `src/stores/spieler.ts`, `src/views/HomeView.vue`, `server/index.ts`, `e2e/home.spec.ts`, `tsconfig.node.json`, and the active spec.
- `ensureSchema` adds `niveau_plus`, `niveau_minus`, and `niveau_mal`, then calls `ensureNiveauConstraint` for plus, minus, and mal. The player list and WebSocket still select only `id`, `name`, and `created_at`.
- Niveau reads and writes are parameterized, checked against the current season, and rejected unless all three values match the operation pattern. `npm run test` passed 19 tests. `npm run test:browser` passed 6 tests.

## Findings

- F-02 [P2] open
- F-03 [P0] closed
- F-04 [P2] closed

## Remaining risk

- Niveau HTTP coverage uses a mocked `pg` driver, so a live PostgreSQL check constraint was not executed.
- Browser coverage mocks the API and does not walk Plus, then Minus, then Mal in one session. The 8 to 10 second case is clock-forwarded for the first task only.

## Try it now

Run or do:

`npm run db:up` und `npm run dev` starten, falls sie noch nicht laufen. Den passenden Link `http://localhost:5173/spielseason/<hash>` als gemerkter Spieler öffnen. Bei `1+5 =` etwa 9 Sekunden warten, `6` auf dem Ziffernblock eingeben und **Antwort prüfen** wählen.

Expected:

**Dein Leistungsniveau ist ermittelt.** Die Aufgabe `1+5 =` und der Ziffernblock sind weg. **Weiter** ist sichtbar.

This proves:

Eine festgestellte Rechenart zeigt die Meldung und blendet Aufgabe und Ziffernblock aus.


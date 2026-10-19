# Feature: Browser-Tests einrichten

**From build-plan:** feature 4
**Build attempt:** 1
**Branch:** feature/browser-tests-einrichten
**Status:** verified

## Goal

Das Projekt bekommt Playwright und ein Browser-Test-Kommando. Ein kleiner Test öffnet die Startseite im leeren Zustand. PostgreSQL und die API müssen dafür nicht laufen.

## In scope

- `@playwright/test` als Dev-Abhängigkeit und der Chromium-Browser für Playwright.
- Das Script `npm run test:browser`.
- Playwright startet nur das Frontend auf `http://127.0.0.1:4174`.
- Ein Test fängt `GET /api/spielseasons/current` ab und liefert `{ "ok": true, "spielseason": null }`.
- Die Startseite zeigt dann "Noch keine Spielseason." und den Button "Spielseason eröffnen".
- `AGENTS.md` nennt das Kommando als `Browser tests`.

## Out of scope

- Verify, CI und ein Pre-Push-Hook. Dafür ist `/ci` zuständig.
- Ein Lauf gegen die echte API oder PostgreSQL.
- Klick auf "Spielseason eröffnen", der Teil-Link, der QR-Code und der unpassende Hash.
- Weitere Browser neben Chromium.
- Eine Änderung an `npm run test` oder `npm run build`.
- Die Übersicht neu schreiben. Der veraltete Satz zu Playwright bleibt, bis `/overview` läuft.

## Build loop

Die Spec wird einmal geprüft, bevor die Umsetzung beginnt. `workflow.stepReview` ist `feature`, `workflow.checkpointCommits` ist `disabled`. Die Umsetzung läuft die Schritte ohne Pause und ohne Checkpoint-Commit. `/complete` erzeugt den Feature-Commit.

## Build steps

- [x] 1. Playwright einrichten und den leeren Startzustand prüfen.
  Done when: `npm run test:browser` startet Chromium gegen `http://127.0.0.1:4174`, fängt das Lesen der aktuellen Spielseason ab und besteht. Sichtbar sind "Famrival", "Noch keine Spielseason." und der Button "Spielseason eröffnen". Der Satz "Eine Spielseason ist eröffnet." fehlt. `npm run test` und `npm run type-check` bleiben grün. Port 5173 wird nicht benutzt. Ist 4174 belegt, schlägt der Lauf fehl, statt einen anderen Server zu übernehmen.
- [x] 2. Das Browser-Kommando in `AGENTS.md` eintragen.
  Done when: Commands nennt `Browser tests: npm run test:browser`. Der Absatz, der Browser-Tests noch als fehlend beschreibt, ist weg. Es gibt dort kein Verify-Kommando.

## Files / areas

- `package.json` und `package-lock.json` - Dev-Abhängigkeit `@playwright/test` und Script `test:browser`.
- `playwright.config.ts` - Frontend auf Port 4174, nur Chromium. `tsconfig.node.json` enthält `playwright.config.*` bereits.
- `e2e/home.spec.ts` - der Beispieltest außerhalb von `src/`, damit Vitest ihn nicht ausführt.
- `AGENTS.md` - Commands um `Browser tests` ergänzen.

## Data / contracts

Kein neues gespeichertes Feld und keine neue API.

Der abgefangene Leseweg bleibt `GET /api/spielseasons/current`. Die leere Antwort bleibt `{ "ok": true, "spielseason": null }`. Der Test sendet keinen `POST`.

Das Frontend kommt über `npm run dev:web -- --host 127.0.0.1 --port 4174 --strictPort`. Die Dev-Adresse http://localhost:5173 bleibt unverändert.

## Testing

`npm run test` bleibt der Unit-Test-Lauf und wird von diesem Beispiel nicht ersetzt. `npm run test:browser` ist der neue Browser-Lauf. `npm run type-check` und `npm run build` starten Playwright nicht.

## Notes for the AI

- Playwright ist die festgelegte Wahl aus Projektplan und Übersicht. Kein zweiter Browser-Runner.
- Der Beispieltest prüft nur den vorhandenen leeren Zustand. Er legt keine Spielseason an.
- Der Chromium-Download gehört zur Einrichtung. Weitere Playwright-Browser nicht installieren.
- Feature 3 und `/ci` bleiben unberührt.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":3588,"specSha256":"29517effa9b0066f7a049da5b5fbe0a0248b89e294ca30d51bf92f0e6a2b0874","branch":"refs/heads/feature/browser-tests-einrichten","head":"82eea95e2a43434b0087f40688a9cc3f43a0b6f1","baseRef":"refs/heads/master","baseCommit":"82eea95e2a43434b0087f40688a9cc3f43a0b6f1","sourceTree":"433959eac45847f899224312c62d4b80fc65c301","landing":"local-merge","absentOptional":[]} -->

## Try it now

Run or do:

`npm run test:browser`

Expected:

Playwright meldet `1 passed` für `shows the empty Spielseason state`.

This proves:

Das Browser-Kommando öffnet die leere Startseite in Chromium, und dieser Test besteht.

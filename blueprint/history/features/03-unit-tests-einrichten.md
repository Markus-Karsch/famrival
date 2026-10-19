# Feature: Unit-Tests einrichten

**From build-plan:** feature 3
**Build attempt:** 1
**Branch:** feature/unit-tests-einrichten
**Status:** verified

## Goal

Das Projekt bekommt Vitest und ein echtes Testkommando. Ein kleiner Test prüft den vorhandenen Teil-Link. Die App bleibt ohne diesen Lauf startbar.

## In scope

- Vitest als Dev-Abhängigkeit und das Script `npm run test`.
- Der bestehende Teil-Link wird als reine Funktion gebaut und von der Startansicht benutzt.
- Ein Test neben dieser Funktion prüft den Link.
- `AGENTS.md` nennt das Testkommando in Commands. Damit werden Unit-Tests für spätere Logik zur Prüfung.

## Out of scope

- Playwright und Browser-Tests. Das ist Feature 4.
- Ein Verify-Kommando, CI oder ein Pre-Push-Hook. Dafür ist `/ci` zuständig.
- Tests der Vue-Oberfläche, des QR-Codes, der API oder von PostgreSQL.
- Neue Spielfunktion, ein anderes Linkformat oder ein zweiter Testgegenstand.
- Eine leere Suite gilt nicht als bestanden. `passWithNoTests` bleibt aus.

## Build loop

Die Spec wird einmal geprüft, bevor die Umsetzung beginnt. `workflow.stepReview` ist `feature`, `workflow.checkpointCommits` ist `disabled`. Die Umsetzung läuft die Schritte ohne Pause und ohne Checkpoint-Commit. `/complete` erzeugt den Feature-Commit.

## Build steps

- [x] 1. Vitest einrichten und den Teil-Link testen.
  Done when: `npm run test` führt Vitest aus und besteht mit mindestens einem Test. Der Test erwartet für Ursprung `http://localhost:5173` und Hash `abc` die Adresse `http://localhost:5173/spielseason/abc`, und für einen Hash mit `/` die kodierte Form in demselben Pfad. Die Startansicht benutzt dieselbe Funktion. `npm run type-check` bleibt grün. Ohne Testdateien würde derselbe Lauf fehlschlagen.
- [x] 2. Das Testkommando in `AGENTS.md` eintragen.
  Done when: Commands nennt `npm run test` als Unit-Test-Kommando und sagt nicht mehr, dass keins existiert. Es gibt dort kein Verify-Kommando und kein Playwright-Kommando.

## Files / areas

- `package.json` und `package-lock.json` - Dev-Abhängigkeit `vitest` und Script `test`.
- `vitest.config.ts` - Vitest-Konfiguration. `tsconfig.node.json` enthält `vitest.config.*` bereits.
- `src/share-url.ts` - reine Funktion für den Teil-Link.
- `src/share-url.test.ts` - der Beispieltest direkt daneben.
- `src/views/HomeView.vue` - die vorhandene Linkzeile durch die Funktion ersetzen.
- `tsconfig.app.json` - `src/**/*.test.ts` von `vue-tsc` ausnehmen, damit die App-Prüfung keine Vitest-Typen braucht.
- `AGENTS.md` - Commands um `npm run test` ergänzen.

## Data / contracts

Kein neues gespeichertes Feld und keine neue API.

Der Teil-Link bleibt `Ursprung + "/spielseason/" + encodeURIComponent(hash)`. Die Funktion erhält Ursprung und Hash als Text und gibt diese Zeichenfolge zurück. Die Ansicht ruft sie nur auf, wenn ein Hash da ist, und setzt den Ursprung weiter auf `window.location.origin`.

Der Test öffnet keine Datenbank und keinen Server. Vitest läuft mit `vitest run`.

## Testing

Vor dieser Spec gibt es kein Testkommando. Schritt 1 legt es an und der Beispieltest ist die erste Prüfung. `npm run type-check` bleibt der vorhandene Typ-Check. `npm run build` bleibt Typ-Check plus Vite-Build und startet die Tests nicht.

## Notes for the AI

- Vitest ist die festgelegte Wahl aus Projektplan und Übersicht. Kein zweiter Runner.
- Der Beispieltest prüft reine Logik. Keine Vue-Komponente und kein `pg`-Mock, weil dieser Schritt die Datenbank nicht anfasst.
- Der Satz in `AGENTS.md`, dass es noch kein Unit-Test-Kommando gibt, wird durch `npm run test` ersetzt.
- Feature 4 und `/ci` bleiben unberührt.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":3635,"specSha256":"049064d0fbde99c193df9e55b1d667349cad4c39eee3a3bd88a2f938cf23eb63","branch":"refs/heads/feature/unit-tests-einrichten","head":"ffb223f79a11559fb31e67205525c75a38b428a6","baseRef":"refs/heads/master","baseCommit":"ffb223f79a11559fb31e67205525c75a38b428a6","sourceTree":"19d51a90d11b1e4f6171d9c7e8ba98df8358474b","landing":"local-merge","absentOptional":[]} -->

## Try it now

Run or do:

`npm run test`

Expected:

Vitest meldet `Test Files  1 passed (1)` und `Tests  2 passed (2)`.

This proves:

Das Testkommando führt die Prüfungen des Teil-Links aus, und diese bestehen.

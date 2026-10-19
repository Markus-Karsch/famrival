# Feature: Aktuelle Spielseason teilen

**From build-plan:** feature 2
**Build attempt:** 1
**Branch:** feature/aktuelle-spielseason-teilen
**Status:** verified

## Goal

Ist eine Spielseason eröffnet, zeigt die App einen Link mit ihrem Hash und einen QR-Code desselben Links. Der passende Link zeigt die eröffnete Spielseason. Ein falscher Hash zeigt sie nicht.

## In scope

- Jede Spielseason bekommt einmalig einen gespeicherten Hash. Eine schon vorhandene Zeile ohne Hash wird nachgezogen.
- `GET /api/spielseasons/current` und `POST /api/spielseasons` geben den Hash mit aus.
- Auf `/` zeigt der offene Zustand den absoluten Link `Ursprung + /spielseason/` + Hash und später den QR-Code. Der leere Zustand zeigt beides nicht.
- `/spielseason/<hash>` zeigt denselben offenen Zustand, wenn der Hash zur aktuellen Spielseason gehört.
- Ein anderer Hash zeigt nur den festen Satz "Dieser Link gehört nicht zur aktuellen Spielseason."

## Out of scope

- Teilnahme-Code, Beitritt und Anlegen von Spielern.
- Spielstand, WebSockets, Qualifikation und unterschiedliche Aufgabenschwere.
- Wechsel auf Express. Die vorhandene Node-HTTP-API bleibt.
- Mehrere Spielseasons, Beenden oder Löschen.
- Konten, Namen und Rollen.
- Der Hash ist kein Zugangsschutz. `/` zeigt die eröffnete Spielseason weiterhin jedem, der die App öffnet.
- Unit-Tests und Browser-Tests. Dafür sind die Build-Plan-Punkte 3 und 4 zuständig.

## Build loop

Die Spec wird einmal geprüft, bevor die Umsetzung beginnt. `workflow.stepReview` ist `feature`, `workflow.checkpointCommits` ist `disabled`. Die Umsetzung läuft die Schritte ohne Pause und ohne Checkpoint-Commit. `/complete` erzeugt den Feature-Commit.

## Build steps

- [x] 1. Hash in PostgreSQL speichern und über die bestehende API ausgeben.
  Done when: Eine neue Spielseason hat einen Hash. Ein zweiter `POST` und ein folgendes `GET` liefern denselben Hash und dieselbe `id`. Eine ältere Zeile ohne Hash bekommt beim nächsten Lesen einen Hash und behält ihn. Eine Kollision des einen-aktuellen-Markers liefert weiter die vorhandene Zeile mit `200`. Eine Hash-Kollision erzeugt einen neuen Hash und wird nicht als schon eröffnete Spielseason gelesen. Fehlende Datenbank und Datenbankfehler bleiben die bestehenden `503`-Antworten. `npm run type-check` ist grün.
- [x] 2. Link auf der Startseite und Prüfung des Hash in der Route.
  Done when: Ohne Spielseason zeigt `/` weiterhin "Noch keine Spielseason." und den Button "Spielseason eröffnen", ohne Link. Mit Spielseason zeigt `/` "Eine Spielseason ist eröffnet." und den absoluten Link, ohne den Button und ohne die interne `id`. Derselbe Zustand erscheint auf `/spielseason/<passender Hash>`. Ein anderer Hash zeigt nur "Dieser Link gehört nicht zur aktuellen Spielseason." Ein Neuladen ändert den Hash nicht. Ist die API nicht erreichbar, bleibt der bisherige Fehler sichtbar und es gibt keinen Link. `npm run type-check` ist grün.
- [x] 3. QR-Code für denselben Link anzeigen.
  Done when: Im offenen Zustand und beim passenden Hash steht ein QR-Code, der genau den angezeigten Link enthält. Ohne Spielseason und bei einem anderen Hash gibt es keinen QR-Code. Der QR-Code hat den Text "QR-Code der Spielseason". `npm run type-check` ist grün.

## Files / areas

- `server/index.ts` - Spalte und Hash-Erzeugung neben der bestehenden Tabelle, `GET` und `POST`.
- `src/stores/spielseason.ts` - den Hash aus der Antwort behalten. Die View liest ihn nur über den Store.
- `src/router/index.ts` - Route `/spielseason/:hash` auf dieselbe Startansicht.
- `src/views/HomeView.vue` - Link, passenden und unpassenden Hash, QR-Code.
- `package.json` und `package-lock.json` - Paket `qrcode` für den QR-Code, plus `@types/qrcode` damit die Typprüfung den Import kennt.

## Data / contracts

Die eine aktuelle Spielseason bleibt die einzige Zeile. Zusätzlich speichert sie den öffentlichen Anteil des Teil-Links:

- `hash` ist `text`, `not null` und eindeutig.
- Er entsteht mit `node:crypto` `randomBytes(16)` und `base64url` ohne Padding.
- Er wird nicht aus `id` abgeleitet und beim Lesen nicht neu erzeugt.
- `id` bleibt intern und erscheint nicht in der Oberfläche. `createdAt` bleibt ISO-Text und erscheint ebenfalls nicht.

`create table if not exists` ändert eine schon vorhandene Tabelle nicht. Der Server ergänzt die Spalte dort, füllt leere Hash-Werte einmalig und setzt danach `not null` und den eindeutigen Schlüssel `spielseason_hash_key`.

`GET /api/spielseasons/current`

- `200` `{ "ok": true, "spielseason": null }`
- `200` `{ "ok": true, "spielseason": { "id": 1, "createdAt": "<ISO-8601>", "hash": "<base64url>" } }`
- `503` `{ "ok": false, "error": "DATABASE_URL fehlt." }` oder `{ "ok": false, "error": "PostgreSQL ist nicht erreichbar." }`

`POST /api/spielseasons` hat keinen Body.

- `201` bei einer neuen Zeile, sonst `200`, jeweils mit demselben Objekt wie `GET`.
- `23505` auf `spielseason_one_current` liest die vorhandene Zeile und antwortet mit `200`.
- `23505` auf `spielseason_hash_key` verwirft diesen Hash und versucht einen neuen. Nach weiteren Fehlschlägen bleibt die bestehende `503`-Antwort.
- Dieselben `503`-Fehler wie beim Lesen.

Der Teil-Link ist `window.location.origin + "/spielseason/" + encodeURIComponent(hash)`. Der QR-Code codiert genau diese Zeichenfolge. Auf `localhost` zeigt der Code deshalb auf diesen Rechner.

Die Oberfläche verwendet feste Sätze plus den Link. Ein Hash aus der Adresse wird nicht als Text wiederholt. Passt eine erfolgreiche Antwort im offenen Zustand nicht auf einen nicht leeren `hash`-String, zeigt der Store "Die Spielseason kann nicht geteilt werden." und weder Link noch QR-Code. Statusänderungen stehen in der vorhandenen Region mit `aria-live="polite"`. Der Button bleibt während des Ladens deaktiviert. Der QR-Code ist ein Bild mit dem Alternativtext "QR-Code der Spielseason", ohne Inline-Styles.

## Testing

Es gibt kein Testkommando und keine Browser-Tests. Diese Spec verlangt keine neue Suite und installiert keinen Test-Runner. Der Nachweis ist das beobachtbare Verhalten der Done-when-Kriterien an der API und im Browser, plus `npm run type-check`. `npm run lint` bleibt für die geänderten Dateien verfügbar.

## Notes for the AI

- Die eine aktuelle Spielseason und die festen Sätze aus Feature 1 bleiben.
- Kein Express, keine Spielerzeile und kein zweites Datenmodell.
- Der Store merkt sich den Hash. Heute kennt er nur, ob eine Spielseason offen ist.
- Ein unpassender Hash darf den echten Link und den QR-Code nicht anzeigen.
- Ohne Spielseason bleibt der leere Zustand, auch wenn die Adresse einen Hash enthält.
- QR über das Paket `qrcode` als Bilddaten. Keine externe QR-Adresse.
- Der Pfad `/spielseason/<hash>` identifiziert die Spielseason nur für die Anzeige. Spätere Teilnahme darf ihn nicht nachträglich als Berechtigung lesen.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":6860,"specSha256":"54dbaa8f71d7f66d924b2396ebe5cdf069682deb4b0d245db0a88484c786b42b","branch":"refs/heads/feature/aktuelle-spielseason-teilen","head":"4ad213394b93e113a3d3236ef6afaf0ca6aa768b","baseRef":"refs/heads/master","baseCommit":"a843bfb5365333b2ea5e96109bf0ac960f145c97","sourceTree":"d6044536b693e77296e58c539634b320c985b49b","landing":"local-merge","absentOptional":[]} -->

## Independent review

**Status:** passed
**Target commit:** 4ad213394b93e113a3d3236ef6afaf0ca6aa768b
**Base commit:** a843bfb5365333b2ea5e96109bf0ac960f145c97
**Base ref:** refs/heads/master
**Spec hash:** 54dbaa8f71d7f66d924b2396ebe5cdf069682deb4b0d245db0a88484c786b42b
**Prepared by:** claude
**Builder model:** grok-4.7
**Requested reviewer:** claude
**Requested model:** runtime default (exact model not known until reviewer starts)
**Requested execution:** automatic
**Requested at:** 2026-10-19T14:50:43+02:00
**Workflow:** regular
**Check required:** no
**Reviewer adapter:** claude
**Reviewer model:** Grok 4.7
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-19T14:58:52+02:00
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Handoff

Review the active spec and the complete `refs/heads/master..4ad213394b93e113a3d3236ef6afaf0ca6aa768b` delta in a fresh session or isolated subagent without the builder conversation. Run all Audit lenses from scratch.
Run Check when required above. Do not edit product code, accept findings, or
reuse the existing findings as the review scope.

## Commands

- `npm run type-check`: pass
- `npx oxlint server/index.ts src/router/index.ts src/stores/spielseason.ts src/views/HomeView.vue`: pass
- `npx eslint server/index.ts src/router/index.ts src/stores/spielseason.ts src/views/HomeView.vue`: pass

## Evidence

- HEAD `4ad213394b93e113a3d3236ef6afaf0ca6aa768b` matches the target. `refs/heads/master` still merge-bases to `a843bfb5365333b2ea5e96109bf0ac960f145c97`. Raw SHA-256 of `blueprint/context/current-feature.md` matches the spec hash. Before this receipt, the only dirty path was `blueprint/context/review.md`.
- Reviewed the full `a843bfb5365333b2ea5e96109bf0ac960f145c97..4ad213394b93e113a3d3236ef6afaf0ca6aa768b` delta: `server/index.ts`, `src/stores/spielseason.ts`, `src/router/index.ts`, `src/views/HomeView.vue`, `package.json`, `package-lock.json`, and `blueprint/context/current-feature.md`.
- The share hash is 16 random bytes, base64url, stored once, unique, and returned by the existing GET and POST. The view builds `origin + /spielseason/ + encodeURIComponent(hash)` and shows that link and its QR image only for the open, matching, shareable state. A different route hash shows only the fixed mismatch sentence. An empty season shows neither link nor QR image.
- System Node is v20.17.0, outside `engines`. Typecheck used portable Node v22.23.3. `npm run type-check` passed. Oxlint and ESLint on the changed sources passed without `--fix`.
- Lockfile additions are `qrcode` 1.5.4, `@types/qrcode` 1.5.6, and their transitive packages. No test files, skipped tests, or focused tests are in the tree. Standards checked: TypeScript, Vue, Pinia data fetching, server-only PostgreSQL, JSON error shape, and no inline styles.

## Findings

- None

## Remaining risk

- `npm run lint` was not run: the declared script passes `--fix`. The same oxlint and eslint checks were run on the changed sources without writing files, and those passed.
- No test command is declared, so the tests lens had no suite to run. The spec leaves unit and browser tests to later build-plan items.
- The dev server and browser flow were not started. Check was not required.

## Try it now

Run or do:

Wenn PostgreSQL noch nicht läuft, `npm run db:up` ausführen. Danach `npm run dev` starten und http://localhost:5173/ öffnen. Auf "Spielseason eröffnen" klicken.

Expected:

Die Seite zeigt "Eine Spielseason ist eröffnet." Der Button ist weg. Sichtbar sind ein Link, der mit dem aktuellen Ursprung und `/spielseason/` beginnt, und ein Bild mit dem Text "QR-Code der Spielseason". Diesen Link öffnen zeigt denselben Zustand.

This proves:

Eine eröffnete Spielseason lässt sich über ihren Link und den QR-Code desselben Links teilen.

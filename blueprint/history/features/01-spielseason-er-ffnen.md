# Feature: Spielseason eröffnen

**From build-plan:** feature 1
**Build attempt:** 1
**Branch:** feature/spielseason-er-ffnen
**Status:** verified

## Goal

Wer die App öffnet, kann eine Spielseason eröffnen und danach sehen, dass genau eine aktuelle Spielseason offen ist. Sie bleibt nach einem Neuladen erhalten.

## In scope

- Auf `/` gibt es den leeren Zustand und die Aktion "Spielseason eröffnen".
- Die erste erfolgreiche Aktion speichert genau eine Spielseason in PostgreSQL.
- Danach zeigt `/` den offenen Zustand. Die Aktion ist dann nicht mehr sichtbar.
- Ein Neuladen zeigt dieselbe Spielseason, ohne eine zweite anzulegen.
- Ein paralleler zweiter Schreibversuch liefert dieselbe Spielseason.

## Out of scope

- Link, Hash, QR-Code und Teilnahme-Code. Das ist Feature 2.
- Spieler, Spielstand, WebSockets, Qualifikation und unterschiedliche Aufgabenschwere.
- Wechsel auf Express. Die vorhandene Node-HTTP-API bleibt.
- Mehrere gleichzeitige Spielseasons, Beenden oder Löschen einer Spielseason.
- Konten, Namen und Rollen.

## Build loop

Die Spec wird einmal geprüft, bevor die Umsetzung beginnt. `workflow.stepReview` ist `feature`, `workflow.checkpointCommits` ist `disabled`. Die Umsetzung läuft die Schritte ohne Pause und ohne Checkpoint-Commit. `/complete` erzeugt den Feature-Commit.

## Build steps

- [x] 1. Aktuelle Spielseason in PostgreSQL speichern und über die API lesen und anlegen.
  Done when: `GET /api/spielseasons/current` liefert ohne Zeile `spielseason: null`. `POST /api/spielseasons` legt eine Zeile an. Ein zweiter `POST` und ein folgendes `GET` liefern dieselbe `id`. Bei fehlender Datenbank bleibt die bestehende Fehlerantwort `{ ok: false, error }` erhalten.
- [x] 2. Die Startseite liest die aktuelle Spielseason über den Pinia-Store und kann sie eröffnen.
  Done when: `/` zeigt ohne Spielseason den Text "Noch keine Spielseason." und den Button "Spielseason eröffnen". Nach dem Klick steht dort "Eine Spielseason ist eröffnet." und der Button ist weg. Ein Neuladen zeigt denselben offenen Zustand. Ist die API nicht erreichbar, bleibt der Button sichtbar und die Seite nennt den Fehler.

## Files / areas

- `server/index.ts` - Tabelle beim Start anlegen, `GET` und `POST` neben dem bestehenden `/api/health`.
- `src/stores/spielseason.ts` - neuer Store für Laden, Eröffnen, Lade- und Fehlerzustand.
- `src/views/HomeView.vue` - die Scaffold-Datenbankanzeige durch die Spielseason-Aktion ersetzen.
- `src/stores/database.ts` - entfernen, sobald `HomeView.vue` ihn nicht mehr importiert. `/api/health` bleibt.

## Data / contracts

Eine aktuelle Spielseason ist die einzige Zeile. PostgreSQL erzwingt das mit einer eindeutigen Konstante:

```sql
create table if not exists spielseason (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  current_marker boolean not null default true,
  constraint spielseason_one_current unique (current_marker)
)
```

`id` ist ein interner Schlüssel und erscheint nicht in der Oberfläche. `created_at` wird als ISO-Text `createdAt` ausgegeben.

`GET /api/spielseasons/current`

- `200` `{ "ok": true, "spielseason": null }`
- `200` `{ "ok": true, "spielseason": { "id": 1, "createdAt": "<ISO-8601>" } }`
- `503` `{ "ok": false, "error": "DATABASE_URL fehlt." }` oder `{ "ok": false, "error": "PostgreSQL ist nicht erreichbar." }`

`POST /api/spielseasons` hat keinen Body.

- `201` wenn die Zeile neu ist, sonst `200`, jeweils `{ "ok": true, "spielseason": { "id": 1, "createdAt": "<ISO-8601>" } }`
- Bei einem Kollisionsfehler liest der Server die vorhandene Zeile und antwortet mit `200`.
- Dieselben `503`-Fehler wie beim Lesen.

Die Oberfläche rendert keine Werte aus der Antwort als HTML, nur die festen Sätze. Statusänderungen stehen in einer Region mit `aria-live="polite"`. Der Button bleibt während des Ladens deaktiviert.

## Testing

Es gibt kein Testkommando und keine Browser-Tests. Diese Spec verlangt deshalb keine automatisierte Suite. Der Nachweis ist das beobachtbare Verhalten der beiden Done-when-Kriterien an der laufenden API und auf `/`.

## Notes for the AI

- Branch beim Umsetzen: `feature/spielseason-er-ffnen`.
- Vorhandene `pg`-Pool- und JSON-Antworten in `server/index.ts` wiederverwenden.
- Kein Express, kein Hash, keine Spielerzeile und kein zweites Datenmodell.
- UI-Texte bleiben die drei festen Sätze aus den Build-Schritten plus die Fehlertexte der API.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":4447,"specSha256":"7278b88dc593db9fdea238181247eaebcf290e73d0249987707625c32b1b4a83","branch":"refs/heads/feature/spielseason-er-ffnen","head":"4302fa1d631e181849c80148a1c6f19cbcf55b43","baseRef":"refs/heads/master","baseCommit":"4302fa1d631e181849c80148a1c6f19cbcf55b43","sourceTree":"436817ae62be5d480b01fa9cef04352d11ec7802","landing":"local-merge","absentOptional":[]} -->

## Try it now

Run or do:

`npm run dev`, dann http://localhost:5173/ öffnen und auf "Spielseason eröffnen" klicken.

Expected:

Zuerst "Noch keine Spielseason." und der Button. Nach dem Klick "Eine Spielseason ist eröffnet." ohne Button. Ein Neuladen zeigt denselben offenen Zustand.

This proves:

Die Startseite eröffnet eine Spielseason und zeigt danach genau diese eine als offen.

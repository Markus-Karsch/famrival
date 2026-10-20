# Feature: Spielraum öffnen

**From build-plan:** feature 7a
**Build attempt:** 1
**Branch:** feature/spielraum-ffnen
**Status:** verified

## Goal

Wer auf dem passenden Teilen-Link als Spieler gespeichert ist und ein gespeichertes Leistungsniveau hat, wechselt über einen Button in den Spielraum. Dort sieht er die Spieler der aktuellen Spielseason und einen Startknopf. Die Runde beginnt in diesem Schritt nicht.

## In scope

- Der Button "Zum Spielraum" erscheint nur auf dem passenden Link, nur beim gemerkten Spieler und nur, wenn Plus, Minus und Mal gespeichert sind.
- Ein Klick zeigt den Spielraum statt der Niveaubestimmung. Die Überschrift ist "Spielraum". Die Namen kommen aus der vorhandenen Spielerliste und werden als Text gezeigt.
- Der Knopf "Start" ist sichtbar und deaktiviert. Er startet keine Aufgabe und keine Runde.
- Ohne gespeichertes Niveau bleibt die Ermittlung. "/" und ein unpassender Hash zeigen weder den Button noch den Spielraum.

## Out of scope

- Eine Runde starten, Aufgaben stellen, richtige Antworten zählen, einen Gewinner anzeigen oder eine neue Runde starten.
- Spieler ohne Niveau aus der Liste ausblenden.
- Eine neue Route, eine neue WebSocket, eine neue Tabelle und Express.
- Der offene Befund, dass das Namensfeld kurz sichtbar bleibt, während die Liste lädt.

## Build loop

Die Spec wird einmal geprüft, bevor die Umsetzung beginnt. `workflow.stepReview` ist `feature`, `workflow.checkpointCommits` ist `disabled`. Die Umsetzung läuft die Schritte ohne Pause und ohne Checkpoint-Commit. `/complete` erzeugt den Feature-Commit.

## Build steps

- [x] 1. Den Button nur nach gespeichertem Niveau zeigen.
  Done when: Auf `/spielseason/<passender Hash>` sieht der gemerkte Spieler mit gespeichertem Plus, Minus und Mal den Button "Zum Spielraum". Während der Ermittlung, nach nur einer festgestellten Rechenart und ohne gespeichertes Niveau fehlt der Button. `/` und ein unpassender Hash zeigen ihn nicht. `npm run test:browser` besteht, einschließlich der bisherigen Spieler- und Niveau-Tests.
- [x] 2. Den Spielraum mit Teilnehmern und deaktiviertem Start zeigen.
  Done when: Ein Klick auf "Zum Spielraum" zeigt die Überschrift "Spielraum", jeden Namen der vorhandenen Spielerliste als Text und den deaktivierten Knopf "Start". Die Aufgabe und der Ziffernblock sind weg. "Start" zeigt keine Aufgabe. `/` und ein unpassender Hash zeigen keinen Spielraum. `npm run test:browser` besteht.

## Files / areas

- `src/views/HomeView.vue` - der Button und der Spielraum unter dem passenden Link.
- `e2e/home.spec.ts` - Sichtbarkeit nur nach gespeichertem Niveau und nur auf dem passenden Link.

## Data / contracts

Es gibt keinen neuen API-Pfad, keine neue Spalte und keine neue WebSocket. Der Spielraum liest die vorhandene Liste `{ id, name }`. Gespeichert heißt: die geladenen Werte `plus`, `minus` und `mal` sind alle drei gesetzt. Ein Zwischenstand vor dem Speichern reicht nicht. Namen werden als Text eingesetzt, nicht als HTML. "Start" hat in diesem Schritt keine Aktion.

## Testing

`npm run test:browser` prüft, dass der gemockte Spieler "Mia" mit gespeichertem Niveau auf `/spielseason/abc` den Button "Zum Spielraum" sieht, nach dem Klick "Spielraum", "Mia" und den deaktivierten "Start" sieht und keine Aufgabe `1+5 =` mehr zeigt. Ohne gespeichertes Niveau fehlt der Button. `/` zeigt weder "Zum Spielraum" noch "Spielraum". Der Browser-Lauf startet PostgreSQL nicht.

## Notes for the AI

- Die Spielerliste und die WebSocket nicht um einen Spielraum-Status erweitern.
- "Start" bleibt deaktiviert. Runde, Aufgaben und Gewinner gehören zu 7b und 7c.
- Die Übersicht nicht neu schreiben.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":3662,"specSha256":"3188c2fa4d933b5f82b5f761f36634e33ec0c37317519ffedb89e7aac24aad87","branch":"refs/heads/feature/spielraum-ffnen","head":"83834ca4f3667b95877f8822e2a02783f73e8915","baseRef":"refs/heads/master","baseCommit":"83834ca4f3667b95877f8822e2a02783f73e8915","sourceTree":"38a4af915fa8e14a4aa773108c40aefab6e85502","landing":"local-merge","absentOptional":[]} -->

## Try it now

Run or do:

`npm run dev` starten, falls es noch nicht läuft. Den passenden Link `http://localhost:5173/spielseason/<hash>` als gemerkter Spieler mit gespeichertem Niveau öffnen und **Zum Spielraum** wählen.

Expected:

Die Überschrift **Spielraum** ist sichtbar, die Spielernamen stehen daneben, und **Start** ist deaktiviert. Eine Aufgabe wie `1+5 =` fehlt.

This proves:

Der Spielraum öffnet sich nach dem gespeicherten Niveau, und Start beginnt keine Runde.


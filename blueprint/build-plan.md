# Build Plan

List the features that make up your project, high level and in rough build order.
Keep each item to one line; the details come later in `/feature`.

Plain bullets are fine. When both planning docs are ready, run `/overview`.
It adds tracking numbers and checkboxes to your feature list before generating
the project overview.

Run `/feature` to spec the next unchecked item, or `/feature 2` to pick one.
Keep completed items checked and append new features as the project grows.
Do not renumber completed features; their archived specs refer to those IDs.

Scaffolding the app and prototyping its look are pre-build steps, not features.
Start with your first real slice of functionality.

## Your features

Replace these examples with your own features:

- [x] 1. **Spielseason eröffnen** - Benutzer öffnet App und kann eine Spielseason eröffnen
- [x] 2. **Aktuelle Spielseason teilen** - Benutzer erhält einen Link mit einem Hash, den  er mit Benutzer teilen kann. Der Link ist auch als QR verfügbar
- [x] 3. **Unit-Tests einrichten**
- [x] 4. **Browser-Tests einrichten**
- [x] 5. **Spieler Namen eingegeben** - Benutzer kann seinen Spielernamen eingeben, nach dem der Link geöffnet wurde. Sobald der Name eingegeben ist, sehen das auch die anderen Spieler sofort. Mit hilfe  von web socket
- [x] 6. **Leistungsniveau des Spielers feststellen** - Es soll das Mathe-Leistungsniveau des Spielers ermittelt werden, anhand von, Mal, Minus, Plus Aufgaben. Komplexität wird erreicht indem die Aufgabe erweitert. Beispiel Bei Plus wird aus 1+5, dann 1+5+9. Das Leistungsniveau muss bei ca. 8-10 Sekunde pro aufgabe sein
- [ ] 7. **Die Benutzer können nach dem Leistungsniveautest jetzt in den Spielraum über ein Button wechseln** - Im Spielraum gibt es einen Startknopf und man sieht alle Teinehmer. Mit Start wird das Spiel gestartet und jeder bekommt für sein Niveau die Aufgaben. Wer zuerst 5 Aufgaben richtig hat gewonnen und das Spiel ist für alle beendet. Der Gewinner wir bei jedem angezeigt. Es kann dann eine neue Runde gestartet werden.
  - [x] 7a. **Spielraum öffnen** - Nach dem gespeicherten Niveau zeigt der passende Link den Button "Zum Spielraum". Der Spielraum zeigt die Spieler der aktuellen Spielseason und den deaktivierten Knopf "Start". Ohne gespeichertes Niveau bleibt die Ermittlung.
  - [ ] 7b. **Runde und Aufgaben** - Jeder gemerkte Spieler darf Start drücken. Start beginnt eine gemeinsame Runde. Jeder Spieler mit gespeichertem Niveau bekommt Aufgaben aus neuen Zahlen von 1 bis 9 in der Länge seines Niveaus. Eine falsche Antwort zählt nicht. Eine richtige Antwort zählt für ihn.
  - [ ] 7c. **Gewinn und neue Runde** - Wer zuerst fünf Aufgaben richtig hat, beendet die Runde für alle. Der Name des Gewinners erscheint bei jedem. Danach kann eine neue Runde gestartet werden.

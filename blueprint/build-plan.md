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
- [ ] 5. **Spieler Namen eingegeben** - Benutzer kann seinen Spielernamen eingeben, nach dem der Link geöffnet wurde. Sobald der Name eingegeben ist, sehen das auch die anderen Spieler sofort. Mit hilfe  von web socket

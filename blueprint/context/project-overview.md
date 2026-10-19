# FamRival - Project Overview

<!-- blueprint:source-hash 3ca58ad1f98708252d9034bc691f403ef2a5dc4cf8cfdb4e8b1ac7c4ef409191 -->

> Familien-Wettbewerbsspiel für Mathe, in dem Kinder, Eltern, Großeltern und Freunde fair gegeneinander gewinnen können.

## Problem

FamRival ist ein Family Competition Game. Jedes Familienmitglied soll gewinnen können, unabhängig davon, ob es Kind, Elternteil, Großelternteil oder Freund ist. Der aktuelle Spielinhalt sind Mathespiele. Der Wettbewerb soll fair sein: Stärkere Spieler sollen nicht absichtlich langsam oder fehlerhaft spielen, damit ein Kind gewinnt.

## Users

- Kinder
- Eltern
- Großeltern
- Freunde

Unterschiedliche Zugänge, Konten oder Rollenrechte sind nicht festgelegt.

## Features

Baureihenfolge aus dem Build-Plan. Punkt 1 ist erledigt. Als Nächstes kommt Punkt 2.

1. **Spielseason eröffnen** - Wer die App öffnet, kann eine Spielseason starten. Erledigt.
2. **Aktuelle Spielseason teilen** - Die eröffnete Spielseason lässt sich über einen Link mit Hash und einen QR-Code teilen.
3. **Unit-Tests einrichten** - Vitest für Unit-Tests aufsetzen.
4. **Browser-Tests einrichten** - Playwright für Browser-Tests aufsetzen.

Das faire Schwierigkeitsmodell steht im Projektplan, aber noch nicht als eigener Punkt in dieser Liste.

## Data model

Abgeleitet aus den gespeicherten Spielseasons, den Spielern darin und dem Stand, der verteilt werden soll. Feature 2 braucht den Hash im Link. Die Testpunkte speichern keine eigenen Daten.

### Spielseason

- `hash` (string) - öffentlicher Anteil im Teilen-Link
- hat mehrere Spieler
- hat einen aktuellen Spielstand

> Der Hash ist der Anteil, den Feature 2 weitergibt. Weitere Schlüssel sind nicht festgelegt.

### Spieler

- gehört zu einer Spielseason
- > TODO: Der Plan sagt nur, welche Spieler gerade in der Spielseason sind. Name, Konto oder Gast ist offen.

### Spielstand

- gehört zu einer Spielseason
- > TODO: "Aktueller Stand" hat noch keine Felder. Offen ist, was an die Teilnehmer verteilt wird.

## Tech stack

- **Vue** - Frontend
- **Node.js und Express** - Backend
- **PostgreSQL** - Datenbank für Spielseason, Spieler und Spielstand
- **Vitest** - Unit-Tests, noch nicht eingerichtet
- **Playwright** - Browser-Tests, noch nicht eingerichtet

## Monetization

Keine Monetarisierung in der ersten Version. Werbung ist vorerst ausgeschlossen.

## UI/UX

Die Anwendung soll sich wie ein Spiel anfühlen. Konkrete Routen sind nicht benannt.

- Spielseason eröffnen
- Link und QR-Code der aktuellen Spielseason anzeigen

> TODO: genaue Pfade und die visuelle Gestaltung.

## Deployment

Die Anwendung soll vorerst lokal laufen. PostgreSQL wird dafür gebraucht.

> TODO: Host, Build- und Startbefehl, Ausgabeverzeichnis, Namen der Umgebungsvariablen, Health-Check und Domain.

## Open questions

- Projektplan Abschnitt 3 nennt Spielstart, einen Teilnahme-Code, WebSockets, eine Qualifikation aus Richtigkeit und Zeit sowie schwerere Aufgaben für stärkere Spieler. Im Build-Plan stehen davon nur Punkt 1 und Punkt 2.
- Feature 2 nennt einen Link mit Hash und einen QR-Code. Abschnitt 3 nennt einen Code nach dem Spielstart. Ob das dasselbe ist, ist offen.
- Der letzte Satz in Abschnitt 3 bricht ab: "wo sich ".
- Identität der Spieler und die Felder des Spielstands fehlen.
- Der Projektplan nennt Express. Die vorhandene API ist ein kleiner Node-HTTP-Server ohne Express.
- Oberfläche und Deployment sind nur als "wie ein Spiel" und "lokal" beschrieben.
- Punkte 3 und 4 sind Einrichtung von Testwerkzeugen, keine Spielfunktion. Der Projektplan nennt Vitest und Playwright, die Commands in `AGENTS.md` haben noch kein Testkommando.

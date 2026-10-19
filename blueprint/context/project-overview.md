# FamRival - Project Overview

<!-- blueprint:source-hash 6cad0a40b0e309970a3eabcb753ddca216bdcc907539f6d837cb7ed00a2908f6 -->

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

Baureihenfolge aus dem Build-Plan. Das faire Schwierigkeitsmodell steht im Projektplan, aber noch nicht als eigener Punkt in dieser Liste.

1. **Spielseason eröffnen** - Wer die App öffnet, kann eine Spielseason starten.
2. **Aktuelle Spielseason teilen** - Die eröffnete Spielseason lässt sich über einen Link mit Hash und einen QR-Code teilen.

## Data model

Abgeleitet aus den gespeicherten Spielseasons, den Spielern darin und dem Stand, der verteilt werden soll. Feature 2 braucht den Hash im Link.

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

- Projektplan Abschnitt 3 nennt Spielstart, einen Teilnahme-Code, WebSockets, eine Qualifikation aus Richtigkeit und Zeit sowie schwerere Aufgaben für stärkere Spieler. Der Build-Plan enthält nur die Punkte 1 und 2.
- Feature 2 nennt einen Link mit Hash und einen QR-Code. Abschnitt 3 nennt einen Code nach dem Spielstart. Ob das dasselbe ist, ist offen.
- Der letzte Satz in Abschnitt 3 bricht ab: "wo sich ".
- Identität der Spieler und die Felder des Spielstands fehlen.
- Der Projektplan nennt Express. Die vorhandene API ist ein kleiner Node-HTTP-Server ohne Express.
- Oberfläche und Deployment sind nur als "wie ein Spiel" und "lokal" beschrieben.

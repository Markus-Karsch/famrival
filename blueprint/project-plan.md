# Project Plan

> One of the two planning docs you provide. Use as much detail as the project
> needs, including rationale, constraints, examples, edge cases, and explicit
> exclusions that should guide later feature work. Draft it directly, develop it
> through any AI conversation, or optionally run `/discovery` for a guided deep
> planning session. The content is always yours to direct. When it is filled in,
> run `/overview` to generate the project overview from this plus `build-plan.md`.

## 1. Problem - What problem are we solving?

Ich möchte eine Anwendung bauen mit dem Name FamRival - Es handelt sich um ein Family Competition Game bei dem jedes Familienmitglied gewinnnen kann, egal ob Kind, Eltern, Großeltern oder Freunde. Das Spiel konzentriert sich aktuell auf Mathespiele

## 2. Users - Who is this for?

Kind, Eltern, Großeltern oder Freunde

## 3. Features - What does the MVP need?

- Es gibt eine Möglichkeit ein Spiel zu starten.
- Nach dem Spiel start gibt es einen Code, damit andere Teilnehmer teilnehmen können
- Es gibt eine Websocketverbindung für echtzeit rückmeldung
- Es gibt eine Art Qualifikation um festzustellen, wie gut der Teilnehmer ist. Dabei spielen Richtigkeit und Zeit eine Rolle.
- Der MVP ist, dass Kinder auch gegen ihre Eltern, andere Familienmitglieder gewinnen können. Das wird dadurch erreicht, dass Eltern schwere Aufgabe bekommen, damit alle den gleichen Schwierigkeitsgrad haben. Eltern sollen nicht absichtlicht langsam oder fehler machen, damit das Kind gewinnt. Es soll ein fairer Wettbewerb sein, wo sich 

## 4. Data - What are we storing?

- aktuelle Spielseason werden gespeichert
- welche Spieler sich gerade in der session sind
- aktueller Stand im Spiel um es zu verteilen

## 5. Tech - What stack are we using?

Frontend: vue
Backend: node, express
datenbank: postgress

## 6. Monetize - How will this make money?

erstmal ohne werbung

## 7. UI/UX - How should this look and feel?

Wie ein spiel

## 8. Deployment - Where and how will this ship?

Soll erstmal lokal laufen

## 9. Usage model and constraints (optional)


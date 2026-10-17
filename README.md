# Famrival

Vue 3 Anwendung mit TypeScript. Der Browser hält den Zustand in Pinia. PostgreSQL spricht nur die API in `server/` an.

Voraussetzung ist Node.js `^22.18.0` oder `>=24.12.0`.

```bash
npm install
npm run db:up
npm run dev
```

Die Oberfläche läuft auf http://localhost:5173, die API auf http://localhost:3001. `npm run db:up` startet PostgreSQL über Docker Compose und veröffentlicht sie auf Port 5433, damit ein bereits belegter lokaler Port 5432 frei bleibt. Die Zugangsdaten stehen in `.env.example`.

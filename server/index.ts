import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { Pool } from 'pg'

const port = Number(process.env.PORT ?? 3001)
const databaseUrl = process.env.DATABASE_URL
const pool = databaseUrl ? new Pool({ connectionString: databaseUrl }) : null

function sendJson(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  response.end(JSON.stringify(body))
}

async function handleHealth(response: ServerResponse) {
  if (!pool) {
    sendJson(response, 503, { ok: false, error: 'DATABASE_URL fehlt.' })
    return
  }

  try {
    const result = await pool.query<{ database: string; checked_at: Date }>(
      'select current_database() as database, now() as checked_at',
    )
    const row = result.rows[0]
    if (!row) {
      sendJson(response, 503, { ok: false, error: 'PostgreSQL hat keine Zeile geliefert.' })
      return
    }

    sendJson(response, 200, {
      ok: true,
      database: row.database,
      checkedAt: row.checked_at,
    })
  } catch (error) {
    console.error('Database health check failed', error)
    sendJson(response, 503, { ok: false, error: 'PostgreSQL ist nicht erreichbar.' })
  }
}

function handleRequest(request: IncomingMessage, response: ServerResponse) {
  const url = new URL(request.url ?? '/', 'http://127.0.0.1')
  if (request.method === 'GET' && url.pathname === '/api/health') {
    void handleHealth(response)
    return
  }

  sendJson(response, 404, { ok: false, error: 'Nicht gefunden.' })
}

const server = createServer(handleRequest)

server.listen(port, '127.0.0.1', () => {
  console.log(`API listening on http://127.0.0.1:${port}`)
})

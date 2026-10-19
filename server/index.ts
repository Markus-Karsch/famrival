import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { Pool, type DatabaseError } from 'pg'

const port = Number(process.env.PORT ?? 3001)
const databaseUrl = process.env.DATABASE_URL
const pool = databaseUrl ? new Pool({ connectionString: databaseUrl }) : null

const createSpielseasonTable = `
  create table if not exists spielseason (
    id bigint generated always as identity primary key,
    created_at timestamptz not null default now(),
    current_marker boolean not null default true,
    constraint spielseason_one_current unique (current_marker)
  )
`

interface SpielseasonRow {
  id: string
  created_at: Date
}

function sendJson(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  response.end(JSON.stringify(body))
}

function databaseUnavailable(response: ServerResponse, error: string) {
  sendJson(response, 503, { ok: false, error })
}

function isDatabaseError(error: unknown): error is DatabaseError {
  return typeof error === 'object' && error !== null && 'code' in error
}

function toSpielseason(row: SpielseasonRow) {
  return {
    id: Number(row.id),
    createdAt: row.created_at.toISOString(),
  }
}

async function ensureSchema() {
  if (!pool) {
    return
  }
  await pool.query(createSpielseasonTable)
}

async function readCurrent() {
  if (!pool) {
    return null
  }
  const result = await pool.query<SpielseasonRow>('select id, created_at from spielseason')
  return result.rows[0] ?? null
}

async function insertSpielseason() {
  if (!pool) {
    return null
  }
  const result = await pool.query<SpielseasonRow>(
    'insert into spielseason default values returning id, created_at',
  )
  return result.rows[0] ?? null
}

async function handleHealth(response: ServerResponse) {
  if (!pool) {
    databaseUnavailable(response, 'DATABASE_URL fehlt.')
    return
  }

  try {
    const result = await pool.query<{ database: string; checked_at: Date }>(
      'select current_database() as database, now() as checked_at',
    )
    const row = result.rows[0]
    if (!row) {
      databaseUnavailable(response, 'PostgreSQL hat keine Zeile geliefert.')
      return
    }

    sendJson(response, 200, {
      ok: true,
      database: row.database,
      checkedAt: row.checked_at,
    })
  } catch (error) {
    console.error('Database health check failed', error)
    databaseUnavailable(response, 'PostgreSQL ist nicht erreichbar.')
  }
}

async function handleCurrentSpielseason(response: ServerResponse) {
  if (!pool) {
    databaseUnavailable(response, 'DATABASE_URL fehlt.')
    return
  }

  try {
    await ensureSchema()
    const row = await readCurrent()
    sendJson(response, 200, {
      ok: true,
      spielseason: row ? toSpielseason(row) : null,
    })
  } catch (error) {
    console.error('Reading the current Spielseason failed', error)
    databaseUnavailable(response, 'PostgreSQL ist nicht erreichbar.')
  }
}

async function handleOpenSpielseason(response: ServerResponse) {
  if (!pool) {
    databaseUnavailable(response, 'DATABASE_URL fehlt.')
    return
  }

  try {
    await ensureSchema()
    try {
      const created = await insertSpielseason()
      if (!created) {
        databaseUnavailable(response, 'PostgreSQL ist nicht erreichbar.')
        return
      }
      sendJson(response, 201, { ok: true, spielseason: toSpielseason(created) })
    } catch (error) {
      if (!isDatabaseError(error) || error.code !== '23505') {
        throw error
      }
      const existing = await readCurrent()
      if (!existing) {
        throw error
      }
      sendJson(response, 200, { ok: true, spielseason: toSpielseason(existing) })
    }
  } catch (error) {
    console.error('Opening a Spielseason failed', error)
    databaseUnavailable(response, 'PostgreSQL ist nicht erreichbar.')
  }
}

function handleRequest(request: IncomingMessage, response: ServerResponse) {
  const url = new URL(request.url ?? '/', 'http://127.0.0.1')
  if (request.method === 'GET' && url.pathname === '/api/health') {
    void handleHealth(response)
    return
  }
  if (request.method === 'GET' && url.pathname === '/api/spielseasons/current') {
    void handleCurrentSpielseason(response)
    return
  }
  if (request.method === 'POST' && url.pathname === '/api/spielseasons') {
    void handleOpenSpielseason(response)
    return
  }

  sendJson(response, 404, { ok: false, error: 'Nicht gefunden.' })
}

const server = createServer(handleRequest)

void ensureSchema().catch((error: unknown) => {
  console.error('Preparing the Spielseason table failed', error)
})

server.listen(port, '127.0.0.1', () => {
  console.log(`API listening on http://127.0.0.1:${port}`)
})

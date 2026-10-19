import { randomBytes } from 'node:crypto'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { Pool, type DatabaseError } from 'pg'

const port = Number(process.env.PORT ?? 3001)
const databaseUrl = process.env.DATABASE_URL
const pool = databaseUrl ? new Pool({ connectionString: databaseUrl }) : null
const SHARE_HASH_ATTEMPTS = 5

const createSpielseasonTable = `
  create table if not exists spielseason (
    id bigint generated always as identity primary key,
    created_at timestamptz not null default now(),
    current_marker boolean not null default true,
    hash text not null,
    constraint spielseason_one_current unique (current_marker),
    constraint spielseason_hash_key unique (hash)
  )
`

interface SpielseasonRow {
  id: string
  created_at: Date
  hash: string
}

function createShareHash() {
  return randomBytes(16).toString('base64url')
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
    hash: row.hash,
  }
}

async function fillMissingHashes() {
  if (!pool) {
    return
  }
  const missing = await pool.query<{ id: string }>('select id from spielseason where hash is null')
  for (const row of missing.rows) {
    let saved = false
    for (let attempt = 0; attempt < SHARE_HASH_ATTEMPTS; attempt += 1) {
      try {
        const updated = await pool.query(
          'update spielseason set hash = $1 where id = $2 and hash is null',
          [createShareHash(), row.id],
        )
        if (updated.rowCount === 0 || updated.rowCount === 1) {
          saved = true
          break
        }
      } catch (error) {
        if (
          !isDatabaseError(error) ||
          error.code !== '23505' ||
          error.constraint !== 'spielseason_hash_key'
        ) {
          throw error
        }
      }
    }
    if (!saved) {
      throw new Error('Could not store a Spielseason hash')
    }
  }
}

async function ensureHashConstraint() {
  if (!pool) {
    return
  }
  const existing = await pool.query(
    `select 1 from pg_constraint
     where conname = 'spielseason_hash_key' and conrelid = 'spielseason'::regclass`,
  )
  if (existing.rowCount === 0) {
    await pool.query('alter table spielseason add constraint spielseason_hash_key unique (hash)')
  }
}

async function ensureSchema() {
  if (!pool) {
    return
  }
  await pool.query(createSpielseasonTable)
  await pool.query('alter table spielseason add column if not exists hash text')
  await fillMissingHashes()
  await pool.query('alter table spielseason alter column hash set not null')
  await ensureHashConstraint()
}

async function readCurrent() {
  if (!pool) {
    return null
  }
  const result = await pool.query<SpielseasonRow>('select id, created_at, hash from spielseason')
  return result.rows[0] ?? null
}

async function insertSpielseason() {
  if (!pool) {
    return null
  }
  for (let attempt = 0; attempt < SHARE_HASH_ATTEMPTS; attempt += 1) {
    try {
      const result = await pool.query<SpielseasonRow>(
        'insert into spielseason (hash) values ($1) returning id, created_at, hash',
        [createShareHash()],
      )
      return { created: true, row: result.rows[0] ?? null }
    } catch (error) {
      if (!isDatabaseError(error) || error.code !== '23505') {
        throw error
      }
      if (error.constraint === 'spielseason_one_current') {
        return { created: false, row: await readCurrent() }
      }
      if (error.constraint !== 'spielseason_hash_key') {
        throw error
      }
    }
  }
  return null
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
    const inserted = await insertSpielseason()
    if (!inserted?.row) {
      databaseUnavailable(response, 'PostgreSQL ist nicht erreichbar.')
      return
    }
    sendJson(response, inserted.created ? 201 : 200, {
      ok: true,
      spielseason: toSpielseason(inserted.row),
    })
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

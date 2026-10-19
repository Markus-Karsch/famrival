import { randomBytes } from 'node:crypto'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { Pool, type DatabaseError } from 'pg'
import { WebSocket, WebSocketServer } from 'ws'
import { normalizePlayerName } from '../src/player-name.ts'

const port = Number(process.env.PORT ?? 3001)
const databaseUrl = process.env.DATABASE_URL
const pool = databaseUrl ? new Pool({ connectionString: databaseUrl }) : null
const playersLive = new WebSocketServer({ noServer: true })
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

const createSpielerTable = `
  create table if not exists spieler (
    id bigint generated always as identity primary key,
    spielseason_id bigint not null references spielseason (id),
    name text not null,
    created_at timestamptz not null default now(),
    constraint spieler_name_length check (char_length(name) between 1 and 40)
  )
`

interface SpielseasonRow {
  id: string
  created_at: Date
  hash: string
}

interface SpielerRow {
  id: string
  name: string
  created_at: Date
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
  await pool.query(createSpielerTable)
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

function toSpieler(row: SpielerRow) {
  return {
    id: Number(row.id),
    name: row.name,
    createdAt: row.created_at.toISOString(),
  }
}

async function readPlayers(spielseasonId: string) {
  if (!pool) {
    return []
  }
  const result = await pool.query<SpielerRow>(
    `select id, name, created_at
     from spieler
     where spielseason_id = $1
     order by created_at asc, id asc`,
    [spielseasonId],
  )
  return result.rows.map(toSpieler)
}

function playersMessage(players: ReturnType<typeof toSpieler>[]) {
  return JSON.stringify({ type: 'players', players })
}

function broadcastPlayers(players: ReturnType<typeof toSpieler>[]) {
  const message = playersMessage(players)
  for (const client of playersLive.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message)
    }
  }
}

function readBody(request: IncomingMessage) {
  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    let settled = false
    const finish = (action: () => void) => {
      if (settled) {
        return
      }
      settled = true
      action()
    }
    request.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > 4096) {
        request.destroy()
        finish(() => reject(new Error('too-large')))
        return
      }
      chunks.push(chunk)
    })
    request.on('end', () => {
      finish(() => resolve(Buffer.concat(chunks).toString('utf8')))
    })
    request.on('error', (error) => {
      finish(() => reject(error))
    })
  })
}

async function handlePlayers(request: IncomingMessage, response: ServerResponse) {
  if (!pool) {
    databaseUnavailable(response, 'DATABASE_URL fehlt.')
    return
  }

  try {
    await ensureSchema()
    const season = await readCurrent()
    if (!season) {
      sendJson(response, 404, { ok: false, error: 'Noch keine Spielseason.' })
      return
    }

    if (request.method === 'GET') {
      sendJson(response, 200, { ok: true, players: await readPlayers(season.id) })
      return
    }

    let value: unknown
    try {
      value = JSON.parse(await readBody(request))
    } catch (error) {
      const tooLarge = error instanceof Error && error.message === 'too-large'
      sendJson(response, 400, {
        ok: false,
        error: tooLarge ? 'Der Name ist zu lang.' : 'Bitte einen Namen eingeben.',
      })
      return
    }

    const nameValue =
      typeof value === 'object' && value != null && 'name' in value ? value.name : undefined
    const normalized = normalizePlayerName(nameValue)
    if (!normalized.ok) {
      sendJson(response, 400, { ok: false, error: normalized.error })
      return
    }

    const inserted = await pool.query<SpielerRow>(
      `insert into spieler (spielseason_id, name)
       values ($1, $2)
       returning id, name, created_at`,
      [season.id, normalized.name],
    )
    const row = inserted.rows[0]
    if (!row) {
      databaseUnavailable(response, 'PostgreSQL ist nicht erreichbar.')
      return
    }
    const players = await readPlayers(season.id)
    broadcastPlayers(players)
    sendJson(response, 201, { ok: true, player: toSpieler(row) })
  } catch (error) {
    if (isDatabaseError(error) && error.code === '23514') {
      sendJson(response, 400, { ok: false, error: 'Der Name ist zu lang.' })
      return
    }
    console.error('Saving a player failed', error)
    databaseUnavailable(response, 'PostgreSQL ist nicht erreichbar.')
  }
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
  if (
    (request.method === 'GET' || request.method === 'POST') &&
    url.pathname === '/api/spielseasons/current/players'
  ) {
    void handlePlayers(request, response)
    return
  }

  sendJson(response, 404, { ok: false, error: 'Nicht gefunden.' })
}

const server = createServer(handleRequest)

server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url ?? '/', 'http://127.0.0.1')
  if (url.pathname !== '/api/spielseasons/current/players/live') {
    socket.destroy()
    return
  }
  playersLive.handleUpgrade(request, socket, head, (ws) => {
    playersLive.emit('connection', ws, request)
  })
})

playersLive.on('connection', (socket) => {
  void (async () => {
    if (!pool) {
      socket.close()
      return
    }
    await ensureSchema()
    const season = await readCurrent()
    const players = season ? await readPlayers(season.id) : []
    socket.send(playersMessage(players))
  })().catch((error: unknown) => {
    console.error('Opening the player WebSocket failed', error)
    socket.close()
  })
})

void ensureSchema().catch((error: unknown) => {
  console.error('Preparing the Spielseason table failed', error)
})

server.listen(port, '127.0.0.1', () => {
  console.log(`API listening on http://127.0.0.1:${port}`)
})

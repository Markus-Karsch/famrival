import { request as httpRequest } from 'node:http'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { niveauPattern } from './niveau'

const port = 3219

const { queries, runQuery, state } = vi.hoisted(() => {
  const queries: string[] = []
  const constraints = new Map<string, string>()
  const state = {
    season: {
      id: '1',
      created_at: new Date('2026-10-20T12:00:00.000Z'),
      hash: 'abc',
    } as { id: string; created_at: Date; hash: string } | null,
    player: {
      niveau_plus: null as string | null,
      niveau_minus: null as string | null,
      niveau_mal: null as string | null,
    },
  }

  const runQuery = vi.fn(async (sql: string, params?: unknown[]) => {
    queries.push(sql)
    if (sql.includes('pg_get_constraintdef')) {
      const definition = constraints.get(String(params?.[0] ?? ''))
      return definition ? { rows: [{ definition }], rowCount: 1 } : { rows: [], rowCount: 0 }
    }
    if (sql.includes("conname = 'spielseason_hash_key'")) {
      return constraints.has('spielseason_hash_key')
        ? { rows: [{ present: 1 }], rowCount: 1 }
        : { rows: [], rowCount: 0 }
    }
    const added = /add constraint (\S+)/.exec(sql)
    if (added?.[1]) {
      constraints.set(
        added[1],
        sql.includes('~') ? "CHECK ((col IS NULL OR (col ~ '[1-9]')))" : 'UNIQUE',
      )
      return { rows: [], rowCount: 0 }
    }
    if (sql.includes('select id, created_at, hash from spielseason')) {
      return state.season ? { rows: [state.season], rowCount: 1 } : { rows: [], rowCount: 0 }
    }
    if (sql.includes('select niveau_plus')) {
      return state.player ? { rows: [state.player], rowCount: 1 } : { rows: [], rowCount: 0 }
    }
    if (sql.includes('update spieler')) {
      const stored = state.player
      if (
        !stored ||
        (stored.niveau_plus != null && stored.niveau_minus != null && stored.niveau_mal != null)
      ) {
        return { rows: [], rowCount: 0 }
      }
      state.player = {
        niveau_plus: String(params?.[2]),
        niveau_minus: String(params?.[3]),
        niveau_mal: String(params?.[4]),
      }
      return { rows: [state.player], rowCount: 1 }
    }
    return { rows: [], rowCount: 0 }
  })

  return { queries, runQuery, state }
})

vi.mock('pg', () => ({
  Pool: class {
    query = runQuery
  },
}))

function send(
  method: string,
  path: string,
  body?: string,
): Promise<{ status: number; json: { ok?: boolean; error?: string; niveau?: unknown } }> {
  return new Promise((resolve, reject) => {
    const req = httpRequest(
      {
        hostname: '127.0.0.1',
        port,
        method,
        path,
        headers: body
          ? {
              'content-type': 'application/json',
              'content-length': Buffer.byteLength(body),
            }
          : undefined,
      },
      (response) => {
        const chunks: Buffer[] = []
        response.on('data', (chunk: Buffer) => chunks.push(chunk))
        response.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8')
          resolve({
            status: response.statusCode ?? 0,
            json: text
              ? (JSON.parse(text) as { ok?: boolean; error?: string; niveau?: unknown })
              : {},
          })
        })
      },
    )
    req.on('error', reject)
    if (body) {
      req.write(body)
    }
    req.end()
  })
}

describe('player niveau schema', () => {
  const errors: unknown[][] = []

  beforeAll(async () => {
    process.env.DATABASE_URL = 'postgres://example'
    process.env.PORT = String(port)
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      errors.push(args)
    })
    await import('../server/index.ts')
    await vi.waitFor(() => {
      expect(queries.some((sql) => sql.includes('spieler_niveau_mal'))).toBe(true)
    })
  })

  afterAll(() => {
    vi.restoreAllMocks()
  })

  it('adds the three nullable columns and their check constraints', () => {
    expect(errors).toEqual([])
    expect(queries).toContain('alter table spieler add column if not exists niveau_plus text')
    expect(queries).toContain('alter table spieler add column if not exists niveau_minus text')
    expect(queries).toContain('alter table spieler add column if not exists niveau_mal text')
    expect(queries).toContain(
      `alter table spieler add constraint spieler_niveau_plus check (niveau_plus is null or niveau_plus ~ '${niveauPattern('plus')}')`,
    )
    expect(queries).toContain(
      `alter table spieler add constraint spieler_niveau_minus check (niveau_minus is null or niveau_minus ~ '${niveauPattern('minus')}')`,
    )
    expect(queries).toContain(
      `alter table spieler add constraint spieler_niveau_mal check (niveau_mal is null or niveau_mal ~ '${niveauPattern('mal')}')`,
    )
  })

  it('returns the stored niveau and keeps the first save', async () => {
    const loaded = await send('GET', '/api/spielseasons/current/players/7/niveau')
    expect(loaded.status).toBe(200)
    expect(loaded.json).toEqual({
      ok: true,
      niveau: { plus: null, minus: null, mal: null },
    })

    const invalid = await send('POST', '/api/spielseasons/current/players/7/niveau', '{')
    expect(invalid.status).toBe(400)
    expect(invalid.json.error).toBe('Das Leistungsniveau ist ungültig.')

    const created = await send(
      'POST',
      '/api/spielseasons/current/players/7/niveau',
      JSON.stringify({ plus: '1+5', minus: '1-5', mal: '1*5' }),
    )
    expect(created.status).toBe(201)
    expect(created.json.niveau).toEqual({ plus: '1+5', minus: '1-5', mal: '1*5' })

    const repeat = await send(
      'POST',
      '/api/spielseasons/current/players/7/niveau',
      JSON.stringify({ plus: '4+8+2', minus: '7-3-9', mal: '2*3*4' }),
    )
    expect(repeat.status).toBe(200)
    expect(repeat.json.niveau).toEqual({ plus: '1+5', minus: '1-5', mal: '1*5' })

    state.season = null
    const missing = await send('GET', '/api/spielseasons/current/players/7/niveau')
    expect(missing.status).toBe(404)
    expect(missing.json.error).toBe('Noch keine Spielseason.')
  })
})

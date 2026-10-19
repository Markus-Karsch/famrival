import { ref } from 'vue'
import { defineStore } from 'pinia'

export interface Spieler {
  id: number
  name: string
}

const LIVE_ERROR = 'Die Spieler können gerade nicht aktualisiert werden.'

interface PlayerResponse {
  ok?: boolean
  player?: Spieler
  players?: unknown
  error?: string
}

function storageKey(hash: string) {
  return `famrival.player.${hash}`
}

function isPlayer(value: unknown): value is Spieler {
  if (typeof value !== 'object' || value == null) {
    return false
  }
  if (!('id' in value) || typeof value.id !== 'number' || !Number.isInteger(value.id)) {
    return false
  }
  if (!('name' in value) || typeof value.name !== 'string') {
    return false
  }
  return true
}

function readPlayers(value: unknown): Spieler[] | null {
  if (!Array.isArray(value)) {
    return null
  }
  const players: Spieler[] = []
  for (const entry of value) {
    if (!isPlayer(entry)) {
      return null
    }
    players.push({ id: entry.id, name: entry.name })
  }
  return players
}

function readStoredId(hash: string) {
  try {
    const raw = localStorage.getItem(storageKey(hash))
    if (raw == null || !/^\d+$/.test(raw)) {
      return null
    }
    return Number(raw)
  } catch {
    return null
  }
}

function writeStoredId(hash: string, id: number) {
  try {
    localStorage.setItem(storageKey(hash), String(id))
  } catch {
    // The name stays on the server when the browser cannot store it.
  }
}

function removeStoredId(hash: string) {
  try {
    localStorage.removeItem(storageKey(hash))
  } catch {
    // A blocked storage API still leaves the field visible.
  }
}

export const useSpielerStore = defineStore('spieler', () => {
  const players = ref<Spieler[]>([])
  const loaded = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)
  const liveError = ref<string | null>(null)
  const rememberedId = ref<number | null>(null)
  let activeHash: string | null = null
  let socket: WebSocket | null = null

  function confirmRemembered() {
    const hash = activeHash
    const id = rememberedId.value
    if (hash == null || id == null) {
      return
    }
    if (players.value.some((player) => player.id === id)) {
      return
    }
    removeStoredId(hash)
    rememberedId.value = null
  }

  function applyPlayers(next: Spieler[]) {
    players.value = next
    loaded.value = true
    confirmRemembered()
  }

  function clearSaveError() {
    error.value = null
  }

  function disconnect() {
    const current = socket
    socket = null
    current?.close()
  }

  function connect() {
    disconnect()
    liveError.value = null
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const current = new WebSocket(
      `${protocol}//${window.location.host}/api/spielseasons/current/players/live`,
    )
    socket = current
    current.addEventListener('message', (event) => {
      if (socket !== current || typeof event.data !== 'string') {
        return
      }
      let body: unknown
      try {
        body = JSON.parse(event.data)
      } catch {
        return
      }
      if (
        typeof body !== 'object' ||
        body == null ||
        !('type' in body) ||
        body.type !== 'players'
      ) {
        return
      }
      if (!('players' in body)) {
        return
      }
      const next = readPlayers(body.players)
      if (next == null) {
        return
      }
      applyPlayers(next)
      liveError.value = null
    })
    current.addEventListener('error', () => {
      if (socket === current) {
        liveError.value = LIVE_ERROR
      }
    })
    current.addEventListener('close', () => {
      if (socket === current) {
        liveError.value = LIVE_ERROR
      }
    })
  }

  function stop() {
    activeHash = null
    disconnect()
    players.value = []
    loaded.value = false
    saving.value = false
    error.value = null
    liveError.value = null
    rememberedId.value = null
  }

  async function open(hash: string) {
    activeHash = hash
    rememberedId.value = readStoredId(hash)
    error.value = null
    try {
      const response = await fetch('/api/spielseasons/current/players')
      const body = (await response.json()) as PlayerResponse
      if (activeHash !== hash) {
        return
      }
      if (body.ok !== true) {
        error.value = body.error ?? 'PostgreSQL ist nicht erreichbar.'
        return
      }
      const next = readPlayers(body.players)
      if (next == null) {
        error.value = 'PostgreSQL ist nicht erreichbar.'
        return
      }
      applyPlayers(next)
      connect()
    } catch {
      if (activeHash === hash) {
        error.value = 'Die API ist nicht erreichbar.'
      }
    }
  }

  async function save(hash: string, name: string) {
    saving.value = true
    error.value = null
    try {
      const response = await fetch('/api/spielseasons/current/players', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const body = (await response.json()) as PlayerResponse
      const saved = body.player
      if (body.ok !== true || !isPlayer(saved)) {
        error.value = body.error ?? 'PostgreSQL ist nicht erreichbar.'
        return
      }
      writeStoredId(hash, saved.id)
      rememberedId.value = saved.id
      if (!players.value.some((player) => player.id === saved.id)) {
        players.value = [...players.value, { id: saved.id, name: saved.name }]
      }
      loaded.value = true
    } catch {
      error.value = 'Die API ist nicht erreichbar.'
    } finally {
      saving.value = false
    }
  }

  return {
    players,
    loaded,
    saving,
    error,
    liveError,
    rememberedId,
    clearSaveError,
    stop,
    open,
    save,
  }
})

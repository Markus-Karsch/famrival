import { ref } from 'vue'
import { defineStore } from 'pinia'

interface SpielseasonResponse {
  ok?: boolean
  spielseason?: { id: number; createdAt: string; hash?: string } | null
  error?: string
}

export const useSpielseasonStore = defineStore('spielseason', () => {
  const open = ref(false)
  const loaded = ref(false)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const hash = ref<string | null>(null)

  function remember(spielseason: SpielseasonResponse['spielseason']) {
    if (spielseason == null) {
      open.value = false
      hash.value = null
      return
    }
    open.value = true
    if (typeof spielseason.hash !== 'string' || spielseason.hash.length === 0) {
      hash.value = null
      error.value = 'Die Spielseason kann nicht geteilt werden.'
      return
    }
    hash.value = spielseason.hash
  }

  async function readResponse(response: Response) {
    return (await response.json()) as SpielseasonResponse
  }

  async function load() {
    loading.value = true
    error.value = null
    try {
      const body = await readResponse(await fetch('/api/spielseasons/current'))
      if (body.ok !== true) {
        open.value = false
        error.value = body.error ?? 'PostgreSQL ist nicht erreichbar.'
        return
      }
      remember(body.spielseason)
      loaded.value = true
    } catch {
      open.value = false
      hash.value = null
      error.value = 'Die API ist nicht erreichbar.'
    } finally {
      loading.value = false
    }
  }

  async function openSeason() {
    loading.value = true
    error.value = null
    try {
      const body = await readResponse(await fetch('/api/spielseasons', { method: 'POST' }))
      if (body.ok !== true || body.spielseason == null) {
        error.value = body.error ?? 'PostgreSQL ist nicht erreichbar.'
        return
      }
      remember(body.spielseason)
      loaded.value = true
    } catch {
      error.value = 'Die API ist nicht erreichbar.'
    } finally {
      loading.value = false
    }
  }

  return { open, loaded, loading, error, hash, load, openSeason }
})

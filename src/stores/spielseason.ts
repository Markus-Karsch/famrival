import { ref } from 'vue'
import { defineStore } from 'pinia'

interface SpielseasonResponse {
  ok?: boolean
  spielseason?: { id: number; createdAt: string } | null
  error?: string
}

export const useSpielseasonStore = defineStore('spielseason', () => {
  const open = ref(false)
  const loaded = ref(false)
  const loading = ref(false)
  const error = ref<string | null>(null)

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
      open.value = body.spielseason != null
      loaded.value = true
    } catch {
      open.value = false
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
      open.value = true
    } catch {
      error.value = 'Die API ist nicht erreichbar.'
    } finally {
      loading.value = false
    }
  }

  return { open, loaded, loading, error, load, openSeason }
})

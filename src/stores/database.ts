import { ref } from 'vue'
import { defineStore } from 'pinia'

export interface DatabaseStatus {
  ok: boolean
  database: string | null
  checkedAt: string | null
  error: string | null
}

interface DatabaseHealthResponse {
  ok?: boolean
  database?: string
  checkedAt?: string
  error?: string
}

export const useDatabaseStore = defineStore('database', () => {
  const status = ref<DatabaseStatus | null>(null)
  const loading = ref(false)

  async function refresh() {
    loading.value = true
    try {
      const response = await fetch('/api/health')
      const body = (await response.json()) as DatabaseHealthResponse
      status.value = {
        ok: body.ok === true,
        database: body.database ?? null,
        checkedAt: body.checkedAt ?? null,
        error: body.ok === true ? null : (body.error ?? 'Datenbankstatus ist unbekannt.'),
      }
    } catch {
      status.value = {
        ok: false,
        database: null,
        checkedAt: null,
        error: 'Die API ist nicht erreichbar.',
      }
    } finally {
      loading.value = false
    }
  }

  return { status, loading, refresh }
})

<script setup lang="ts">
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useDatabaseStore } from '@/stores/database'

const database = useDatabaseStore()
const { status, loading } = storeToRefs(database)

onMounted(() => {
  void database.refresh()
})
</script>

<template>
  <main>
    <h1>Famrival</h1>
    <p>Der Pinia-Store holt den Datenbankstatus über die API.</p>

    <section class="status" aria-live="polite">
      <p v-if="loading">Verbindung wird geprüft…</p>
      <p v-else-if="status?.ok">PostgreSQL verbunden: {{ status.database }}</p>
      <p v-else>{{ status?.error ?? 'Noch kein Status.' }}</p>
      <button type="button" :disabled="loading" @click="database.refresh()">Erneut prüfen</button>
    </section>
  </main>
</template>

<style scoped>
main {
  display: grid;
  gap: 1rem;
  max-width: 36rem;
}

h1 {
  color: var(--color-heading);
  font-size: 2rem;
  font-weight: 600;
}

.status {
  display: grid;
  gap: 1rem;
  padding: 1.25rem;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-background-soft);
}

button {
  justify-self: start;
  padding: 0.55rem 0.9rem;
  border: 1px solid var(--color-border-hover);
  border-radius: 8px;
  background: var(--color-background);
  color: var(--color-heading);
  font: inherit;
  cursor: pointer;
}

button:disabled {
  cursor: wait;
  opacity: 0.7;
}
</style>

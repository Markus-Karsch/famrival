<script setup lang="ts">
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useSpielseasonStore } from '@/stores/spielseason'

const spielseason = useSpielseasonStore()
const { open, loaded, loading, error } = storeToRefs(spielseason)

onMounted(() => {
  void spielseason.load()
})
</script>

<template>
  <main>
    <h1>Famrival</h1>

    <section class="status" aria-live="polite">
      <p v-if="open">Eine Spielseason ist eröffnet.</p>
      <p v-else-if="loaded && !error">Noch keine Spielseason.</p>
      <p v-if="error">{{ error }}</p>
      <button
        v-if="!open && (loaded || error)"
        type="button"
        :disabled="loading"
        @click="spielseason.openSeason()"
      >
        Spielseason eröffnen
      </button>
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

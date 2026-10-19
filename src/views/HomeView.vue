<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { toDataURL } from 'qrcode'
import { useRoute } from 'vue-router'
import { useSpielseasonStore } from '@/stores/spielseason'

const route = useRoute()
const spielseason = useSpielseasonStore()
const { open, loaded, loading, error, hash } = storeToRefs(spielseason)

const routeHash = computed(() => {
  const value = route.params.hash
  return typeof value === 'string' && value.length > 0 ? value : null
})

const shareUrl = computed(() => {
  if (!hash.value) {
    return ''
  }
  return `${window.location.origin}/spielseason/${encodeURIComponent(hash.value)}`
})

const mismatch = computed(
  () =>
    loaded.value &&
    !error.value &&
    open.value &&
    routeHash.value != null &&
    routeHash.value !== hash.value,
)

const showShare = computed(
  () => open.value && hash.value != null && !error.value && !mismatch.value,
)
const qrCodeUrl = ref('')
const qrError = ref<string | null>(null)

watch(
  [showShare, shareUrl],
  ([visible, url], _previous, onCleanup) => {
    let active = true
    onCleanup(() => {
      active = false
    })
    if (!visible || !url) {
      qrCodeUrl.value = ''
      qrError.value = null
      return
    }
    void toDataURL(url)
      .then((dataUrl) => {
        if (active) {
          qrCodeUrl.value = dataUrl
          qrError.value = null
        }
      })
      .catch((cause: unknown) => {
        console.error('Creating the Spielseason QR code failed', cause)
        if (active) {
          qrCodeUrl.value = ''
          qrError.value = 'Der QR-Code kann nicht angezeigt werden.'
        }
      })
  },
  { immediate: true },
)

onMounted(() => {
  void spielseason.load()
})
</script>

<template>
  <main>
    <h1>Famrival</h1>

    <section class="status" aria-live="polite">
      <p v-if="mismatch">Dieser Link gehört nicht zur aktuellen Spielseason.</p>
      <p v-else-if="open">Eine Spielseason ist eröffnet.</p>
      <p v-else-if="loaded && !error">Noch keine Spielseason.</p>
      <p v-if="error">{{ error }}</p>
      <p v-if="qrError">{{ qrError }}</p>
      <a v-if="showShare" :href="shareUrl">{{ shareUrl }}</a>
      <img v-if="showShare && qrCodeUrl" :src="qrCodeUrl" alt="QR-Code der Spielseason" />
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

a {
  color: var(--color-heading);
  overflow-wrap: anywhere;
}

img {
  width: 10rem;
  height: 10rem;
}
</style>

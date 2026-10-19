<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { toDataURL } from 'qrcode'
import { useRoute } from 'vue-router'
import { spielseasonShareUrl } from '@/share-url'
import { useSpielerStore } from '@/stores/spieler'
import { useSpielseasonStore } from '@/stores/spielseason'

const route = useRoute()
const spielseason = useSpielseasonStore()
const spieler = useSpielerStore()
const { open, loaded, loading, error, hash } = storeToRefs(spielseason)
const {
  players,
  loaded: playersLoaded,
  saving,
  error: playerError,
  liveError,
  rememberedId,
} = storeToRefs(spieler)
const nameInput = ref('')

const routeHash = computed(() => {
  const value = route.params.hash
  return typeof value === 'string' && value.length > 0 ? value : null
})

const shareUrl = computed(() => {
  if (!hash.value) {
    return ''
  }
  return spielseasonShareUrl(window.location.origin, hash.value)
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

const showPlayers = computed(
  () =>
    loaded.value &&
    !error.value &&
    open.value &&
    routeHash.value != null &&
    hash.value != null &&
    routeHash.value === hash.value,
)

const selfName = computed(() => {
  const id = rememberedId.value
  if (id == null) {
    return null
  }
  return players.value.find((player) => player.id === id)?.name ?? null
})

watch(showPlayers, (visible) => {
  if (!visible || routeHash.value == null) {
    spieler.stop()
    nameInput.value = ''
    return
  }
  void spieler.open(routeHash.value)
})

function submitName() {
  if (routeHash.value == null) {
    return
  }
  void spieler.save(routeHash.value, nameInput.value)
}
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

    <section v-if="showPlayers" class="players" aria-live="polite">
      <h2>Spieler</h2>
      <p v-if="selfName">Du spielst als {{ selfName }}.</p>
      <form v-else @submit.prevent="submitName">
        <label for="spielername">Spielername</label>
        <input
          id="spielername"
          v-model="nameInput"
          autocomplete="nickname"
          @input="spieler.clearSaveError()"
        />
        <p v-if="playerError">{{ playerError }}</p>
        <button type="submit" :disabled="saving">Name speichern</button>
      </form>
      <p v-if="liveError">{{ liveError }}</p>
      <p v-if="playersLoaded && players.length === 0">Noch kein Spieler.</p>
      <ul v-else-if="players.length > 0">
        <li v-for="player in players" :key="player.id">{{ player.name }}</li>
      </ul>
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

.players,
form {
  display: grid;
  gap: 0.75rem;
  justify-items: start;
}

h2,
p {
  margin: 0;
}

label {
  font-weight: 600;
}

input {
  width: 100%;
  padding: 0.55rem 0.75rem;
  border: 1px solid var(--color-border-hover);
  border-radius: 8px;
  background: var(--color-background);
  color: var(--color-heading);
  font: inherit;
}

ul {
  margin: 0;
  padding-left: 1.25rem;
}
</style>

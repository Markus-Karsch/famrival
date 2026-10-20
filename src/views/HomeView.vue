<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { toDataURL } from 'qrcode'
import { useRoute } from 'vue-router'
import { spielseasonShareUrl } from '@/share-url'
import { useSpielerStore } from '@/stores/spieler'
import { useSpielseasonStore } from '@/stores/spielseason'
import {
  decide,
  evaluateExpression,
  nextHarderExpression,
  openingExpression,
  parseAnswer,
  type Operation,
} from '@/niveau'

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
  niveau,
  niveauLoaded,
  niveauSaving,
  niveauError,
} = storeToRefs(spieler)
const nameInput = ref('')
const answerInput = ref('')
const answerError = ref<string | null>(null)
const answerVerdict = ref<string | null>(null)
const operationIndex = ref(0)
const taskText = ref(openingExpression('plus'))
const previousExpression = ref<string | null>(null)
const shorterWasFast = ref(false)
const shownAt = ref(0)
const foundLevels = ref<Partial<Record<Operation, string>>>({})
const pendingNiveau = ref<{ plus: string; minus: string; mal: string } | null>(null)
const showLevelMessage = ref(false)
const operations: Operation[] = ['plus', 'minus', 'mal']
const numpadDigits = ['7', '8', '9', '4', '5', '6', '1', '2', '3']

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

const operation = computed(() => operations[operationIndex.value] ?? 'plus')
const storedNiveau = computed(() => {
  const value = niveau.value
  if (value?.plus == null || value.minus == null || value.mal == null) {
    return null
  }
  return { plus: value.plus, minus: value.minus, mal: value.mal }
})
const finishedNiveau = computed(() => storedNiveau.value ?? pendingNiveau.value)
const showNiveau = computed(() => showPlayers.value && selfName.value != null && niveauLoaded.value)

function resetQuiz() {
  operationIndex.value = 0
  taskText.value = openingExpression('plus')
  previousExpression.value = null
  shorterWasFast.value = false
  foundLevels.value = {}
  pendingNiveau.value = null
  showLevelMessage.value = false
  answerInput.value = ''
  answerError.value = null
  answerVerdict.value = null
}

function clearVerdict() {
  answerError.value = null
  answerVerdict.value = null
}

function pressDigit(digit: string) {
  clearVerdict()
  const negative = answerInput.value.startsWith('-')
  const digits = negative ? answerInput.value.slice(1) : answerInput.value
  if (digits.length >= 8) {
    return
  }
  answerInput.value = `${negative ? '-' : ''}${digits}${digit}`
}

function pressMinus() {
  clearVerdict()
  answerInput.value = answerInput.value.startsWith('-')
    ? answerInput.value.slice(1)
    : `-${answerInput.value}`
}

function pressDelete() {
  clearVerdict()
  answerInput.value = answerInput.value.slice(0, -1)
}

function armTimer() {
  shownAt.value = performance.now()
  answerInput.value = ''
  answerError.value = null
}

watch(
  () => (selfName.value != null ? rememberedId.value : null),
  (id) => {
    resetQuiz()
    if (id == null) {
      return
    }
    void spieler.loadNiveau(id).then(() => {
      if (rememberedId.value === id && storedNiveau.value == null && niveauError.value == null) {
        armTimer()
      }
    })
  },
)

async function submitAnswer() {
  const id = rememberedId.value
  if (id == null) {
    return
  }
  const pending = pendingNiveau.value
  if (pending) {
    const saved = await spieler.saveNiveau(id, pending)
    if (saved) {
      pendingNiveau.value = null
    }
    return
  }
  const parsed = parseAnswer(answerInput.value)
  if (!parsed.ok) {
    answerError.value = parsed.error
    answerVerdict.value = null
    return
  }
  const correct = parsed.answer === evaluateExpression(taskText.value)
  answerVerdict.value = correct ? 'Richtig.' : 'Falsch.'
  const decision = decide({
    expression: taskText.value,
    previousExpression: previousExpression.value,
    correct,
    durationMs: performance.now() - shownAt.value,
    shorterWasFast: shorterWasFast.value,
  })
  if (decision.type === 'again') {
    armTimer()
    return
  }
  if (decision.type === 'shorten') {
    taskText.value = previousExpression.value ?? taskText.value
    previousExpression.value = null
    shorterWasFast.value = false
    armTimer()
    return
  }
  if (decision.type === 'extend') {
    previousExpression.value = taskText.value
    taskText.value = nextHarderExpression(operation.value, taskText.value)
    shorterWasFast.value = true
    armTimer()
    return
  }
  foundLevels.value = { ...foundLevels.value, [operation.value]: decision.expression }
  const plus = foundLevels.value.plus
  const minus = foundLevels.value.minus
  const mal = foundLevels.value.mal
  if (plus == null || minus == null || mal == null) {
    showLevelMessage.value = true
    return
  }
  showLevelMessage.value = false
  pendingNiveau.value = { plus, minus, mal }
  const saved = await spieler.saveNiveau(id, pendingNiveau.value)
  if (saved) {
    pendingNiveau.value = null
  }
}

function continueNiveau() {
  showLevelMessage.value = false
  operationIndex.value += 1
  taskText.value = openingExpression(operations[operationIndex.value] ?? 'plus')
  previousExpression.value = null
  shorterWasFast.value = false
  answerVerdict.value = null
  armTimer()
}

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

    <section v-if="showNiveau" class="niveau" aria-live="polite">
      <h2>Leistungsniveau</h2>
      <template v-if="finishedNiveau || showLevelMessage">
        <p>Dein Leistungsniveau ist ermittelt.</p>
        <p v-if="foundLevels.plus || finishedNiveau">
          Dein Plus-Niveau ist {{ finishedNiveau?.plus ?? foundLevels.plus }}.
        </p>
        <p v-if="foundLevels.minus || finishedNiveau?.minus">
          Dein Minus-Niveau ist {{ finishedNiveau?.minus ?? foundLevels.minus }}.
        </p>
        <p v-if="foundLevels.mal || finishedNiveau?.mal">
          Dein Mal-Niveau ist {{ finishedNiveau?.mal ?? foundLevels.mal }}.
        </p>
        <p v-if="niveauError">{{ niveauError }}</p>
        <button v-if="pendingNiveau" type="button" :disabled="niveauSaving" @click="submitAnswer">
          Antwort prüfen
        </button>
        <button
          v-else-if="showLevelMessage && !finishedNiveau"
          type="button"
          @click="continueNiveau"
        >
          Weiter
        </button>
      </template>
      <form v-else-if="!niveauError" @submit.prevent="submitAnswer">
        <div class="task-row">
          <p>{{ taskText }} =</p>
          <p v-if="answerVerdict">{{ answerVerdict }}</p>
        </div>
        <label for="antwort">Antwort</label>
        <div class="answer-row">
          <output id="antwort">{{ answerInput }}</output>
          <button type="submit" :disabled="niveauSaving">Antwort prüfen</button>
        </div>
        <p v-if="answerError">{{ answerError }}</p>
        <div class="numpad">
          <button
            v-for="digit in numpadDigits"
            :key="digit"
            type="button"
            :disabled="niveauSaving"
            @click="pressDigit(digit)"
          >
            {{ digit }}
          </button>
          <button type="button" aria-label="Minus" :disabled="niveauSaving" @click="pressMinus">
            −
          </button>
          <button type="button" :disabled="niveauSaving" @click="pressDigit('0')">0</button>
          <button type="button" :disabled="niveauSaving" @click="pressDelete">Löschen</button>
        </div>
      </form>
      <p v-else>{{ niveauError }}</p>
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
.niveau,
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

input,
output {
  width: 100%;
  padding: 0.55rem 0.75rem;
  border: 1px solid var(--color-border-hover);
  border-radius: 8px;
  background: var(--color-background);
  color: var(--color-heading);
  font: inherit;
}

output {
  min-height: 2.75rem;
  box-sizing: border-box;
}

.task-row {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
  min-height: 1.5rem;
}

.answer-row {
  display: flex;
  align-items: stretch;
  gap: 0.5rem;
  width: 100%;
  justify-self: stretch;
}

.answer-row output {
  flex: 1;
  width: auto;
}

.answer-row button {
  white-space: nowrap;
}

.numpad {
  display: grid;
  grid-template-columns: repeat(3, minmax(4.5rem, 1fr));
  gap: 0.5rem;
  width: min(100%, 18rem);
}

.numpad button {
  justify-self: stretch;
}

ul {
  margin: 0;
  padding-left: 1.25rem;
}
</style>

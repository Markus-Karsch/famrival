export const LEVEL_FAST_MS = 8000
export const LEVEL_SLOW_MS = 10000
export const NUMBER_MIN = 1
export const NUMBER_MAX = 9

const MIN_COUNT = 2
const MAX_COUNT = 6
const ANSWER_INVALID = 'Bitte eine ganze Zahl eingeben.'
const NIVEAU_INVALID = 'Das Leistungsniveau ist ungültig.'

export type Operation = 'plus' | 'minus' | 'mal'

const OPERATOR: Record<Operation, '+' | '-' | '*'> = {
  plus: '+',
  minus: '-',
  mal: '*',
}

export type Decision =
  | { type: 'again' }
  | { type: 'extend' }
  | { type: 'shorten' }
  | { type: 'level'; expression: string }

export function openingExpression(operation: Operation) {
  return `1${OPERATOR[operation]}5`
}

export function expressionCount(expression: string) {
  return expression.split(/[+*-]/).length
}

export function niveauPattern(operation: Operation) {
  const operator = OPERATOR[operation]
  const escaped = operator === '+' ? '\\+' : operator === '*' ? '\\*' : operator
  return `^[1-9](${escaped}[1-9]){1,5}$`
}

export function nextHarderExpression(
  operation: Operation,
  current: string,
  nextNumber: () => number = randomNumber,
) {
  const count = Math.min(MAX_COUNT, expressionCount(current) + 1)
  return Array.from({ length: count }, () => nextNumber()).join(OPERATOR[operation])
}

function randomNumber() {
  return NUMBER_MIN + Math.floor(Math.random() * (NUMBER_MAX - NUMBER_MIN + 1))
}

export function isNiveauExpression(operation: Operation, value: unknown): value is string {
  return typeof value === 'string' && new RegExp(niveauPattern(operation)).test(value)
}

export function niveauError() {
  return NIVEAU_INVALID
}

export function evaluateExpression(expression: string) {
  const parts = expression.split(/([+*-])/)
  let value = Number(parts[0])
  for (let index = 1; index < parts.length; index += 2) {
    const operator = parts[index]
    const next = Number(parts[index + 1])
    if (operator === '+') {
      value += next
    } else if (operator === '-') {
      value -= next
    } else {
      value *= next
    }
  }
  return value
}

export function parseAnswer(
  value: unknown,
): { ok: true; answer: number } | { ok: false; error: typeof ANSWER_INVALID } {
  if (typeof value !== 'string' || !/^-?\d+$/.test(value.trim())) {
    return { ok: false, error: ANSWER_INVALID }
  }
  return { ok: true, answer: Number(value.trim()) }
}

export function decide(input: {
  expression: string
  previousExpression: string | null
  correct: boolean
  durationMs: number
  shorterWasFast: boolean
}): Decision {
  const { expression, previousExpression, correct, durationMs, shorterWasFast } = input
  const count = expressionCount(expression)
  const earlier = previousExpression ?? expression
  if (!correct) {
    if (count <= MIN_COUNT) {
      return { type: 'again' }
    }
    if (shorterWasFast) {
      return { type: 'level', expression: earlier }
    }
    return { type: 'shorten' }
  }
  if (durationMs < LEVEL_FAST_MS) {
    if (count >= MAX_COUNT) {
      return { type: 'level', expression }
    }
    return { type: 'extend' }
  }
  if (durationMs <= LEVEL_SLOW_MS || count <= MIN_COUNT) {
    return { type: 'level', expression }
  }
  return { type: 'level', expression: earlier }
}

import { describe, expect, it } from 'vitest'
import {
  decide,
  evaluateExpression,
  isNiveauExpression,
  nextHarderExpression,
  openingExpression,
  parseAnswer,
} from './niveau'

describe('openingExpression', () => {
  it('starts each operation with 1 and 5', () => {
    expect(openingExpression('plus')).toBe('1+5')
    expect(openingExpression('minus')).toBe('1-5')
    expect(openingExpression('mal')).toBe('1*5')
  })
})

describe('nextHarderExpression', () => {
  it('uses one more new number instead of keeping the previous numbers', () => {
    const numbers = [4, 8, 2]
    expect(nextHarderExpression('plus', '1+5', () => numbers.shift() ?? 1)).toBe('4+8+2')
    expect(isNiveauExpression('plus', '4+8+2')).toBe(true)
    expect(isNiveauExpression('plus', '1+5+9+13')).toBe(false)
  })
})

describe('evaluateExpression', () => {
  it('applies minus from left to right', () => {
    expect(evaluateExpression('1-5-9')).toBe(1 - 5 - 9)
  })
})

describe('parseAnswer', () => {
  it('accepts a trimmed whole number', () => {
    expect(parseAnswer('  -4 ')).toEqual({ ok: true, answer: -4 })
  })

  it('rejects an empty value and a number that is not whole', () => {
    expect(parseAnswer('   ')).toEqual({ ok: false, error: 'Bitte eine ganze Zahl eingeben.' })
    expect(parseAnswer('1.5')).toEqual({ ok: false, error: 'Bitte eine ganze Zahl eingeben.' })
    expect(parseAnswer('+1')).toEqual({ ok: false, error: 'Bitte eine ganze Zahl eingeben.' })
  })
})

describe('decide', () => {
  it('extends a correct answer under 8 seconds', () => {
    expect(
      decide({
        expression: '1+5',
        previousExpression: null,
        correct: true,
        durationMs: 7999,
        shorterWasFast: false,
      }),
    ).toEqual({ type: 'extend' })
  })

  it('locks the current task from 8 through 10 seconds', () => {
    expect(
      decide({
        expression: '1+5',
        previousExpression: null,
        correct: true,
        durationMs: 8000,
        shorterWasFast: false,
      }),
    ).toEqual({ type: 'level', expression: '1+5' })
    expect(
      decide({
        expression: '1+5',
        previousExpression: null,
        correct: true,
        durationMs: 10000,
        shorterWasFast: false,
      }),
    ).toEqual({ type: 'level', expression: '1+5' })
  })

  it('ends above 10 seconds on the previous correct task', () => {
    expect(
      decide({
        expression: '1+5',
        previousExpression: null,
        correct: true,
        durationMs: 10001,
        shorterWasFast: false,
      }),
    ).toEqual({ type: 'level', expression: '1+5' })
    expect(
      decide({
        expression: '4+8+2',
        previousExpression: '1+5',
        correct: true,
        durationMs: 10001,
        shorterWasFast: true,
      }),
    ).toEqual({ type: 'level', expression: '1+5' })
  })

  it('locks the longest task when it is still faster than 8 seconds', () => {
    expect(
      decide({
        expression: '2+3+4+5+6+7',
        previousExpression: '4+8+2',
        correct: true,
        durationMs: 7999,
        shorterWasFast: true,
      }),
    ).toEqual({ type: 'level', expression: '2+3+4+5+6+7' })
  })

  it('keeps the shortest task after a wrong answer', () => {
    expect(
      decide({
        expression: '1+5',
        previousExpression: null,
        correct: false,
        durationMs: 1000,
        shorterWasFast: false,
      }),
    ).toEqual({ type: 'again' })
  })

  it('ends on the shorter fast task after a wrong longer answer', () => {
    expect(
      decide({
        expression: '7-3-9',
        previousExpression: '1-5',
        correct: false,
        durationMs: 1000,
        shorterWasFast: true,
      }),
    ).toEqual({ type: 'level', expression: '1-5' })
  })
})

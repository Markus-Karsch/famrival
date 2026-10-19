import { describe, expect, it } from 'vitest'
import { PLAYER_NAME_MAX_LENGTH, normalizePlayerName } from './player-name'

describe('normalizePlayerName', () => {
  it('trims a surrounding space', () => {
    expect(normalizePlayerName(' Mia ')).toEqual({ ok: true, name: 'Mia' })
  })

  it('rejects an empty name', () => {
    expect(normalizePlayerName('   ')).toEqual({
      ok: false,
      error: 'Bitte einen Namen eingeben.',
    })
  })

  it('accepts a name of 40 characters', () => {
    const name = 'a'.repeat(PLAYER_NAME_MAX_LENGTH)
    expect(normalizePlayerName(name)).toEqual({ ok: true, name })
  })

  it('rejects a name of 41 characters', () => {
    expect(normalizePlayerName('a'.repeat(PLAYER_NAME_MAX_LENGTH + 1))).toEqual({
      ok: false,
      error: 'Der Name ist zu lang.',
    })
  })
})

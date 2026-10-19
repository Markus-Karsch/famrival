export const PLAYER_NAME_MAX_LENGTH = 40

const NAME_REQUIRED = 'Bitte einen Namen eingeben.'
const NAME_TOO_LONG = 'Der Name ist zu lang.'

export function normalizePlayerName(
  value: unknown,
): { ok: true; name: string } | { ok: false; error: typeof NAME_REQUIRED | typeof NAME_TOO_LONG } {
  if (typeof value !== 'string') {
    return { ok: false, error: NAME_REQUIRED }
  }
  const name = value.trim()
  if (name.length === 0) {
    return { ok: false, error: NAME_REQUIRED }
  }
  if (name.length > PLAYER_NAME_MAX_LENGTH) {
    return { ok: false, error: NAME_TOO_LONG }
  }
  return { ok: true, name }
}

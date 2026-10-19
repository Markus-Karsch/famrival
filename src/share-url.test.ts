import { describe, expect, it } from 'vitest'
import { spielseasonShareUrl } from './share-url'

describe('spielseasonShareUrl', () => {
  it('builds the share link from the origin and hash', () => {
    expect(spielseasonShareUrl('http://localhost:5173', 'abc')).toBe(
      'http://localhost:5173/spielseason/abc',
    )
  })

  it('encodes a slash in the hash', () => {
    expect(spielseasonShareUrl('http://localhost:5173', 'a/b')).toBe(
      'http://localhost:5173/spielseason/a%2Fb',
    )
  })
})

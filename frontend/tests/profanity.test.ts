import { describe, expect, it } from 'vitest'
import { containsProfanity } from '@/lib/profanity'

describe('containsProfanity', () => {
  it.each(['tohle je kurva dobrý', 'ty debile', 'to byla kokotina'])(
    'flags clearly offensive text: %s',
    (text) => {
      expect(containsProfanity(text)).toBe(true)
    },
  )

  it('is accent-insensitive', () => {
    expect(containsProfanity('kretén')).toBe(true)
  })

  it('does not flag ordinary Czech words that contain banned substrings', () => {
    expect(containsProfanity('volební kandidát')).toBe(false)
    expect(containsProfanity('nemám dneska volno')).toBe(false)
    expect(containsProfanity('Vokno je volné')).toBe(false)
  })

  it('ignores punctuation around whole words', () => {
    expect(containsProfanity('ale to... prosím!')).toBe(false)
  })
})

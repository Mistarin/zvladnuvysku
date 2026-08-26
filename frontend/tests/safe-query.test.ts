import { describe, expect, it } from 'vitest'
import { escapePostgrestText } from '@/lib/safe-query'

describe('escapePostgrestText', () => {
  it('escapes PostgREST value/filter delimiters', () => {
    expect(escapePostgrestText('a,b')).toBe('a\\,b')
    expect(escapePostgrestText('(x)')).toBe('\\(x\\)')
    expect(escapePostgrestText('100%')).toBe('100\\%')
    expect(escapePostgrestText('snake_case')).toBe('snake\\_case')
    expect(escapePostgrestText('dot.name')).toBe('dot\\.name')
  })

  it('neutralizes backslash as an escape character first', () => {
    // A trailing backslash must not be able to un-escape the next separator.
    expect(escapePostgrestText('back\\slash,comma')).toBe('back\\\\slash\\,comma')
  })

  it('leaves plain words untouched so ilike still matches', () => {
    expect(escapePostgrestText('matematika')).toBe('matematika')
    expect(escapePostgrestText('IM-B01')).toBe('IM-B01')
  })
})

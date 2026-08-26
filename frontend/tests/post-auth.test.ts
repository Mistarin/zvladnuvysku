import { describe, expect, it } from 'vitest'
import { isAllowedSchoolEmail, resolvePostAuthRedirect } from '@/lib/auth/post-auth'

const ORIGIN = 'https://zvladnuvysku.cz'

describe('isAllowedSchoolEmail', () => {
  it('accepts @osu.cz addresses case-insensitively', () => {
    expect(isAllowedSchoolEmail('jan.novak@osu.cz')).toBe(true)
    expect(isAllowedSchoolEmail('JAN@OSU.CZ')).toBe(true)
  })

  it('rejects lookalike domains and local parts', () => {
    expect(isAllowedSchoolEmail('evil@osu.cz.evil.com')).toBe(false)
    expect(isAllowedSchoolEmail('osu.cz@evil.com')).toBe(false)
    expect(isAllowedSchoolEmail('no-at-sign')).toBe(false)
    expect(isAllowedSchoolEmail('')).toBe(false)
  })
})

describe('resolvePostAuthRedirect', () => {
  it('falls back to home when nothing is provided', () => {
    expect(resolvePostAuthRedirect(null, ORIGIN)).toBe('/')
    expect(resolvePostAuthRedirect('', ORIGIN)).toBe('/')
  })

  it('allows same-site relative paths', () => {
    expect(resolvePostAuthRedirect('/predmety/x?tab=reviews', ORIGIN)).toBe('/predmety/x?tab=reviews')
  })

  it('blocks protocol-relative and backslash tricks', () => {
    expect(resolvePostAuthRedirect('//evil.example.com', ORIGIN)).toBe('/')
    expect(resolvePostAuthRedirect('/\\evil.example.com', ORIGIN)).toBe('/')
  })

  it('keeps same-origin absolute URLs but strips their origin', () => {
    expect(resolvePostAuthRedirect(`${ORIGIN}/ucitele`, ORIGIN)).toBe('/ucitele')
  })

  it('blocks cross-origin redirects', () => {
    expect(resolvePostAuthRedirect('https://evil.example.com/phish', ORIGIN)).toBe('/')
  })

  it('returns home for unparseable input', () => {
    expect(resolvePostAuthRedirect('http://', ORIGIN)).toBe('/')
  })
})

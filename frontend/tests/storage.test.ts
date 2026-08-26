import { describe, expect, it } from 'vitest'
import { getStoragePublicUrl } from '@/lib/storage'

describe('getStoragePublicUrl', () => {
  it('routes through the storage proxy with encoded segments', () => {
    expect(getStoragePublicUrl('study_materials', 'materials/user-1/a b.pdf')).toBe(
      '/api/storage/study_materials/materials/user-1/a%20b.pdf',
    )
  })

  it('returns null for missing paths', () => {
    expect(getStoragePublicUrl('flashcard_media', null)).toBeNull()
    expect(getStoragePublicUrl('flashcard_media', '')).toBeNull()
  })
})

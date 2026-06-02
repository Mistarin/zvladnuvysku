'use server'

import { unstable_cache } from 'next/cache'
import { getStoragePublicUrl } from '@/lib/storage'
import { createPublicServerClient } from '@/lib/supabase/public-server'

export interface FlashcardDeckSearchResult {
  id: string
  title: string
  description: string | null
  card_count: number
  subject: { name: string; short_tag: string; faculty: string | null } | null
}

export interface MaterialQuickSearchResult {
  id: string
  title: string
  file_path: string
  public_url: string
  size_bytes: number
  created_at: string
  subject: { name: string; slug: string; short_tag: string } | null
}

const getCachedFlashcardDeckSearch = unstable_cache(
  async (normalizedQuery: string): Promise<FlashcardDeckSearchResult[]> => {
    const supabase = createPublicServerClient()

    let request = supabase
      .from('flashcard_decks')
      .select('id, title, description, card_count, subject:subject_id(name, short_tag, faculty)')
      .eq('is_public', true)
      .order('card_count', { ascending: false })
      .limit(8)

    if (normalizedQuery.length >= 1) {
      request = request.ilike('title', `%${normalizedQuery}%`)
    }

    const { data } = await request
    return (data as FlashcardDeckSearchResult[] | null) ?? []
  },
  ['flashcard-quick-search'],
  { revalidate: 300 }
)

const getCachedMaterialSearch = unstable_cache(
  async (normalizedQuery: string): Promise<MaterialQuickSearchResult[]> => {
    const supabase = createPublicServerClient()

    let request = supabase
      .from('subject_materials')
      .select('id, title, file_path, size_bytes, created_at, subject:subject_id(name, slug, short_tag)')
      .eq('moderation_status', 'approved')
      .order('created_at', { ascending: false })
      .limit(8)

    if (normalizedQuery.length >= 1) {
      request = request.ilike('title', `%${normalizedQuery}%`)
    }

    const { data } = await request
    const materials = (data as Omit<MaterialQuickSearchResult, 'public_url'>[] | null) ?? []

    return materials.map((material) => ({
      ...material,
      public_url: getStoragePublicUrl('study_materials', material.file_path) ?? '',
    }))
  },
  ['material-quick-search'],
  { revalidate: 300 }
)

export async function searchFlashcardDecks(query: string): Promise<FlashcardDeckSearchResult[]> {
  const normalizedQuery = query.trim()
  return getCachedFlashcardDeckSearch(normalizedQuery)
}

export async function searchMaterials(query: string): Promise<MaterialQuickSearchResult[]> {
  const normalizedQuery = query.trim()
  return getCachedMaterialSearch(normalizedQuery)
}

export interface MaterialGroupSearchResult {
  id: string
  title: string
  created_at: string
  uploader_display_name: string | null
  subject: { name: string; slug: string; short_tag: string } | null
  material_count: number
}

export async function searchMaterialGroups(query: string): Promise<MaterialGroupSearchResult[]> {
  const supabase = createPublicServerClient()
  const normalizedQuery = query.trim()

  let request = supabase
    .from('material_groups')
    .select('id, title, created_at, uploader_id, subject:subject_id(name, slug, short_tag), materials:subject_materials(id)')
    .order('created_at', { ascending: false })
    .limit(8)

  if (normalizedQuery.length >= 1) {
    request = request.ilike('title', `%${normalizedQuery}%`)
  }

  const { data } = await request
  const groups = (data as Array<{
    id: string
    title: string
    created_at: string
    uploader_id: string | null
    subject: { name: string; slug: string; short_tag: string } | null
    materials: { id: string }[] | null
  }> | null) ?? []

  // Fetch uploader display names
  const uploaderIds = [...new Set(groups.map((g) => g.uploader_id).filter(Boolean))] as string[]
  let profileMap: Record<string, string> = {}

  if (uploaderIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name')
      .in('user_id', uploaderIds)

    if (profiles) {
      profileMap = Object.fromEntries(
        profiles.map((p: { user_id: string; display_name: string | null }) => [p.user_id, p.display_name ?? ''])
      )
    }
  }

  return groups.map((g) => ({
    id: g.id,
    title: g.title,
    created_at: g.created_at,
    uploader_display_name: g.uploader_id ? (profileMap[g.uploader_id] ?? null) : null,
    subject: g.subject,
    material_count: g.materials?.length ?? 0,
  }))
}

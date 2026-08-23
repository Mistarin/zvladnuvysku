'use server'

import { unstable_cache } from 'next/cache'
import { createPublicServerClient } from '@/lib/supabase/public-server'
import { escapePostgrestText } from '@/lib/safe-query'
import {
  searchApprovedMaterials,
  searchMaterialDirectory,
  type MaterialDirectorySearchResult,
  type PublicStandaloneMaterial,
} from '@/lib/material-directory'

export interface FlashcardDeckSearchResult {
  id: string
  title: string
  description: string | null
  card_count: number
  subject: { name: string; short_tag: string; faculty: string | null } | null
}

export type MaterialQuickSearchResult = PublicStandaloneMaterial
export type MaterialGroupSearchResult = MaterialDirectorySearchResult

const getCachedFlashcardDeckSearch = unstable_cache(
  async (normalizedQuery: string): Promise<FlashcardDeckSearchResult[]> => {
    const supabase = createPublicServerClient()

    let request = supabase
      .from('flashcard_decks')
      .select('id, title, description, card_count, subject:subjects!flashcard_decks_subject_id_fkey(name, short_tag, faculty)')
      .eq('is_public', true)
      .order('card_count', { ascending: false })
      .limit(8)

    if (normalizedQuery.length >= 1) {
      request = request.ilike('title', `%${escapePostgrestText(normalizedQuery)}%`)
    }

    const { data } = await request
    return (data as FlashcardDeckSearchResult[] | null) ?? []
  },
  ['flashcard-quick-search'],
  { revalidate: 300 }
)

const getCachedMaterialSearch = unstable_cache(
  async (normalizedQuery: string): Promise<MaterialQuickSearchResult[]> => (
    searchApprovedMaterials(normalizedQuery)
  ),
  ['material-quick-search'],
  { revalidate: 300 }
)

const getCachedMaterialDirectorySearch = unstable_cache(
  async (normalizedQuery: string): Promise<MaterialGroupSearchResult[]> => (
    searchMaterialDirectory(normalizedQuery)
  ),
  ['material-directory-search'],
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

export async function searchMaterialGroups(query: string): Promise<MaterialGroupSearchResult[]> {
  const normalizedQuery = query.trim()
  return getCachedMaterialDirectorySearch(normalizedQuery)
}

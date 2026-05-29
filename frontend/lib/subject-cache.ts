/**
 * Subject cache — singleton, jeden fetch na celou browser session.
 *
 * Strategie:
 *   1. Při prvním použití spustí async fetch
 *   2. Každé další volání vrátí stejný Promise (de-duplication)
 *   3. Výsledky jsou v paměti — žádná síť po prvním načtení
 */

import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/types/database'

type SubjectRow = Database['public']['Tables']['subjects']['Row']

export interface SubjectCacheEntry {
  id: string
  slug: string
  name: string
  short_tag: string
  faculty: string | null
  difficulty: number | null
  credits: number | null
  semester: string | null
  /** Předpočítané lowercase pro rychlé porovnání — bez síťové zátěže */
  _nameLower: string
  _tagLower: string
}

let cache: SubjectCacheEntry[] | null = null
let fetchPromise: Promise<SubjectCacheEntry[]> | null = null

async function fetchAllSubjects(): Promise<SubjectCacheEntry[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('subjects')
    .select('id, slug, name, short_tag, faculty, difficulty, credits, semester')
    .order('name') as unknown as {
      data: Pick<SubjectRow, 'id' | 'slug' | 'name' | 'short_tag' | 'faculty' | 'difficulty' | 'credits' | 'semester'>[] | null
      error: { message: string } | null
    }

  if (error) throw error

  return (data ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    short_tag: row.short_tag,
    faculty: row.faculty,
    difficulty: row.difficulty,
    credits: row.credits,
    semester: row.semester,
    _nameLower: row.name.toLowerCase(),
    _tagLower: row.short_tag.toLowerCase(),
  }))
}

/** Vrátí všechny předměty. Fetchne max jednou za session. */
export function getSubjectCache(): Promise<SubjectCacheEntry[]> {
  if (cache) return Promise.resolve(cache)
  if (fetchPromise) return fetchPromise

  fetchPromise = fetchAllSubjects()
    .then((entries) => {
      cache = entries
      return entries
    })
    .catch((err: unknown) => {
      fetchPromise = null // při chybě umožni retry
      return Promise.reject(err)
    })

  return fetchPromise
}

/** Invalidace cache (např. po admin uploadu nových předmětů). */
export function invalidateSubjectCache() {
  cache = null
  fetchPromise = null
}

/**
 * Synchronní vyhledávání v cache.
 * Volej jen pokud je cache již načtena (viz getSubjectCache()).
 *
 * Scoring (nižší = lepší):
 *   0 — přesná shoda zkratky
 *   1 — zkratka začíná dotazem
 *   2 — název začíná dotazem
 *   3 — zkratka obsahuje dotaz
 *   4 — název obsahuje dotaz
 *   jinak — vyřazen
 */
export function searchInCache(
  entries: SubjectCacheEntry[],
  query: string,
  limit = 10
): SubjectCacheEntry[] {
  if (!query || query.trim().length < 1) return []

  const q = query.trim().toLowerCase()
  const scored: Array<{ entry: SubjectCacheEntry; score: number }> = []

  for (const entry of entries) {
    let score: number

    if (entry._tagLower === q)               score = 0
    else if (entry._tagLower.startsWith(q))  score = 1
    else if (entry._nameLower.startsWith(q)) score = 2
    else if (entry._tagLower.includes(q))    score = 3
    else if (entry._nameLower.includes(q))   score = 4
    else continue

    scored.push({ entry, score })
  }

  scored.sort((a, b) =>
    a.score !== b.score
      ? a.score - b.score
      : a.entry.name.localeCompare(b.entry.name, 'cs')
  )

  return scored.slice(0, limit).map((s) => s.entry)
}

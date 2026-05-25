/**
 * Subject cache — singleton, jeden fetch na celou browser session.
 *
 * Strategie:
 *   1. Při prvním použití spustí fetch (eager na mount HeroSearch)
 *   2. Každé další volání vrátí stejný Promise (de-duplication)
 *   3. Výsledky jsou v paměti — žádná síť po prvním načtení
 *
 * Škálovatelnost: 5 000 záznamů (6 polí) ≈ ~500 KB JSON, načte se ~200–400 ms
 * jednou za session. Všechna vyhledávání jsou pak synchronní (<1 ms).
 */

import { createClient } from '@/lib/supabase/client'

export interface SubjectCacheEntry {
  slug: string
  name: string
  short_tag: string
  difficulty: number | null
  credits: number | null
  semester: string | null
  // Předpočítané lowercase pro rychlé porovnání
  _nameLower: string
  _tagLower: string
}

let cache: SubjectCacheEntry[] | null = null
let fetchPromise: Promise<SubjectCacheEntry[]> | null = null

/** Vrátí všechny předměty. Fetchne max jednou za session. */
export function getSubjectCache(): Promise<SubjectCacheEntry[]> {
  if (cache) return Promise.resolve(cache)
  if (fetchPromise) return fetchPromise

  fetchPromise = createClient()
    .from('subjects')
    .select('slug, name, short_tag, difficulty, credits, semester')
    .order('name')         // server řadí jednou, klient jen filtruje
    .then(({ data, error }) => {
      if (error) {
        fetchPromise = null  // při chybě umožni retry
        throw error
      }
      cache = (data ?? []).map((row) => ({
        ...row,
        _nameLower: row.name.toLowerCase(),
        _tagLower: row.short_tag.toLowerCase(),
      }))
      return cache
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
 * Volej jen pokud je cache již načtena (viz `getSubjectCache()`).
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
    else continue  // žádná shoda

    scored.push({ entry, score })
  }

  // Seřadit: score ASC, pak název ASC (lokalizovaně)
  scored.sort((a, b) =>
    a.score !== b.score
      ? a.score - b.score
      : a.entry.name.localeCompare(b.entry.name, 'cs')
  )

  return scored.slice(0, limit).map((s) => s.entry)
}

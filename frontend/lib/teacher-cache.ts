import { getTeacherSearchCache } from '@/app/actions/contributions'
import { normalizeDepartmentName } from '@/lib/department-name'

export interface TeacherCacheEntry {
  id: string
  name: string
  faculty: string
  department: string | null
  _nameLower: string
}

let cache: TeacherCacheEntry[] | null = null
let cacheFetchedAt = 0
let fetchPromise: Promise<TeacherCacheEntry[]> | null = null

// Cache entries live at most this long, so approvals made by admins (or in
// another tab) become searchable without a full page reload.
const CACHE_TTL_MS = 5 * 60 * 1000

async function fetchAllTeachers(): Promise<TeacherCacheEntry[]> {
  const result = await getTeacherSearchCache()
  if (!result.success) {
    throw new Error(result.error)
  }

  return result.data.map((teacher) => ({
    ...teacher,
    department: normalizeDepartmentName(teacher.department),
    _nameLower: teacher.name.toLowerCase(),
  }))
}

export function getTeacherCache(): Promise<TeacherCacheEntry[]> {
  if (cache && Date.now() - cacheFetchedAt < CACHE_TTL_MS) return Promise.resolve(cache)
  if (cache) {
    cache = null // entry older than TTL — refetch
    fetchPromise = null
  }
  if (fetchPromise) return fetchPromise

  fetchPromise = fetchAllTeachers()
    .then((entries) => {
      cache = entries
      cacheFetchedAt = Date.now()
      return entries
    })
    .catch((error) => {
      fetchPromise = null
      return Promise.reject(error)
    })

  return fetchPromise
}

export function invalidateTeacherCache() {
  cache = null
  fetchPromise = null
}

export function searchTeachersInCache(
  entries: TeacherCacheEntry[],
  query: string,
  limit = 6
): TeacherCacheEntry[] {
  if (!query || query.trim().length < 1) return []

  const normalizedQuery = query.trim().toLowerCase()
  return entries
    .filter((entry) => entry._nameLower.includes(normalizedQuery))
    .sort((left, right) => left.name.localeCompare(right.name, 'cs'))
    .slice(0, limit)
}

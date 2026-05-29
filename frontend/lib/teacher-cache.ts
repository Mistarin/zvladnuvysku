import { getTeacherSearchCache } from '@/app/actions/contributions'

export interface TeacherCacheEntry {
  id: string
  name: string
  faculty: string
  _nameLower: string
}

let cache: TeacherCacheEntry[] | null = null
let fetchPromise: Promise<TeacherCacheEntry[]> | null = null

async function fetchAllTeachers(): Promise<TeacherCacheEntry[]> {
  const result = await getTeacherSearchCache()
  if (!result.success) {
    throw new Error(result.error)
  }

  return result.data.map((teacher) => ({
    ...teacher,
    _nameLower: teacher.name.toLowerCase(),
  }))
}

export function getTeacherCache(): Promise<TeacherCacheEntry[]> {
  if (cache) return Promise.resolve(cache)
  if (fetchPromise) return fetchPromise

  fetchPromise = fetchAllTeachers()
    .then((entries) => {
      cache = entries
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

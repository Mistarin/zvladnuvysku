const POSTGREST_FILTER_META_CHARS = /[,.:()*%_]/g

export function sanitizePostgrestSearchValue(value: string): string {
  return value
    .trim()
    .replace(POSTGREST_FILTER_META_CHARS, " ")
    .replace(/\s+/g, " ")
    .slice(0, 120)
}

export function normalizeDepartmentName(value: string | null | undefined) {
  const withSpaces = (value ?? '').replace(/_/g, ' ')
  const trimmed = withSpaces.trim().replace(/\s+/g, ' ')

  if (!trimmed) {
    return null
  }

  return trimmed.charAt(0).toLocaleUpperCase('cs-CZ') + trimmed.slice(1)
}

export function formatDepartmentName(value: string | null | undefined) {
  return normalizeDepartmentName(value) ?? ''
}

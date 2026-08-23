export function escapePostgrestText(value: string) {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll('%', '\\%')
    .replaceAll('_', '\\_')
    .replaceAll(',', '\\,')
    .replaceAll('(', '\\(')
    .replaceAll(')', '\\)')
    .replaceAll('.', '\\.')
}

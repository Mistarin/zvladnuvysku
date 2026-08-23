export function getStoragePublicUrl(bucket: string, path: string | null | undefined): string | null {
  if (!path) return null

  const encodedPath = path.split('/').map((segment) => encodeURIComponent(segment)).join('/')
  return `/api/storage/${encodeURIComponent(bucket)}/${encodedPath}`
}

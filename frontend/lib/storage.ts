export function getStoragePublicUrl(bucket: string, path: string | null | undefined): string | null {
  if (!path) return null
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) return null
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`
}

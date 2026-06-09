import type { SupabaseClient } from "@supabase/supabase-js";

export const STORAGE_SIGNED_URL_EXPIRES_SECONDS = 900;

type StorageClient = Pick<SupabaseClient, "storage">;

export async function createStorageSignedUrl(
  supabase: StorageClient,
  bucket: string,
  path: string | null | undefined,
  expiresIn = STORAGE_SIGNED_URL_EXPIRES_SECONDS,
): Promise<string | null> {
  if (!path) return null;

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) {
    console.error(`[storage] Failed to create signed URL for ${bucket}/${path}:`, error.message);
    return null;
  }

  return data?.signedUrl ?? null;
}

export async function createStorageSignedUrlMap(
  supabase: StorageClient,
  bucket: string,
  paths: Array<string | null | undefined>,
  expiresIn = STORAGE_SIGNED_URL_EXPIRES_SECONDS,
): Promise<Map<string, string>> {
  const uniquePaths = [...new Set(paths.filter((path): path is string => Boolean(path)))];
  const entries = await Promise.all(
    uniquePaths.map(async (path) => [path, await createStorageSignedUrl(supabase, bucket, path, expiresIn)] as const),
  );

  return new Map(entries.flatMap(([path, url]) => (url ? [[path, url] as const] : [])));
}

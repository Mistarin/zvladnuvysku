import "server-only";

import { createPublicServerClient } from "@/lib/supabase/public-server";
import { createStorageSignedUrl } from "@/lib/storage";

export async function findPublicMaterialByShareSlug(shareSlug: string) {
  const supabase = createPublicServerClient();
  const { data, error } = await supabase
    .from("subject_materials")
    .select("id, title, file_path, share_slug")
    .eq("share_slug", shareSlug)
    .eq("moderation_status", "approved")
    .maybeSingle();

  const material = data as {
    id: string;
    title: string;
    file_path: string;
    share_slug: string;
  } | null;

  if (error || !material) return null;

  return {
    id: material.id,
    title: material.title,
    share_slug: material.share_slug,
    publicUrl: await createStorageSignedUrl(supabase, "study_materials", material.file_path),
  };
}

export async function findPublicMaterialGroupByShareSlug(shareSlug: string) {
  const supabase = createPublicServerClient();
  const { data, error } = await supabase
    .from("material_groups")
    .select("id, title, share_slug")
    .eq("share_slug", shareSlug)
    .maybeSingle();

  const group = data as {
    id: string;
    title: string;
    share_slug: string;
  } | null;

  if (error || !group) return null;

  const { count, error: countError } = await supabase
    .from("subject_materials")
    .select("id", { count: "exact", head: true })
    .eq("group_id", group.id)
    .eq("moderation_status", "approved");

  if (countError || !count) return null;

  return {
    id: group.id,
    title: group.title,
    share_slug: group.share_slug,
  };
}

export async function findPublicDeckByShareSlug(shareSlug: string) {
  const supabase = createPublicServerClient();
  const { data, error } = await supabase
    .from("flashcard_decks")
    .select("id, title, share_slug")
    .eq("share_slug", shareSlug)
    .eq("is_public", true)
    .maybeSingle();

  const deck = data as {
    id: string;
    title: string;
    share_slug: string;
  } | null;

  if (error || !deck) return null;

  return deck;
}

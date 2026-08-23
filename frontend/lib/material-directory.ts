import "server-only";

import { unstable_cache } from "next/cache";
import { getStoragePublicUrl } from "@/lib/storage";
import {
  filterMaterialDirectoryGroups,
  filterMaterialDirectoryStandaloneMaterials,
  normalizeMaterialDirectorySearch,
} from "@/lib/material-directory-search";
import { createPublicServerClient } from "@/lib/supabase/public-server";

export type PublicMaterialGroupItem = {
  id: string;
  title: string;
  share_slug: string;
  file_path: string;
  size_bytes: number;
  page_count: number | null;
  created_at: string;
  moderation_status: "approved";
  public_url: string;
};

export type PublicMaterialGroupData = {
  id: string;
  title: string;
  share_slug: string;
  created_at: string;
  uploader_id: string;
  uploader_display_name: string | null;
  subject: {
    id: string;
    name: string;
    slug: string;
    short_tag: string;
    difficulty?: number | null;
    avg_subject_rating?: number | null;
    avg_teacher_rating?: number | null;
  } | null;
  materials: PublicMaterialGroupItem[];
};

export type PublicStandaloneMaterial = {
  id: string;
  title: string;
  share_slug: string;
  file_path: string;
  public_url: string;
  size_bytes: number;
  page_count: number | null;
  group_id: string | null;
  created_at: string;
  subject: {
    id: string;
    name: string;
    slug: string;
    short_tag: string;
    difficulty?: number | null;
    avg_subject_rating?: number | null;
    avg_teacher_rating?: number | null;
  } | null;
};

export type PublicApprovedMaterial = PublicStandaloneMaterial;

export type MaterialDirectorySearchResult =
  | {
      kind: "group";
      id: string;
      title: string;
      share_slug: string;
      created_at: string;
      uploader_display_name: string | null;
      subject: {
        id: string;
        name: string;
        slug: string;
        short_tag: string;
        difficulty?: number | null;
        avg_subject_rating?: number | null;
        avg_teacher_rating?: number | null;
      } | null;
      material_count: number;
    }
  | {
      kind: "material";
      id: string;
      title: string;
      share_slug: string;
      file_path: string;
      public_url: string;
      size_bytes: number;
      created_at: string;
      subject: {
        id: string;
        name: string;
        slug: string;
        short_tag: string;
        difficulty?: number | null;
        avg_subject_rating?: number | null;
        avg_teacher_rating?: number | null;
      } | null;
    };

type RawGroup = {
  id: string;
  title: string;
  share_slug: string;
  uploader_id: string;
  created_at: string;
  subject: { id: string; name: string; slug: string; short_tag: string } | null;
  materials: Array<{
    id: string;
    title: string;
    share_slug: string;
    file_path: string;
    size_bytes: number;
    page_count: number | null;
    created_at: string;
    moderation_status: "pending" | "approved" | "rejected";
  }> | null;
};

type Ranked<T> = {
  item: T;
  rank: number;
  startsWith: boolean;
  index: number;
  createdAt: number;
};

function getMatchDetails(candidate: string, normalizedQuery: string) {
  const normalizedCandidate = normalizeMaterialDirectorySearch(candidate);
  const index = normalizedCandidate.indexOf(normalizedQuery);
  if (index === -1) return null;

  return {
    startsWith: index === 0,
    index,
  };
}

function compareRanked<T>(left: Ranked<T>, right: Ranked<T>) {
  if (left.rank !== right.rank) return left.rank - right.rank;
  if (left.startsWith !== right.startsWith) return left.startsWith ? -1 : 1;
  if (left.index !== right.index) return left.index - right.index;
  return right.createdAt - left.createdAt;
}

async function loadUploaderMap(uploaderIds: string[]) {
  if (uploaderIds.length === 0) return {} as Record<string, string | null>;

  const supabase = createPublicServerClient();
  const { data } = await supabase
    .from("profiles")
    .select("user_id, display_name")
    .in("user_id", uploaderIds);

  return Object.fromEntries(
    ((data ?? []) as Array<{ user_id: string; display_name: string | null }>).map((profile) => [
      profile.user_id,
      profile.display_name,
    ]),
  );
}

async function loadPublicMaterialDirectorySnapshot() {
  const supabase = createPublicServerClient();

  const [{ data: rawGroups }, { data: rawMaterials }] = await Promise.all([
    supabase
      .from("material_groups")
      .select("id, title, share_slug, uploader_id, created_at, subject:subjects!material_groups_subject_id_fkey(id, name, slug, short_tag), materials:subject_materials!subject_materials_group_id_fkey(id, title, share_slug, file_path, size_bytes, page_count, created_at, moderation_status)")
      .order("created_at", { ascending: false })
      .limit(80),
    supabase
      .from("subject_materials")
      .select("id, title, share_slug, file_path, size_bytes, page_count, group_id, created_at, subject:subjects!subject_materials_subject_id_fkey(id, name, slug, short_tag)")
      .eq("moderation_status", "approved")
      .is("group_id", null)
      .order("created_at", { ascending: false })
      .limit(80),
  ]);

  const groups = (rawGroups ?? []) as unknown as RawGroup[];
  const subjectIds = [...new Set([
    ...groups.map((group) => group.subject?.id).filter(Boolean),
    ...((rawMaterials ?? []) as Array<{ subject: { id: string } | null }>).map((material) => material.subject?.id).filter(Boolean),
  ])] as string[];

  const subjectStatsMap = new Map<string, { difficulty: number | null; avg_subject_rating: number | null; avg_teacher_rating: number | null }>();
  if (subjectIds.length > 0) {
    const { data: subjectStatsRows } = await supabase
      .from("subject_search_view")
      .select("id, difficulty, avg_subject_rating, avg_teacher_rating")
      .in("id", subjectIds);

    for (const row of (subjectStatsRows ?? []) as Array<{
      id: string;
      difficulty: number | null;
      avg_subject_rating: number | null;
      avg_teacher_rating: number | null;
    }>) {
      subjectStatsMap.set(row.id, {
        difficulty: row.difficulty,
        avg_subject_rating: row.avg_subject_rating,
        avg_teacher_rating: row.avg_teacher_rating,
      });
    }
  }

  const hydrateSubject = <T extends { id: string; name: string; slug: string; short_tag: string } | null>(subject: T) => {
    if (!subject) return null;
    return {
      ...subject,
      ...subjectStatsMap.get(subject.id),
    };
  };

  const approvedGroups = groups
    .map((group) => ({
      id: group.id,
      title: group.title,
      share_slug: group.share_slug,
      created_at: group.created_at,
      uploader_id: group.uploader_id,
      subject: hydrateSubject(group.subject),
      materials: (group.materials ?? [])
        .filter((material) => material.moderation_status === "approved")
        .map((material) => ({
          ...material,
          moderation_status: "approved" as const,
          public_url: getStoragePublicUrl("study_materials", material.file_path) ?? "",
        })),
    }))
    .filter((group) => group.materials.length > 0);

  const uploaderMap = await loadUploaderMap([...new Set(approvedGroups.map((group) => group.uploader_id))]);

  const hydratedGroups: PublicMaterialGroupData[] = approvedGroups.map((group) => ({
    ...group,
    uploader_display_name: uploaderMap[group.uploader_id] ?? null,
  }));

  const standaloneMaterials: PublicStandaloneMaterial[] = ((rawMaterials ?? []) as Array<{
    id: string;
    title: string;
    share_slug: string;
    file_path: string;
    size_bytes: number;
    page_count: number | null;
    group_id: string | null;
    created_at: string;
    subject: { id: string; name: string; slug: string; short_tag: string } | null;
  }>).map((material) => ({
    ...material,
    subject: hydrateSubject(material.subject),
    public_url: getStoragePublicUrl("study_materials", material.file_path) ?? "",
  }));

  return {
    groups: hydratedGroups,
    standaloneMaterials,
  };
}

const getCachedPublicMaterialDirectorySnapshot = unstable_cache(
  async () => loadPublicMaterialDirectorySnapshot(),
  ["public-material-directory"],
  { revalidate: 300 }
);

export async function getPublicMaterialDirectorySnapshot() {
  return getCachedPublicMaterialDirectorySnapshot();
}

export async function getPublicMaterialDirectory(query = "", focusedGroupId?: string) {
  const { groups, standaloneMaterials } = await getCachedPublicMaterialDirectorySnapshot();

  return {
    groups: filterMaterialDirectoryGroups(groups, query, focusedGroupId),
    standaloneMaterials: filterMaterialDirectoryStandaloneMaterials(standaloneMaterials, query),
  };
}

export async function searchMaterialDirectory(query: string) {
  const { groups, standaloneMaterials } = await getPublicMaterialDirectory(query);

  const rankedGroups: MaterialDirectorySearchResult[] = groups.slice(0, 6).map((group) => ({
    kind: "group",
    id: group.id,
    title: group.title,
    share_slug: group.share_slug,
    created_at: group.created_at,
    uploader_display_name: group.uploader_display_name,
    subject: group.subject,
    material_count: group.materials.length,
  }));

  const rankedMaterials: MaterialDirectorySearchResult[] = standaloneMaterials.slice(0, 4).map((material) => ({
    kind: "material",
    id: material.id,
    title: material.title,
    share_slug: material.share_slug,
    file_path: material.file_path,
    public_url: material.public_url,
    size_bytes: material.size_bytes,
    created_at: material.created_at,
    subject: material.subject,
  }));

  return [...rankedGroups, ...rankedMaterials].slice(0, 8);
}

export async function searchApprovedMaterials(query: string) {
  const { groups, standaloneMaterials } = await getPublicMaterialDirectory(query);

  const groupedMaterials: PublicApprovedMaterial[] = groups.flatMap((group) =>
    group.materials.map((material) => ({
      id: material.id,
      title: material.title,
      share_slug: material.share_slug,
      file_path: material.file_path,
      public_url: material.public_url,
      size_bytes: material.size_bytes,
      page_count: material.page_count,
      group_id: group.id,
      created_at: material.created_at,
      subject: group.subject,
    })),
  );

  const allMaterials = [...groupedMaterials, ...standaloneMaterials];
  const normalizedQuery = normalizeMaterialDirectorySearch(query);

  if (!normalizedQuery) {
    return allMaterials
      .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
      .slice(0, 8);
  }

  return allMaterials
    .map((material): Ranked<PublicApprovedMaterial> | null => {
      const candidates = [
        { rank: 0, value: material.title },
        { rank: 1, value: material.subject?.name ?? "" },
        { rank: 1, value: material.subject?.short_tag ?? "" },
      ];

      const matches = candidates
        .map((candidate) => {
          const details = getMatchDetails(candidate.value, normalizedQuery);
          return details ? { ...details, rank: candidate.rank } : null;
        })
        .filter((candidate): candidate is { rank: number; startsWith: boolean; index: number } => Boolean(candidate))
        .sort((left, right) => {
          if (left.rank !== right.rank) return left.rank - right.rank;
          if (left.startsWith !== right.startsWith) return left.startsWith ? -1 : 1;
          return left.index - right.index;
        });

      if (matches.length === 0) return null;

      return {
        item: material,
        rank: matches[0].rank,
        startsWith: matches[0].startsWith,
        index: matches[0].index,
        createdAt: new Date(material.created_at).getTime(),
      };
    })
    .filter((item): item is Ranked<PublicApprovedMaterial> => Boolean(item))
    .sort(compareRanked)
    .map((item) => item.item)
    .slice(0, 8);
}

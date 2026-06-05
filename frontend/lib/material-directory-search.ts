export type MaterialDirectorySubject = {
  id: string;
  name: string;
  slug: string;
  short_tag: string;
  difficulty?: number | null;
  avg_subject_rating?: number | null;
  avg_teacher_rating?: number | null;
} | null;

export type SearchableMaterialDirectoryItem = {
  title: string;
  created_at: string;
  subject: MaterialDirectorySubject;
};

export type SearchableStandaloneMaterial = SearchableMaterialDirectoryItem;

export type SearchableMaterialGroup = SearchableMaterialDirectoryItem & {
  uploader_display_name: string | null;
  materials: Array<{
    title: string;
    created_at: string;
  }>;
};

type Ranked<T> = {
  item: T;
  rank: number;
  startsWith: boolean;
  index: number;
  createdAt: number;
};

export function normalizeMaterialDirectorySearch(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

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

export function filterMaterialDirectoryGroups<T extends SearchableMaterialGroup & { id: string }>(
  groups: T[],
  query = "",
  focusedGroupId?: string
) {
  const normalizedQuery = normalizeMaterialDirectorySearch(query);

  if (focusedGroupId) {
    return groups.filter((group) => group.id === focusedGroupId);
  }

  if (!normalizedQuery) {
    return groups;
  }

  return groups
    .map((group): Ranked<T> | null => {
      const candidates = [
        { rank: 0, value: group.title },
        { rank: 1, value: group.subject?.name ?? "" },
        { rank: 1, value: group.subject?.short_tag ?? "" },
        { rank: 2, value: group.uploader_display_name ?? "" },
        ...group.materials.map((material) => ({ rank: 3, value: material.title })),
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
        item: group,
        rank: matches[0].rank,
        startsWith: matches[0].startsWith,
        index: matches[0].index,
        createdAt: new Date(group.created_at).getTime(),
      };
    })
    .filter((item): item is Ranked<T> => Boolean(item))
    .sort(compareRanked)
    .map((item) => item.item);
}

export function filterMaterialDirectoryStandaloneMaterials<T extends SearchableStandaloneMaterial>(
  materials: T[],
  query = ""
) {
  const normalizedQuery = normalizeMaterialDirectorySearch(query);

  if (!normalizedQuery) {
    return materials;
  }

  return materials
    .map((material): Ranked<T> | null => {
      const candidates = [
        material.title,
        material.subject?.name ?? "",
        material.subject?.short_tag ?? "",
      ];

      const matches = candidates
        .map((candidate) => getMatchDetails(candidate, normalizedQuery))
        .filter((candidate): candidate is { startsWith: boolean; index: number } => Boolean(candidate))
        .sort((left, right) => {
          if (left.startsWith !== right.startsWith) return left.startsWith ? -1 : 1;
          return left.index - right.index;
        });

      if (matches.length === 0) return null;

      return {
        item: material,
        rank: 4,
        startsWith: matches[0].startsWith,
        index: matches[0].index,
        createdAt: new Date(material.created_at).getTime(),
      };
    })
    .filter((item): item is Ranked<T> => Boolean(item))
    .sort(compareRanked)
    .map((item) => item.item);
}

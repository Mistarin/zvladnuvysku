import { createClient } from "@/lib/supabase/server";
import { normalizeFacultyList } from "@/lib/public-profile-identity";
import type { Database } from "@/lib/types/database";
import type { FacultyCode } from "@/lib/faculties";

export interface PublicUserSummary {
  userId: string;
  displayName: string | null;
  faculty: FacultyCode | null;
  secondaryFaculty: FacultyCode | null;
  faculties: FacultyCode[];
  totalXp: number;
  level: number;
}

type SupabaseWithProfileSummariesRpc = Awaited<ReturnType<typeof createClient>> & {
  rpc: (
    fn: "get_public_profile_summaries",
    args: Database["public"]["Functions"]["get_public_profile_summaries"]["Args"]
  ) => Promise<{
    data: Database["public"]["Functions"]["get_public_profile_summaries"]["Returns"] | null;
    error: { message: string } | null;
  }>;
};

export async function getPublicUserSummaryMap(
  userIds: Array<string | null | undefined>,
  existingClient?: Awaited<ReturnType<typeof createClient>>,
): Promise<Record<string, PublicUserSummary>> {
  const uniqueUserIds = Array.from(new Set(userIds.filter((userId): userId is string => Boolean(userId))));
  if (uniqueUserIds.length === 0) {
    return {};
  }

  const supabase = (existingClient ?? await createClient()) as SupabaseWithProfileSummariesRpc;
  const { data, error } = await supabase.rpc("get_public_profile_summaries", {
    profile_user_ids: uniqueUserIds,
  });

  if (error) {
    console.error("Failed to load public user summaries:", error.message);
    return {};
  }

  return Object.fromEntries(
    (data ?? []).map((summary) => {
      const faculties = normalizeFacultyList([summary.faculty, summary.secondary_faculty]);

      return [
        summary.user_id,
        {
          userId: summary.user_id,
          displayName: summary.display_name,
          faculty: faculties[0] || null,
          secondaryFaculty: faculties[1] || null,
          faculties,
          totalXp: summary.total_xp,
          level: summary.level,
        } satisfies PublicUserSummary,
      ];
    }),
  );
}

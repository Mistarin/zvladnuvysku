import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProfileSubjectContributions, type ProfileDeckContribution, type ProfileMaterialContribution, type ProfileMaterialGroupContribution } from "@/components/profile/profile-subject-contributions";
import { getFacultyColor } from "@/lib/faculties";
import { normalizeFacultyList } from "@/lib/public-profile-identity";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database";
import { getStoragePublicUrl } from "@/lib/storage";

type PageProps = {
  params: Promise<{ userId: string }>;
};

type PublicProfileStats = {
  flashcard_count: number;
  material_count: number;
  subject_count: number;
  teacher_count: number;
  subject_comment_count: number;
  teacher_review_count: number;
  public_subject_comment_count: number;
  anon_subject_comment_count: number;
  public_teacher_review_count: number;
  anon_teacher_review_count: number;
  approved_score: number;
  total_xp: number;
  level: number;
  level_progress_xp: number;
  next_level_xp: number;
};

type PublicDeck = {
  id: string;
  title: string;
  share_slug: string;
  card_count: number;
  updated_at: string;
  subject: { slug: string; short_tag: string; name: string } | null;
};

type ApprovedMaterial = {
  id: string;
  title: string;
  share_slug: string;
  file_path: string;
  size_bytes: number;
  created_at: string;
  subject: { slug: string; short_tag: string; name: string } | null;
};

type ApprovedSubjectComment = {
  id: string;
  overall: number;
  comment: string;
  created_at: string;
  is_anonymous: boolean;
  subject: { slug: string; short_tag: string; name: string } | null;
};

type ApprovedTeacherReview = {
  id: string;
  rating: number | null;
  review: string;
  created_at: string;
  is_anonymous: boolean;
  teacher: { slug: string; name: string } | null;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { userId } = await params;
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, faculty, secondary_faculty")
    .eq("user_id", userId)
    .maybeSingle();

  const typedProfile = profile as { display_name?: string | null; faculty?: string | null; secondary_faculty?: string | null } | null;
  const displayName = typedProfile?.display_name?.trim();
  return {
    title: displayName ? `${displayName} | Profil` : "Profil uživatele",
  };
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { userId } = await params;
  const supabase = await createClient();
  const typedSupabase = supabase as typeof supabase & {
    rpc: (
      fn: "get_public_profile_stats",
      args: Database["public"]["Functions"]["get_public_profile_stats"]["Args"]
    ) => Promise<{
      data: Database["public"]["Functions"]["get_public_profile_stats"]["Returns"] | null;
      error: { message: string } | null;
    }>;
  };

  const [
    {
      data: { user: viewer },
    },
    { data: profile },
    { data: statsData, error: statsError },
    { data: decksData },
    { data: materialsData },
    { data: groupsData },
    { data: subjectCommentsData },
    { data: teacherReviewsData },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("profiles").select("user_id, display_name, faculty, secondary_faculty").eq("user_id", userId).maybeSingle(),
    typedSupabase.rpc("get_public_profile_stats", { profile_user_id: userId }),
    supabase
      .from("flashcard_decks")
      .select("id, title, share_slug, card_count, updated_at, subject:subject_id(slug, short_tag, name)")
      .eq("creator_id", userId)
      .eq("is_public", true)
      .order("updated_at", { ascending: false }),
    supabase
      .from("subject_materials")
      .select("id, title, share_slug, file_path, size_bytes, created_at, subject:subject_id(slug, short_tag, name)")
      .eq("uploader_id", userId)
      .eq("moderation_status", "approved")
      .is("group_id", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("material_groups")
      .select("id, title, share_slug, uploader_id, created_at, subject:subject_id(id, slug, short_tag, name), materials:subject_materials(id, title, share_slug, file_path, size_bytes, page_count, moderation_status)")
      .eq("uploader_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("public_subject_reviews")
      .select("id, overall, comment, created_at, is_anonymous, subject:subject_id(slug, short_tag, name)")
      .eq("author_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("public_teacher_reviews")
      .select("id, rating, review, created_at, is_anonymous, teacher:teacher_id(slug, name)")
      .eq("author_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const typedProfile = profile as { user_id: string; display_name: string | null; faculty: string | null; secondary_faculty: string | null } | null;
  const displayName = typedProfile?.display_name?.trim();
  const faculties = normalizeFacultyList([typedProfile?.faculty, typedProfile?.secondary_faculty]);
  const viewerRole = viewer?.app_metadata?.role as string | undefined;
  const canViewWithoutPublicName = viewer?.id === userId || viewerRole === "admin" || viewerRole === "moderator";
  const visibleName = displayName || (canViewWithoutPublicName ? `Uživatel ${userId.slice(0, 8)}…` : null);
  const isOwnProfile = viewer?.id === userId;

  if (!visibleName || statsError) {
    notFound();
  }

  const stats = ((statsData ?? [])[0] ?? null) as PublicProfileStats | null;
  const decks = (decksData ?? []) as PublicDeck[];
  const materials = (materialsData ?? []) as ApprovedMaterial[];
  const approvedGroups = ((groupsData ?? []) as Array<{
    id: string;
    title: string;
    share_slug: string;
    uploader_id: string;
    created_at: string;
    subject: { id: string; slug: string; short_tag: string; name: string } | null;
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
	  }>).map((group) => ({
    ...group,
    materials: (group.materials ?? [])
      .filter((material) => material.moderation_status === "approved")
      .map((material) => ({
        ...material,
        moderation_status: "approved" as const,
        public_url: getStoragePublicUrl("study_materials", material.file_path) ?? "",
      })),
  })).filter((group) => group.materials.length > 0);
  const profileDecks: ProfileDeckContribution[] = decks.map((deck) => ({
    id: deck.id,
    title: deck.title,
    share_slug: deck.share_slug,
    card_count: deck.card_count,
    subject: deck.subject,
  }));
  const profileMaterials: ProfileMaterialContribution[] = materials.map((material) => ({
    id: material.id,
    title: material.title,
    share_slug: material.share_slug,
    url: getStoragePublicUrl("study_materials", material.file_path),
    sizeLabel: `${(material.size_bytes / 1024 / 1024).toFixed(1)} MB`,
    subject: material.subject,
  }));
  const profileGroups: ProfileMaterialGroupContribution[] = approvedGroups.map((group) => ({
    id: group.id,
    title: group.title,
    share_slug: group.share_slug,
    created_at: group.created_at,
    uploader_id: group.uploader_id,
    uploader_display_name: displayName ?? null,
    subject: group.subject,
    materials: group.materials,
  }));
  const subjectComments = ((subjectCommentsData ?? []) as ApprovedSubjectComment[])
    .filter(c => isOwnProfile || !c.is_anonymous)
    .slice(0, 12);
  const teacherReviews = ((teacherReviewsData ?? []) as ApprovedTeacherReview[])
    .filter(r => isOwnProfile || !r.is_anonymous)
    .slice(0, 12);

  if (!stats) {
    notFound();
  }

  const progressPercent = Math.min(100, Math.round((stats.level_progress_xp / Math.max(stats.next_level_xp, 1)) * 100));

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <nav className="mb-5 flex items-center gap-2 text-sm text-[#8FA3B8]">
        <Link href="/" className="transition-colors hover:text-[#F4F8FB]">Domů</Link>
        <span>/</span>
        <span className="font-medium text-[#CBD7E6]">{visibleName}</span>
      </nav>

      <div className="mb-8 bg-[linear-gradient(180deg,#0D1B2E,#07111F)] p-2 sm:p-4">
        <div className="space-y-4">
          <div>
            <h1 className="text-4xl font-bold text-[#F4F8FB] sm:text-5xl">{visibleName}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-[#8FA3B8] sm:text-base">
              {faculties.map((faculty) => (
                <span
                  key={faculty}
                  className="rounded-md px-2.5 py-1 text-xs font-semibold"
                  style={{
                    backgroundColor: `${getFacultyColor(faculty) ?? "var(--foreground)"}18`,
                    color: getFacultyColor(faculty) ?? "var(--foreground)",
                  }}
                >
                  {faculty}
                </span>
              ))}
              <span className="text-sm font-medium text-[#F4F8FB]">Level {stats.level}</span>
            </div>
          </div>

          <div className="max-w-xl">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-[#F4F8FB]">{stats.level_progress_xp}/{stats.next_level_xp} XP</span>
              <span className="text-[#8FA3B8]">Zbývá {Math.max(stats.next_level_xp - stats.level_progress_xp, 0)} XP</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#13243A]">
              <div
                className="h-full rounded-full bg-[#02BED6] shadow-[0_0_18px_rgba(2,190,214,0.35)] transition-all duration-700"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            {isOwnProfile && (
              <Link
                href="/#hall-of-fame"
                className="mt-3 inline-flex text-xs font-medium text-[#8FA3B8] transition-colors hover:text-[#35D7E8]"
              >
                Body se převádějí na XP v poměru 1:10 →
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-8">
        <ProfileSubjectContributions
          decks={profileDecks}
          materials={profileMaterials}
          groups={profileGroups}
          subjectComments={subjectComments.map((comment) => ({
            id: comment.id,
            overall: comment.overall,
            comment: comment.comment,
            is_anonymous: comment.is_anonymous,
            subject: comment.subject,
          }))}
          teacherReviews={teacherReviews.map((review) => ({
            id: review.id,
            rating: review.rating,
            review: review.review,
            is_anonymous: review.is_anonymous,
            teacher: review.teacher,
          }))}
          isOwnProfile={isOwnProfile}
        />
      </div>
    </div>
  );
}

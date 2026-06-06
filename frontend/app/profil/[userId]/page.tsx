import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProfileSubjectContributions, type ProfileDeckContribution, type ProfileMaterialContribution, type ProfileMaterialGroupContribution } from "@/components/profile/profile-subject-contributions";
import { getFacultyColor } from "@/lib/faculties";
import { normalizeFacultyList } from "@/lib/public-profile-identity";
import { getTeacherPath } from "@/lib/teacher-slug";
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
      <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/" className="transition-colors hover:text-foreground">Domů</Link>
        <span>/</span>
        <span className="font-medium text-foreground">{visibleName}</span>
      </nav>

      {/* Profile header */}
      <div className="mb-8 glass-card rounded-[2rem] p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <span className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Veřejný profil
            </span>
            <div>
              <h1 className="text-3xl font-bold text-foreground sm:text-4xl">{visibleName}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground sm:text-base">
                {faculties.map((faculty) => (
                  <span
                    key={faculty}
                    className="rounded-full px-2.5 py-1 text-xs font-semibold"
                    style={{
                      backgroundColor: `${getFacultyColor(faculty) ?? "var(--foreground)"}20`,
                      color: getFacultyColor(faculty) ?? "var(--foreground)",
                    }}
                  >
                    {faculty}
                  </span>
                ))}
                <span className="text-sm">Level {stats.level} · {stats.total_xp} XP</span>
              </div>
            </div>
          </div>

          {/* XP progress */}
          <div className="w-full max-w-md rounded-[1.5rem] border border-white/5 bg-background/60 backdrop-blur-md p-5 space-y-3 shadow-inner">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">Progress do dalšího levelu</span>
              <span className="font-mono text-xs text-muted-foreground">{stats.level_progress_xp}<span className="text-muted-foreground/50">/{stats.next_level_xp}</span> XP</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted/70">
              <div
                className="h-full rounded-full bg-primary shadow-[0_0_12px_rgba(var(--primary-rgb,99,102,241),0.6)] transition-all duration-700"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            {isOwnProfile && (
              <Link
                href="/#hall-of-fame"
                className="inline-flex text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
              >
                Body se převádějí na XP v poměru 1:10 →
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        <SummaryCard icon="⚡" label="XP" value={String(stats.total_xp)} accent="primary" />
        <SummaryCard icon="🃏" label="Kartičky" value={String(stats.flashcard_count)} />
        <SummaryCard icon="📄" label="Materiály" value={String(stats.material_count)} />
        <SummaryCard
          icon="💬"
          label="Komentáře"
          value={String(stats.subject_comment_count + stats.teacher_review_count)}
          subLabel={`${stats.public_subject_comment_count + stats.public_teacher_review_count} veřejných · ${stats.anon_subject_comment_count + stats.anon_teacher_review_count} anonymních`}
        />
      </div>

      {/* Content sections */}
      <div className="space-y-8">
        <ProfileSubjectContributions decks={profileDecks} materials={profileMaterials} groups={profileGroups} />

        <div className="grid gap-8 lg:grid-cols-2">
          <ProfileSection title="💬 Komentáře k předmětům" empty="Zatím žádné schválené komentáře k předmětům.">
            {subjectComments.map((comment) => (
              <div key={comment.id} className="glass-card p-4 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold text-foreground text-sm">{comment.subject?.name ?? "Předmět"}</div>
                  <div className="flex items-center gap-2">
                    {comment.is_anonymous && isOwnProfile && (
                      <span className="text-[10px] font-medium bg-muted px-1.5 py-0.5 rounded text-muted-foreground">anon</span>
                    )}
                    <span className="text-sm font-bold text-amber-500">{comment.overall}/5 ★</span>
                  </div>
                </div>
                {comment.subject && (
                  <Link href={`/predmety/${comment.subject.slug}`} className="block text-xs text-primary/70 hover:text-primary transition-colors font-mono">
                    {comment.subject.short_tag} →
                  </Link>
                )}
                <p className="whitespace-pre-wrap text-sm text-foreground/80 italic leading-relaxed">&ldquo;{comment.comment}&rdquo;</p>
              </div>
            ))}
          </ProfileSection>

          <ProfileSection title="⭐ Hodnocení učitelů" empty="Zatím žádná schválená hodnocení učitelů.">
            {teacherReviews.map((review) => (
              <div key={review.id} className="glass-card p-4 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold text-foreground text-sm">{review.teacher?.name ?? "Vyučující"}</div>
                  <div className="flex items-center gap-2">
                    {review.is_anonymous && isOwnProfile && (
                      <span className="text-[10px] font-medium bg-muted px-1.5 py-0.5 rounded text-muted-foreground">anon</span>
                    )}
                    {review.rating ? <span className="text-sm font-bold text-amber-500">{review.rating}/5 ★</span> : null}
                  </div>
                </div>
                {review.teacher && (
                  <Link href={getTeacherPath(review.teacher.slug)} className="block text-xs text-primary/70 hover:text-primary transition-colors">
                    Detail vyučujícího →
                  </Link>
                )}
                {review.review && <p className="whitespace-pre-wrap text-sm text-foreground/80 italic leading-relaxed">&ldquo;{review.review}&rdquo;</p>}
              </div>
            ))}
          </ProfileSection>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ icon, label, value, subLabel, accent }: { icon?: string; label: string; value: string; subLabel?: string; accent?: string }) {
  return (
    <div className="glass-card p-4 space-y-2 hover:-translate-y-0.5 transition-transform">
      <div className="flex items-center gap-2">
        {icon && <span className="text-lg">{icon}</span>}
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      </div>
      <div className="flex flex-col">
        <span className={`text-2xl font-bold ${accent === 'primary' ? 'text-primary' : 'text-foreground'}`}>{value}</span>
        {subLabel && <span className="text-[11px] text-muted-foreground/70 mt-1 leading-tight">{subLabel}</span>}
      </div>
    </div>
  );
}

function ProfileSection({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: React.ReactNode[];
}) {
  const items = children.filter(Boolean);

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold text-foreground">{title}</h2>
      {items.length > 0 ? (
        <div className="space-y-3">{items}</div>
      ) : (
        <div className="rounded-[1.5rem] border-2 border-dashed border-white/10 bg-background/30 px-4 py-8 text-center text-sm text-muted-foreground">
          {empty}
        </div>
      )}
    </section>
  );
}

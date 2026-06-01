import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProfileSubjectContributions, type ProfileDeckContribution, type ProfileMaterialContribution } from "@/components/profile/profile-subject-contributions";
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
  subject_comment_count: number;
  teacher_review_count: number;
  approved_score: number;
  total_xp: number;
  level: number;
  level_progress_xp: number;
  next_level_xp: number;
};

type PublicDeck = {
  id: string;
  title: string;
  card_count: number;
  updated_at: string;
  subject: { slug: string; short_tag: string; name: string } | null;
};

type ApprovedMaterial = {
  id: string;
  title: string;
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
  subject: { slug: string; short_tag: string; name: string } | null;
};

type ApprovedTeacherReview = {
  id: string;
  rating: number | null;
  review: string;
  created_at: string;
  teacher: { slug: string; name: string } | null;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { userId } = await params;
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("user_id", userId)
    .maybeSingle();

  const typedProfile = profile as { display_name?: string | null } | null;
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
    { data: subjectCommentsData },
    { data: teacherReviewsData },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("profiles").select("user_id, display_name").eq("user_id", userId).maybeSingle(),
    typedSupabase.rpc("get_public_profile_stats", { profile_user_id: userId }),
    supabase
      .from("flashcard_decks")
      .select("id, title, card_count, updated_at, subject:subject_id(slug, short_tag, name)")
      .eq("creator_id", userId)
      .eq("is_public", true)
      .order("updated_at", { ascending: false }),
    supabase
      .from("subject_materials")
      .select("id, title, file_path, size_bytes, created_at, subject:subject_id(slug, short_tag, name)")
      .eq("uploader_id", userId)
      .eq("moderation_status", "approved")
      .order("created_at", { ascending: false }),
    supabase
      .from("subject_ratings")
      .select("id, overall, comment, created_at, subject:subject_id(slug, short_tag, name)")
      .eq("user_id", userId)
      .eq("comment_is_approved", true)
      .not("comment", "is", null)
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("teacher_ratings")
      .select("id, rating, review, created_at, teacher:teacher_id(slug, name)")
      .eq("user_id", userId)
      .eq("comment_is_approved", true)
      .not("review", "is", null)
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  const typedProfile = profile as { user_id: string; display_name: string | null } | null;
  const displayName = typedProfile?.display_name?.trim();
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
  const profileDecks: ProfileDeckContribution[] = decks.map((deck) => ({
    id: deck.id,
    title: deck.title,
    card_count: deck.card_count,
    subject: deck.subject,
  }));
  const profileMaterials: ProfileMaterialContribution[] = materials.map((material) => ({
    id: material.id,
    title: material.title,
    url: getStoragePublicUrl("study_materials", material.file_path),
    sizeLabel: `${(material.size_bytes / 1024 / 1024).toFixed(1)} MB`,
    subject: material.subject,
  }));
  const subjectComments = (subjectCommentsData ?? []) as ApprovedSubjectComment[];
  const teacherReviews = (teacherReviewsData ?? []) as ApprovedTeacherReview[];

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
      <div className="mb-8 rounded-[2rem] border border-border/70 bg-card p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <span className="inline-flex rounded-full border border-primary/20 bg-primary/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Veřejný profil
            </span>
            <div>
              <h1 className="text-3xl font-bold text-foreground sm:text-4xl">{visibleName}</h1>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                Level {stats.level} · {stats.total_xp} XP
              </p>
            </div>
          </div>

          {/* XP progress — no link to /prispevky */}
          <div className="w-full max-w-md rounded-3xl border border-border bg-background/70 p-5 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">Progress do dalšího levelu</span>
              <span className="text-muted-foreground">{stats.level_progress_xp}/{stats.next_level_xp} XP</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progressPercent}%` }} />
            </div>
            {isOwnProfile && (
              <Link
                href="/#hall-of-fame"
                className="inline-flex text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Každý schválený bod přidává 10 XP →
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Stats grid — no duplicate Level */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        <SummaryCard label="XP" value={String(stats.total_xp)} />
        <SummaryCard label="Kartičky" value={String(stats.flashcard_count)} />
        <SummaryCard label="Materiály" value={String(stats.material_count)} />
        <SummaryCard label="Komentáře" value={String(stats.subject_comment_count + stats.teacher_review_count)} />
      </div>

      {/* Content sections */}
      <div className="grid gap-8 xl:grid-cols-2">
        <ProfileSubjectContributions decks={profileDecks} materials={profileMaterials} />

        <ProfileSection title="Komentáře k předmětům" empty="Zatím žádné schválené komentáře k předmětům.">
          {subjectComments.map((comment) => (
            <div key={comment.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="font-semibold text-foreground">{comment.subject?.name ?? "Předmět"}</div>
                <span className="text-sm font-bold text-amber-500">{comment.overall}/5 ★</span>
              </div>
              {comment.subject && (
                <Link href={`/predmety/${comment.subject.slug}`} className="mt-1 block text-xs text-muted-foreground hover:text-foreground">
                  {comment.subject.short_tag}
                </Link>
              )}
              <p className="mt-3 whitespace-pre-wrap text-sm text-foreground/90">{comment.comment}</p>
            </div>
          ))}
        </ProfileSection>

        <ProfileSection title="Hodnocení učitelů" empty="Zatím žádná schválená hodnocení učitelů.">
          {teacherReviews.map((review) => (
            <div key={review.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="font-semibold text-foreground">{review.teacher?.name ?? "Vyučující"}</div>
                {review.rating ? <span className="text-sm font-bold text-amber-500">{review.rating}/5 ★</span> : null}
              </div>
              {review.teacher && (
                <Link href={`/ucitele/${review.teacher.slug}`} className="mt-1 block text-xs text-muted-foreground hover:text-foreground">
                  Detail vyučujícího
                </Link>
              )}
              <p className="mt-3 whitespace-pre-wrap text-sm text-foreground/90">{review.review}</p>
            </div>
          ))}
        </ProfileSection>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
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
      <h2 className="text-xl font-bold text-foreground">{title}</h2>
      {items.length > 0 ? (
        <div className="space-y-3">{items}</div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-background/40 px-4 py-8 text-center text-sm text-muted-foreground">
          {empty}
        </div>
      )}
    </section>
  );
}

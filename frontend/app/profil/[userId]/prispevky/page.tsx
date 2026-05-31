import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPublicProfilePath } from "@/lib/public-profile";
import type { Database } from "@/lib/types/database";
import { getStoragePublicUrl } from "@/lib/storage";

type PageProps = {
  params: Promise<{ userId: string }>;
};

type PublicSubjectProposal = {
  proposal_id: string;
  proposal_type: "new" | "edit";
  created_at: string;
  subject_name: string;
  subject_short_tag: string | null;
  subject_slug: string | null;
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
  const { data } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("user_id", userId)
    .maybeSingle();

  const displayName = (data as { display_name?: string | null } | null)?.display_name?.trim();
  return {
    title: displayName ? `${displayName} | Příspěvky` : "Veřejné příspěvky",
  };
}

export default async function PublicProfileContributionsPage({ params }: PageProps) {
  const { userId } = await params;
  const supabase = await createClient();
  const typedSupabase = supabase as typeof supabase & {
    rpc: (
      fn: "get_public_profile_subject_proposals",
      args: Database["public"]["Functions"]["get_public_profile_subject_proposals"]["Args"]
    ) => Promise<{
      data: Database["public"]["Functions"]["get_public_profile_subject_proposals"]["Returns"] | null;
      error: { message: string } | null;
    }>;
  };

  const [
    { data: profileData },
    { data: decksData },
    { data: materialsData },
    { data: subjectCommentsData },
    { data: teacherReviewsData },
    { data: proposalsData },
  ] = await Promise.all([
    supabase.from("profiles").select("user_id, display_name").eq("user_id", userId).maybeSingle(),
    supabase
      .from("flashcard_decks")
      .select("id, title, card_count, updated_at, subject:subject_id(slug, short_tag, name)")
      .eq("creator_id", userId)
      .eq("is_public", true)
      .order("updated_at", { ascending: false })
      .limit(30),
    supabase
      .from("subject_materials")
      .select("id, title, file_path, size_bytes, created_at, subject:subject_id(slug, short_tag, name)")
      .eq("uploader_id", userId)
      .eq("moderation_status", "approved")
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("subject_ratings")
      .select("id, overall, comment, created_at, subject:subject_id(slug, short_tag, name)")
      .eq("user_id", userId)
      .eq("comment_is_approved", true)
      .not("comment", "is", null)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("teacher_ratings")
      .select("id, rating, review, created_at, teacher:teacher_id(slug, name)")
      .eq("user_id", userId)
      .eq("comment_is_approved", true)
      .not("review", "is", null)
      .order("created_at", { ascending: false })
      .limit(30),
    typedSupabase.rpc("get_public_profile_subject_proposals", {
      profile_user_id: userId,
      entry_limit: 30,
    }),
  ]);

  const profile = profileData as { user_id: string; display_name: string | null } | null;
  const displayName = profile?.display_name?.trim();

  if (!displayName) {
    notFound();
  }

  const decks = (decksData ?? []) as PublicDeck[];
  const materials = (materialsData ?? []) as ApprovedMaterial[];
  const subjectComments = (subjectCommentsData ?? []) as ApprovedSubjectComment[];
  const teacherReviews = (teacherReviewsData ?? []) as ApprovedTeacherReview[];
  const proposals = (proposalsData ?? []) as PublicSubjectProposal[];

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/" className="transition-colors hover:text-foreground">Domů</Link>
        <span>/</span>
        <Link href={getPublicProfilePath(userId)} className="transition-colors hover:text-foreground">{displayName}</Link>
        <span>/</span>
        <span className="font-medium text-foreground">Příspěvky</span>
      </nav>

      <div className="mb-8 flex flex-col gap-4 rounded-[2rem] border border-border/70 bg-card p-6 shadow-sm sm:flex-row sm:items-end sm:justify-between sm:p-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Veřejné příspěvky</p>
          <h1 className="mt-2 text-3xl font-bold text-foreground sm:text-4xl">{displayName}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Veřejné balíčky, schválené materiály, komentáře, hodnocení a návrhy předmětů.
          </p>
        </div>
        <Link
          href={getPublicProfilePath(userId)}
          className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          Zpět na profil
        </Link>
      </div>

      <div className="grid gap-8 xl:grid-cols-2">
        <ProfileSection title="Návrhy předmětů" empty="Zatím žádné veřejně viditelné schválené návrhy předmětů.">
          {proposals.map((proposal) => (
            <div key={proposal.proposal_id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">{proposal.subject_name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {proposal.proposal_type === "new" ? "Nový předmět" : "Úprava předmětu"} · {new Date(proposal.created_at).toLocaleDateString("cs-CZ")}
                  </p>
                  {proposal.subject_slug && (
                    <Link href={`/predmety/${proposal.subject_slug}`} className="mt-2 inline-block text-xs text-primary hover:underline">
                      Otevřít předmět
                    </Link>
                  )}
                </div>
                {proposal.subject_short_tag ? (
                  <span className="rounded-lg bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                    {proposal.subject_short_tag}
                  </span>
                ) : null}
              </div>
            </div>
          ))}
        </ProfileSection>

        <ProfileSection title="Veřejné balíčky kartiček" empty="Zatím žádné veřejné balíčky.">
          {decks.map((deck) => (
            <div key={deck.id} className="rounded-2xl border border-border bg-card p-4">
              <Link href={`/flashcardy/${deck.id}`} className="font-semibold text-foreground hover:text-primary">
                {deck.title}
              </Link>
              <p className="mt-1 text-sm text-muted-foreground">{deck.card_count} karet</p>
              {deck.subject && (
                <Link href={`/predmety/${deck.subject.slug}`} className="mt-1 block text-xs text-muted-foreground hover:text-foreground">
                  {deck.subject.short_tag} · {deck.subject.name}
                </Link>
              )}
            </div>
          ))}
        </ProfileSection>

        <ProfileSection title="Schválené materiály" empty="Zatím žádné schválené materiály.">
          {materials.map((material) => (
            <div key={material.id} className="rounded-2xl border border-border bg-card p-4">
              <a
                href={getStoragePublicUrl("study_materials", material.file_path) ?? ""}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-foreground hover:text-primary"
              >
                {material.title}
              </a>
              <p className="mt-1 text-sm text-muted-foreground">
                {(material.size_bytes / 1024 / 1024).toFixed(1)} MB
              </p>
              {material.subject && (
                <Link href={`/predmety/${material.subject.slug}`} className="mt-1 block text-xs text-muted-foreground hover:text-foreground">
                  {material.subject.short_tag} · {material.subject.name}
                </Link>
              )}
            </div>
          ))}
        </ProfileSection>

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

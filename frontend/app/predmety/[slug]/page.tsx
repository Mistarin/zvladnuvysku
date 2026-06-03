import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DifficultyBadge } from "@/components/subject/difficulty-badge";
import { RatingForm } from "@/components/subject/rating-form";
import { RatingStats } from "@/components/subject/rating-stats";
import { MaterialUploadForm } from "@/components/subject/material-upload-form";
import { ReportIssueDialog } from "@/components/feedback/report-issue-dialog";
import { ShareLinkButton } from "@/components/share/share-link-button";
import { PublicUserLink } from "@/components/profile/public-user-link";
import { SubjectTabs, type Tab as SubjectTab } from "@/components/subject/subject-tabs";
import { getPublicProfileIdentity, hasPublicProfileIdentity } from "@/lib/public-profile-identity";
import { getTeacherPath } from "@/lib/teacher-slug";
import { getPublicUserSummaryMap } from "@/lib/public-user-summaries";
import { getSharePath } from "@/lib/share-links";
import type { Database, Subject, SubjectRatingStats } from "@/lib/types/database";
import { BookOpen, Target, MessageSquare, Star, Users, Layers, FileText, CheckCircle2, XCircle, Clock, Calendar, Diamond } from "lucide-react";
import { formatCredits } from "@/lib/utils";
import { getStoragePublicUrl } from "@/lib/storage";
import { TeacherRateToggle } from "@/components/teacher/teacher-rate-toggle";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ tab?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("subjects")
    .select("name, description")
    .eq("slug", slug)
    .single();

  if (!data) return { title: "Předmět nenalezen" };

  const subject = data as Pick<Subject, "name" | "description">;
  return {
    title: subject.name,
    description: subject.description || `Detail předmětu ${subject.name} na Ostravské univerzitě.`,
  };
}

const SEMESTER_LABELS: Record<string, string> = {
  zimní: "Zimní semestr",
  letní: "Letní semestr",
  oba: "Oba semestry",
};

type TeacherStats = {
  avg_rating: number | null;
  total_ratings?: number | null;
};

type SubjectTeacherListItem = Pick<Database["public"]["Tables"]["teachers"]["Row"], "id" | "slug" | "name" | "faculty"> & {
  teacher_rating_stats: TeacherStats[] | TeacherStats | null;
};

type SubjectTeacherJoinRow = {
  teachers: SubjectTeacherListItem | SubjectTeacherListItem[] | null;
};

type SubjectMaterialListItem = Pick<
  Database["public"]["Tables"]["subject_materials"]["Row"],
  "id" | "title" | "share_slug" | "file_path" | "size_bytes" | "created_at"
>;

type SubjectComment = Pick<
  Database["public"]["Tables"]["public_subject_reviews"]["Row"],
  "id" | "created_at" | "comment" | "author_user_id" | "is_anonymous"
> & {
  overall: number;
};

export default async function PredmetDetailPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const supabase = await createClient();

  const [
    { data, error },
    {
      data: { user },
    },
  ] = await Promise.all([
    supabase.from("subjects").select("*").eq("slug", slug).single(),
    supabase.auth.getUser(),
  ]);

  if (error || !data) {
    notFound();
  }

  const subject = data as Subject;
  const { data: subjectRatingStatsData } = await supabase
    .from("subject_rating_stats")
    .select("avg_difficulty, total_ratings")
    .eq("subject_id", subject.id)
    .maybeSingle();

  const subjectRatingStats = subjectRatingStatsData as Pick<SubjectRatingStats, "avg_difficulty" | "total_ratings"> | null;
  const isLoggedIn = Boolean(user);
  const profile = user
    ? (
        await supabase
          .from("profiles")
          .select("display_name, faculty")
          .eq("user_id", user.id)
          .maybeSingle()
      ).data ?? null
    : null;
  const hasPublicIdentity = hasPublicProfileIdentity(profile);
  const publicIdentity = getPublicProfileIdentity(profile);
  const activeTab: SubjectTab =
    resolvedSearchParams.tab === "recenze" || resolvedSearchParams.tab === "materialy"
      ? resolvedSearchParams.tab
      : "prehled";

  // Fetch counts for tab badges
  const [{ count: reviewCount }, { count: materialCount }, { count: deckCount }] = await Promise.all([
    supabase
      .from('public_subject_reviews')
      .select('*', { count: 'exact', head: true })
      .eq('subject_id', subject.id),
    supabase
      .from('subject_materials')
      .select('*', { count: 'exact', head: true })
      .eq('subject_id', subject.id)
      .eq('moderation_status', 'approved'),
    supabase
      .from('flashcard_decks')
      .select('*', { count: 'exact', head: true })
      .eq('subject_id', subject.id)
      .eq('is_public', true),
  ]);

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground" aria-label="Drobečková navigace">
        <Link href="/" className="transition-colors hover:text-foreground">Domů</Link>
        <span>/</span>
        <Link href="/predmety" className="transition-colors hover:text-foreground">Předměty</Link>
        <span>/</span>
        <span className="truncate font-medium text-foreground">{subject.name}</span>
      </nav>

      <div className="mb-6 space-y-4">
        <h1 className="text-3xl font-bold text-foreground sm:text-4xl">{subject.name}</h1>
        <SubjectMeta
          subject={subject}
          averageDifficulty={subjectRatingStats?.total_ratings ? subjectRatingStats.avg_difficulty : null}
        />
      </div>

      <SubjectTabs
        basePath={`/predmety/${slug}`}
        activeTab={activeTab}
        reviewCount={reviewCount ?? 0}
        materialCount={materialCount ?? 0}
        deckCount={deckCount ?? 0}
      />

      <div
        role="tabpanel"
        id={`panel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
        className="animate-fade-in"
      >
        {activeTab === "prehled" ? (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              {subject.description && (
                <TextSection title="O předmětu" icon={<BookOpen className="h-5 w-5 text-blue-500" />}>
                  {subject.description}
                </TextSection>
              )}
              {subject.target_audience && (
                <TextSection title="Pro koho je předmět" icon={<Target className="h-5 w-5 text-emerald-500" />}>
                  {subject.target_audience}
                </TextSection>
              )}
              {subject.real_requirements && (
                <div className="space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <h2 className="flex items-center gap-2 border-b border-primary/10 pb-2 text-sm font-bold uppercase tracking-wide text-primary">
                    <MessageSquare className="h-4 w-4" /> Reálné požadavky od studentů
                  </h2>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{subject.real_requirements}</p>
                </div>
              )}
              {!subject.description && !subject.target_audience && !subject.real_requirements && (
                <p className="text-sm italic text-muted-foreground">Zatím žádný popis. Pomoz ho doplnit!</p>
              )}
            </div>
            <Suspense fallback={<SidebarSkeleton />}>
              <SubjectSidebarSection
                subjectId={subject.id}
                slug={slug}
                isLoggedIn={isLoggedIn}
                hasPublicProfileIdentity={hasPublicIdentity}
                initialDisplayName={publicIdentity.displayName}
                initialFaculty={publicIdentity.faculty}
              />
            </Suspense>
          </div>
        ) : activeTab === "recenze" ? (
          <Suspense fallback={<RatingsSectionSkeleton />}>
            <SubjectRatingsSection
              subject={subject}
              isLoggedIn={isLoggedIn}
              hasPublicProfileIdentity={hasPublicIdentity}
              initialDisplayName={publicIdentity.displayName}
              initialFaculty={publicIdentity.faculty}
            />
          </Suspense>
        ) : (
          <Suspense fallback={<MaterialsSectionSkeleton isLoggedIn={isLoggedIn} />}>
            <SubjectMaterialsSection
              subject={subject}
              isLoggedIn={isLoggedIn}
              hasPublicProfileIdentity={hasPublicIdentity}
              initialDisplayName={publicIdentity.displayName}
              initialFaculty={publicIdentity.faculty}
            />
          </Suspense>
        )}
      </div>

      <div className="mt-8 border-t border-white/5 pt-6">
        <Link href="/predmety" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
          ← Zpět na předměty
        </Link>
      </div>
    </div>
  );
}

async function SubjectRatingsSection({
  subject,
  isLoggedIn,
  hasPublicProfileIdentity,
  initialDisplayName,
  initialFaculty,
}: {
  subject: Subject;
  isLoggedIn: boolean;
  hasPublicProfileIdentity: boolean;
  initialDisplayName: string;
  initialFaculty: string | null;
}) {
  const supabase = await createClient();
  const [{ data: rawRatings }, { data: ratingStatsData }] = await Promise.all([
    supabase
      .from("public_subject_reviews")
      .select("id, overall, comment, created_at, author_user_id, is_anonymous")
      .eq("subject_id", subject.id)
      .order("created_at", { ascending: false }),
    supabase.from("subject_rating_stats").select("*").eq("subject_id", subject.id).single(),
  ]);

  const ratingsWithComments = (rawRatings ?? []) as SubjectComment[];
  const reviewerSummaries = await getPublicUserSummaryMap(
    ratingsWithComments.map((rating) => rating.author_user_id).filter((value): value is string => Boolean(value)),
    supabase,
  );
  const ratingStats = ratingStatsData as SubjectRatingStats | null;
  const totalRatings = ratingStats?.total_ratings ?? 0;

  return (
    <>
      <div className="space-y-6">
        <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
          <Star className="h-6 w-6 text-amber-500" /> Hodnocení předmětu
        </h2>
        <RatingStats stats={ratingStats} totalRatings={totalRatings} />
        <div className="rounded-[2rem] border border-white/5 bg-card/40 backdrop-blur-md p-5 shadow-sm sm:p-8">
          <RatingForm
            key={subject.id}
            subjectId={subject.id}
            isLoggedIn={isLoggedIn}
            hasPublicProfileIdentity={hasPublicProfileIdentity}
            initialDisplayName={initialDisplayName}
            initialFaculty={initialFaculty}
          />
        </div>
      </div>

      {ratingsWithComments.length > 0 && (
        <div className="space-y-4 pt-4">
          <h3 className="flex items-center gap-2 border-b border-white/5 pb-2 text-lg font-bold text-foreground">
            <MessageSquare className="h-5 w-5 text-indigo-500" /> Zkušenosti studentů
          </h3>
          <div className="space-y-4">
            {ratingsWithComments.map((rating) => (
              <div key={rating.id} className="glass-card space-y-2 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {rating.author_user_id ? (
                      <PublicUserLink
                        userId={rating.author_user_id}
                        summary={reviewerSummaries[rating.author_user_id] ?? null}
                        fallbackLabel="Student"
                      />
                    ) : (
                      <span className="text-sm text-muted-foreground">Anonymní recenze</span>
                    )}
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">{new Date(rating.created_at).toLocaleDateString("cs-CZ")}</span>
                  </div>
                  {rating.overall && <div className="text-sm font-bold text-amber-500">{rating.overall}/5 ★</div>}
                </div>
                <p className="text-sm italic leading-relaxed text-foreground/90">&ldquo;{rating.comment}&rdquo;</p>
                <div className="pt-2">
                  <ReportIssueDialog sourceType="subject_rating" sourceId={rating.id} sourceLabel={`Komentář u předmětu ${subject.name}`} compact />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

async function SubjectSidebarSection({
  subjectId,
  slug,
  isLoggedIn,
  hasPublicProfileIdentity,
  initialDisplayName,
  initialFaculty,
}: {
  subjectId: string;
  slug: string;
  isLoggedIn: boolean;
  hasPublicProfileIdentity: boolean;
  initialDisplayName: string;
  initialFaculty: string | null;
}) {
  const supabase = await createClient();
  const [{ data: stData }, { count: deckCount }] = await Promise.all([
    supabase
      .from("subject_teachers")
      .select("teachers(id, slug, name, faculty, teacher_rating_stats(avg_rating, total_ratings))")
      .eq("subject_id", subjectId),
    supabase.from("flashcard_decks").select("*", { count: "exact", head: true }).eq("subject_id", subjectId).eq("is_public", true),
  ]);

  const teacherRows = (stData ?? []) as SubjectTeacherJoinRow[];
  const teachers = teacherRows.flatMap((row) => (!row.teachers ? [] : Array.isArray(row.teachers) ? row.teachers : [row.teachers]));

  return (
    <div className="space-y-6">
      {teachers.length > 0 && (
        <div className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <Users className="h-5 w-5 text-purple-500" /> Vyučující
          </h2>
          <div className="flex flex-col gap-3">
            {teachers.map((teacher) => {
              const stats = Array.isArray(teacher.teacher_rating_stats) ? teacher.teacher_rating_stats[0] : teacher.teacher_rating_stats;
              const avgRating = stats?.avg_rating;
              const ratingCount = stats?.total_ratings ?? 0;
              return (
                <div key={teacher.id} className="flex flex-col gap-2 glass-card p-5 hover:shadow-md transition-shadow group/card">
                  <Link href={getTeacherPath(teacher.slug)} className="group flex flex-col">
                    <span className="font-medium text-foreground transition-colors group-hover:text-primary">{teacher.name}</span>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-xs uppercase tracking-wider text-muted-foreground">{teacher.faculty}</span>
                      {avgRating ? (
                        <span className="flex items-center gap-1 text-sm font-bold text-amber-500">
                          {avgRating.toFixed(1)} ★
                          <span className="ml-0.5 text-[10px] font-normal text-muted-foreground">({ratingCount})</span>
                        </span>
                      ) : (
                        <span className="text-xs italic text-muted-foreground">Zatím nehodnoceno</span>
                      )}
                    </div>
                  </Link>
                  <TeacherRateToggle
                    teacherId={teacher.id}
                    isLoggedIn={isLoggedIn}
                    hasPublicProfileIdentity={hasPublicProfileIdentity}
                    initialDisplayName={initialDisplayName}
                    initialFaculty={initialFaculty}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
          <Layers className="h-5 w-5 text-rose-500" /> Kartičky
        </h2>
        <div className="space-y-4 glass-card p-5">
          {isLoggedIn ? (
            <>
              <p className="text-sm text-muted-foreground">
                {deckCount ? `K dispozici: ${deckCount} balíčků` : "Zatím žádné kartičky. Buďte první!"}
              </p>
              <div className="flex flex-col gap-2">
                <Link href={`/predmety/${slug}/flashcardy`} className="w-full rounded-lg accent-gradient py-2 text-center text-sm font-medium text-white transition-all hover:opacity-90">
                  Procházet kartičky
                </Link>
                <Link href={`/flashcardy/novy?subject=${slug}`} className="w-full rounded-xl border border-white/5 bg-background/50 shadow-inner py-2.5 text-center text-sm font-medium text-muted-foreground transition-all hover:bg-muted/50 hover:text-foreground">
                  + Vytvořit balíček
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">Přihlaste se pro přístup k flashkartám.</p>
              <Link href="/prihlaseni" className="block w-full rounded-lg accent-gradient py-2 text-center text-sm font-medium text-white transition-all hover:opacity-90">
                Přihlásit se
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

async function SubjectMaterialsSection({
  subject,
  isLoggedIn,
  hasPublicProfileIdentity,
  initialDisplayName,
  initialFaculty,
}: {
  subject: Subject;
  isLoggedIn: boolean;
  hasPublicProfileIdentity: boolean;
  initialDisplayName: string;
  initialFaculty: string | null;
}) {
  const supabase = await createClient();
  const { data: materialsData, error } = await supabase
    .from("subject_materials")
    .select("id, title, share_slug, file_path, size_bytes, created_at")
    .eq("subject_id", subject.id)
    .eq("moderation_status", "approved")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching materials:", error);
  }

  const materials = (materialsData ?? []) as SubjectMaterialListItem[];

  return (
    <div className="space-y-4">
      <h2 className="mb-4 flex items-center gap-2 border-b border-white/5 pb-3 text-xl font-bold text-foreground">
        <FileText className="h-6 w-6 text-sky-500" /> Studijní materiály (PDF)
      </h2>

      {materials.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {materials.map((material) => (
            <div key={material.id} className="glass-card p-4 transition-all hover:-translate-y-1 hover:shadow-md hover:border-primary/40">
              <div className="flex items-start gap-3">
                <a href={getStoragePublicUrl("study_materials", material.file_path) ?? ""} target="_blank" rel="noopener noreferrer" className="group flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex-shrink-0">
                    <FileText className="h-8 w-8 text-sky-500/80 transition-colors group-hover:text-sky-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground transition-colors group-hover:text-primary">{material.title}</div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-primary/80">PDF</span>
                      <span className="truncate text-xs text-muted-foreground">{(material.size_bytes / 1024 / 1024).toFixed(1)} MB</span>
                    </div>
                  </div>
                </a>
                <ShareLinkButton
                  path={getSharePath("material", material.share_slug)}
                  copiedLabel="Zkopírováno"
                  className="shrink-0 px-2 py-1.5"
                />
              </div>
              <div className="mt-2 flex items-center justify-end gap-2">
                <ReportIssueDialog sourceType="material" sourceId={material.id} sourceLabel={`Materiál ${material.title} u předmětu ${subject.name}`} compact />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm italic text-muted-foreground">Zatím nebyly nahrány žádné materiály.</p>
      )}

      <div className="max-w-xl pt-4">
        {isLoggedIn ? (
          <MaterialUploadForm
            key={subject.id}
            subjectId={subject.id}
            hasPublicProfileIdentity={hasPublicProfileIdentity}
            initialDisplayName={initialDisplayName}
            initialFaculty={initialFaculty}
          />
        ) : (
          <div className="rounded-[1.5rem] border-2 border-dashed border-white/10 bg-background/40 p-6 text-center">
            <p className="text-sm text-muted-foreground">Pro nahrání materiálu se musíš přihlásit.</p>
            <Link href="/prihlaseni" className="mt-3 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
              Přihlásit se
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function SubjectMeta({
  subject,
  averageDifficulty,
}: {
  subject: Subject;
  averageDifficulty: number | null;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="rounded-lg bg-primary/10 px-2 py-1 font-mono text-sm font-bold text-primary/80">{subject.short_tag}</span>
      {(subject.faculty || subject.department) && <span className="rounded-lg bg-muted/50 px-2 py-1 text-sm text-muted-foreground">{[subject.faculty, subject.department].filter(Boolean).join(" · ")}</span>}
      {subject.credits && <span className="flex items-center gap-1.5 rounded-lg bg-blue-500/10 px-2.5 py-1 text-sm font-medium text-blue-600 dark:text-blue-400"><Diamond className="h-3.5 w-3.5" /> {formatCredits(subject.credits)}</span>}
      {(averageDifficulty || subject.time_intensity) && (
        <div className="inline-flex flex-wrap overflow-hidden rounded-lg border border-white/5 shadow-inner bg-card/70">
          {averageDifficulty && (
            <div className="flex items-center gap-2 px-2.5 py-1 text-sm">
              <DifficultyBadge difficulty={averageDifficulty} size="lg" showLabel />
            </div>
          )}
          {subject.time_intensity && (
            <div className={`flex items-center gap-1.5 bg-purple-500/5 px-2.5 py-1 text-sm font-medium text-purple-600 dark:text-purple-400 whitespace-nowrap ${averageDifficulty ? "border-l border-white/5" : ""}`}>
              <Clock className="h-3.5 w-3.5" /> Časová náročnost: {subject.time_intensity}/5
            </div>
          )}
        </div>
      )}
      {renderAttendance(subject.attendance_type)}
      {subject.semester && <span className="rounded-lg bg-slate-500/10 px-2.5 py-1 text-sm font-medium text-slate-600 dark:text-slate-400">{SEMESTER_LABELS[subject.semester] || subject.semester}</span>}
      {subject.year && <span className="flex items-center gap-1.5 rounded-lg bg-indigo-500/10 px-2.5 py-1 text-sm font-medium text-indigo-600 dark:text-indigo-400"><Calendar className="h-3.5 w-3.5" /> {subject.year}. ročník</span>}
      {subject.exam_from_home && <span className="flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-sm font-medium text-emerald-600 dark:text-emerald-400">🏠 Z domova</span>}
    </div>
  );
}

function TextSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h2 className="flex items-center gap-2 border-b border-white/5 pb-2 text-lg font-bold text-foreground">
        {icon} {title}
      </h2>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{children}</p>
    </div>
  );
}

function renderAttendance(type: string | null) {
  if (!type) return null;
  let text = type;
  let Icon = CheckCircle2;
  let bg = "bg-muted";
  let color = "text-muted-foreground";

  if (type === "volná") { text = "Volná"; Icon = CheckCircle2; bg = "bg-emerald-500/10"; color = "text-emerald-600 dark:text-emerald-400"; }
  else if (type === "povinná") { text = "Povinná"; Icon = XCircle; bg = "bg-red-500/10"; color = "text-red-600 dark:text-red-400"; }
  else if (type === "povinné přednášky") { text = "Přednášky"; Icon = Target; bg = "bg-orange-500/10"; color = "text-orange-600 dark:text-orange-400"; }
  else if (type === "povinná cvičení") { text = "Cvičení"; Icon = Target; bg = "bg-amber-500/10"; color = "text-amber-600 dark:text-amber-400"; }

  return <span className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-medium ${bg} ${color}`}><Icon className="h-3.5 w-3.5" /> {text}</span>;
}

function RatingsSectionSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-7 w-56 animate-pulse rounded bg-muted" />
      <div className="glass-card p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-20 animate-pulse rounded bg-muted" />)}
        </div>
      </div>
      <div className="glass-card p-6">
        <div className="h-32 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

function SidebarSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 2 }).map((_, index) => (
        <div key={index} className="space-y-3">
          <div className="h-6 w-28 animate-pulse rounded bg-muted" />
          <div className="glass-card p-5">
            <div className="h-20 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

function MaterialsSectionSkeleton({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <div className="space-y-4">
      <div className="h-8 w-72 animate-pulse rounded bg-muted" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="glass-card p-4">
            <div className="h-16 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
      <div className="max-w-xl pt-4">
        <div className={isLoggedIn ? "glass-card p-5" : "rounded-[1.5rem] border-2 border-dashed border-white/10 bg-background/40 p-5"}>
          <div className="h-20 animate-pulse rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}

import { Suspense } from "react";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProposalCard, type SubjectProposal } from "@/components/subject/proposal-card";
import { MaterialApprovalCard } from "@/components/admin/material-approval-card";
import { RatingApprovalCard } from "@/components/admin/rating-approval-card";
import { ShieldAlert, ClipboardList } from "lucide-react";
import Link from "next/link";
import { FacultyFilter } from "@/components/admin/faculty-filter";
import { FeedbackApprovalCard } from "@/components/admin/feedback-approval-card";
import { TeacherApprovalCard } from "@/components/admin/teacher-approval-card";
import { MaterialStorageAudit } from "@/components/admin/material-storage-audit";
import type { Database } from "@/lib/types/database";

export const metadata: Metadata = {
  title: "Admin panel",
  description: "Správa návrhů předmětů.",
};

type QueueKey = "all" | "proposals" | "materials" | "comments" | "feedback" | "teachers";

export default async function AdminPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const facultyFilter = searchParams.faculty as string | undefined;
  const rawQueueFilter = searchParams.queue as string | undefined;
  const queueFilter: QueueKey =
    rawQueueFilter === "proposals" ||
    rawQueueFilter === "materials" ||
    rawQueueFilter === "comments" ||
    rawQueueFilter === "feedback" ||
    rawQueueFilter === "teachers"
      ? rawQueueFilter
      : "all";
  const query = (searchParams.q as string | undefined)?.trim().toLowerCase() ?? "";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/prihlaseni");

  const role = user.app_metadata?.role as string | undefined;
  const isAdmin = role === "admin" || role === "moderator";

  if (!isAdmin) {
    return (
      <div className="container mx-auto max-w-2xl space-y-4 px-4 py-24 text-center">
        <div className="flex justify-center">
          <ShieldAlert className="h-16 w-16 text-destructive/60" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Přístup odepřen</h1>
        <p className="text-muted-foreground">
          Tato stránka je dostupná pouze pro administrátory a moderátory.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Admin panel</h1>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Link href="/admin/subjects" className="text-sm font-medium text-primary hover:underline">
            Správa předmětů →
          </Link>
          <Link href="/admin/ucitele" className="text-sm font-medium text-primary hover:underline">
            Správa vyučujících →
          </Link>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Filtrovat podle fakulty</h2>
        <FacultyFilter />
      </div>

      <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap gap-2">
          {([
            { key: "all", label: "Vše" },
            { key: "proposals", label: "Návrhy" },
            { key: "materials", label: "Materiály" },
            { key: "comments", label: "Komentáře" },
            { key: "feedback", label: "Feedback" },
            { key: "teachers", label: "Učitelé" },
          ] as Array<{ key: QueueKey; label: string }>).map((queue) => {
            const params = new URLSearchParams();
            if (facultyFilter) params.set("faculty", facultyFilter);
            if (query) params.set("q", query);
            if (queue.key !== "all") params.set("queue", queue.key);
            const href = params.toString() ? `/admin?${params.toString()}` : "/admin";
            const isActive = queueFilter === queue.key;
            return (
              <Link
                key={queue.key}
                href={href}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <span>{queue.label}</span>
              </Link>
            );
          })}
        </div>

        <form className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="Hledat v moderaci podle názvu, komentáře nebo zprávy..."
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          />
          {facultyFilter && <input type="hidden" name="faculty" value={facultyFilter} />}
          {queueFilter !== "all" && <input type="hidden" name="queue" value={queueFilter} />}
          <button
            type="submit"
            className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            Filtrovat frontu
          </button>
        </form>
      </div>

      <Suspense fallback={<AdminQueuesSkeleton />}>
        <AdminQueuesSection facultyFilter={facultyFilter} queueFilter={queueFilter} query={query} />
      </Suspense>
    </div>
  );
}

async function AdminQueuesSection({
  facultyFilter,
  queueFilter,
  query,
}: {
  facultyFilter?: string;
  queueFilter: QueueKey;
  query: string;
}) {
  const supabase = await createClient();
  const queueItemLimit = queueFilter === "all" ? 25 : 100;

  const { data: rawProposals } = await supabase
    .from("subject_proposals")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(queueItemLimit);

  let proposals = (rawProposals ?? []) as SubjectProposal[];

  type MaterialWithSubject = Database["public"]["Tables"]["subject_materials"]["Row"] & {
    subject: Pick<Database["public"]["Tables"]["subjects"]["Row"], "name" | "faculty" | "slug"> | null;
  };
  type SubjectCommentQueueItem = {
    id: string;
    comment: string | null;
    created_at: string;
    overall_rating: number | null;
    subject: Pick<Database["public"]["Tables"]["subjects"]["Row"], "name" | "faculty"> | null;
  };
  type TeacherCommentQueueItem = {
    id: string;
    review: string | null;
    created_at: string;
    rating: number | null;
    teacher: Pick<Database["public"]["Tables"]["teachers"]["Row"], "name" | "faculty"> | null;
  };
  type FeedbackItem = Database["public"]["Tables"]["feedback"]["Row"];
  type TeacherItem = Database["public"]["Tables"]["teachers"]["Row"];

  const { data: rawMaterials } = await supabase
    .from("subject_materials")
    .select("*, subject:subject_id(name, faculty, slug)")
    .eq("moderation_status", "pending")
    .order("created_at", { ascending: true })
    .limit(queueItemLimit);
  let unapprovedMaterials = (rawMaterials ?? []) as MaterialWithSubject[];

  const { data: rawSubjectRatings } = await supabase
    .from("subject_ratings")
    .select("*, subject:subject_id(name, faculty)")
    .not("comment", "is", null)
    .eq("comment_is_approved", false)
    .order("created_at", { ascending: true })
    .limit(queueItemLimit);
  let unapprovedSubjectRatings = (rawSubjectRatings ?? []) as SubjectCommentQueueItem[];

  const { data: rawTeacherRatings } = await supabase
    .from("teacher_ratings")
    .select("*, teacher:teacher_id(name, faculty)")
    .not("review", "is", null)
    .eq("comment_is_approved", false)
    .order("created_at", { ascending: true })
    .limit(queueItemLimit);
  let unapprovedTeacherRatings = (rawTeacherRatings ?? []) as TeacherCommentQueueItem[];

  const { data: rawFeedback } = await supabase
    .from("feedback")
    .select("*")
    .neq("status", "resolved")
    .limit(queueItemLimit);
  const unresolvedFeedback = (rawFeedback ?? []) as FeedbackItem[];

  const { data: rawTeachers } = await supabase
    .from("teachers")
    .select("*")
    .eq("is_approved", false)
    .order("created_at", { ascending: true })
    .limit(queueItemLimit);
  let unapprovedTeachers = (rawTeachers ?? []) as TeacherItem[];

  if (facultyFilter) {
    proposals = proposals.filter((p) => (p.data as { faculty?: string }).faculty === facultyFilter);
    unapprovedMaterials = unapprovedMaterials.filter((m) => m.subject?.faculty === facultyFilter);
    unapprovedSubjectRatings = unapprovedSubjectRatings.filter((r) => r.subject?.faculty === facultyFilter);
    unapprovedTeacherRatings = unapprovedTeacherRatings.filter((r) => r.teacher?.faculty === facultyFilter);
    unapprovedTeachers = unapprovedTeachers.filter((t) => t.faculty === facultyFilter);
  }

  const matchesQuery = (...values: Array<string | null | undefined>) => !query || values.some((value) => value?.toLowerCase().includes(query));
  proposals = proposals.filter((proposal) => matchesQuery(String(proposal.data.name ?? ""), String(proposal.data.short_tag ?? ""), String(proposal.note ?? ""), proposal.proposed_by, proposal.proposed_by_email));
  unapprovedMaterials = unapprovedMaterials.filter((material) => matchesQuery(material.title, material.subject?.name, material.file_path));
  unapprovedSubjectRatings = unapprovedSubjectRatings.filter((rating) => matchesQuery(rating.comment, rating.subject?.name));
  unapprovedTeacherRatings = unapprovedTeacherRatings.filter((rating) => matchesQuery(rating.review, rating.teacher?.name));
  unapprovedTeachers = unapprovedTeachers.filter((teacher) => matchesQuery(teacher.name, teacher.slug, teacher.department, teacher.faculty));
  const filteredFeedback = unresolvedFeedback.filter((feedback) => matchesQuery(feedback.message, feedback.source_label, feedback.source_type, feedback.type));

  const unapprovedComments = [
    ...unapprovedSubjectRatings.map((r) => ({ id: r.id, type: "subject" as const, comment: r.comment ?? "", created_at: r.created_at, targetName: r.subject?.name || "Neznámý předmět", overall_rating: r.overall_rating })),
    ...unapprovedTeacherRatings.map((r) => ({ id: r.id, type: "teacher" as const, comment: r.review ?? "", created_at: r.created_at, targetName: r.teacher?.name || "Neznámý učitel", overall_rating: r.rating })),
  ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const subjectIds = proposals.filter((p) => p.type === "edit" && p.subject_id).map((p) => p.subject_id as string);
  const { data: currentSubjects } = subjectIds.length ? await supabase.from("subjects").select("*").in("id", subjectIds) : { data: [] as Database["public"]["Tables"]["subjects"]["Row"][] };
  const subjectsMap = Object.fromEntries((currentSubjects ?? []).map((subject) => [subject.id, subject]));
  const proposalsWithEmail = proposals.map((proposal) => ({ ...proposal, proposed_by_email: undefined as string | undefined }));

  const allDone = proposalsWithEmail.length === 0 && unapprovedMaterials.length === 0 && unapprovedComments.length === 0 && filteredFeedback.length === 0 && unapprovedTeachers.length === 0;
  const isQueueVisible = (queueKey: Exclude<QueueKey, "all">) => queueFilter === "all" || queueFilter === queueKey;

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <CountCard label="Návrhy" value={proposalsWithEmail.length} />
        <CountCard label="Materiály" value={unapprovedMaterials.length} />
        <CountCard label="Komentáře" value={unapprovedComments.length} />
        <CountCard label="Feedback" value={filteredFeedback.length} />
        <CountCard label="Učitelé" value={unapprovedTeachers.length} />
      </div>

      <MaterialStorageAudit />

      {allDone ? (
        <div className="glass-card mt-8 space-y-3 p-12 text-center">
          <div className="text-4xl">🎉</div>
          <p className="text-muted-foreground">Vše je vyřízeno! Žádné úkoly k řešení pro tuto volbu.</p>
        </div>
      ) : (
        <div className="space-y-12">
          {isQueueVisible("proposals") && proposalsWithEmail.length > 0 && (
            <QueueSection icon="📝" title="Návrhy předmětů" countLabel={formatCount(proposalsWithEmail.length, "návrh", "návrhy", "návrhů")}>
              <div className="space-y-4">
                {proposalsWithEmail.map((proposal) => (
                  <ProposalCard
                    key={proposal.id}
                    proposal={proposal}
                    currentSubjectData={proposal.type === "edit" && proposal.subject_id ? subjectsMap[proposal.subject_id] ?? null : null}
                  />
                ))}
              </div>
            </QueueSection>
          )}
          {isQueueVisible("materials") && unapprovedMaterials.length > 0 && (
            <QueueSection icon="📚" title="Nové materiály" countLabel={formatCount(unapprovedMaterials.length, "materiál", "materiály", "materiálů")}>
              <div className="space-y-4">
                {unapprovedMaterials.map((material) => (
                  <MaterialApprovalCard key={material.id} material={material} subjectName={material.subject?.name} subjectSlug={material.subject?.slug} />
                ))}
              </div>
            </QueueSection>
          )}
          {isQueueVisible("comments") && unapprovedComments.length > 0 && (
            <QueueSection icon="💬" title="Nové komentáře" countLabel={formatCount(unapprovedComments.length, "komentář", "komentáře", "komentářů")}>
              <div className="space-y-4">
                {unapprovedComments.map((comment) => <RatingApprovalCard key={comment.id} rating={comment} />)}
              </div>
            </QueueSection>
          )}
          {isQueueVisible("feedback") && filteredFeedback.length > 0 && (
            <QueueSection icon="💡" title="Zpětná vazba" countLabel={formatCount(filteredFeedback.length, "zpráva", "zprávy", "zpráv")}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {filteredFeedback.map((feedback) => <FeedbackApprovalCard key={feedback.id} feedback={feedback} />)}
              </div>
            </QueueSection>
          )}
          {isQueueVisible("teachers") && unapprovedTeachers.length > 0 && (
            <QueueSection icon="🧑‍🏫" title="Noví učitelé" countLabel={formatCount(unapprovedTeachers.length, "učitel", "učitelé", "učitelů")}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {unapprovedTeachers.map((teacher) => <TeacherApprovalCard key={teacher.id} teacher={teacher} />)}
              </div>
            </QueueSection>
          )}
        </div>
      )}
    </>
  );
}

function CountCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

function QueueSection({
  icon,
  title,
  countLabel,
  children,
}: {
  icon: string;
  title: string;
  countLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-border/50 pb-2">
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <span>{icon}</span> {title}
        </h2>
        <span className="text-sm text-muted-foreground">{countLabel}</span>
      </div>
      {children}
    </div>
  );
}

function formatCount(count: number, singular: string, few: string, many: string) {
  return `${count} ${count === 1 ? singular : count < 5 ? few : many}`;
}

function AdminQueuesSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="rounded-xl border border-border bg-card px-4 py-3">
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-8 w-10 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="h-6 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-xl border border-border p-4">
              <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
              <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

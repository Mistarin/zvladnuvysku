import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProposalCard, type SubjectProposal } from '@/components/subject/proposal-card'
import { MaterialApprovalCard } from '@/components/admin/material-approval-card'
import { RatingApprovalCard } from '@/components/admin/rating-approval-card'
import { ShieldAlert, ClipboardList } from 'lucide-react'
import Link from 'next/link'
import { FacultyFilter } from '@/components/admin/faculty-filter'
import { FeedbackApprovalCard } from '@/components/admin/feedback-approval-card'
import { TeacherApprovalCard } from '@/components/admin/teacher-approval-card'
import { MaterialStorageAudit } from '@/components/admin/material-storage-audit'
import type { Database } from '@/lib/types/database'

export const metadata: Metadata = {
  title: 'Admin panel',
  description: 'Správa návrhů předmětů.',
}

export default async function AdminPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const searchParams = await props.searchParams
  const facultyFilter = searchParams.faculty as string | undefined
  const queueFilter = (searchParams.queue as string | undefined) ?? 'all'
  const query = (searchParams.q as string | undefined)?.trim().toLowerCase() ?? ''
  const queueItemLimit = queueFilter === 'all' ? 25 : 100

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/prihlaseni')

  // Check admin/moderator role from app_metadata
  const role = user.app_metadata?.role as string | undefined

  const isAdmin = role === 'admin' || role === 'moderator'

  if (!isAdmin) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-24 text-center space-y-4">
        <div className="flex justify-center">
          <ShieldAlert className="w-16 h-16 text-destructive/60" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Přístup odepřen</h1>
        <p className="text-muted-foreground">
          Tato stránka je dostupná pouze pro administrátory a moderátory.
        </p>
      </div>
    )
  }

  const { data: rawProposals } = await supabase
    .from('subject_proposals')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(queueItemLimit)
    
  let proposals = (rawProposals ?? []) as SubjectProposal[]

  type MaterialWithSubject = Database['public']['Tables']['subject_materials']['Row'] & {
    subject: Pick<Database['public']['Tables']['subjects']['Row'], 'name' | 'faculty' | 'slug'> | null
  }
  type SubjectCommentQueueItem = {
    id: string
    comment: string | null
    created_at: string
    overall_rating: number | null
    subject: Pick<Database['public']['Tables']['subjects']['Row'], 'name' | 'faculty'> | null
  }
  type TeacherCommentQueueItem = {
    id: string
    review: string | null
    created_at: string
    rating: number | null
    teacher: Pick<Database['public']['Tables']['teachers']['Row'], 'name' | 'faculty'> | null
  }
  type FeedbackItem = Database['public']['Tables']['feedback']['Row']
  type TeacherItem = Database['public']['Tables']['teachers']['Row']
  type QueueKey = 'all' | 'proposals' | 'materials' | 'comments' | 'feedback' | 'teachers'

  // Fetch unapproved materials
  const materialsQuery = supabase
    .from('subject_materials')
    .select('*, subject:subject_id(name, faculty, slug)')
    .eq('moderation_status', 'pending')
    .order('created_at', { ascending: true })
    .limit(queueItemLimit)
    
  const { data: rawMaterials } = await materialsQuery
  let unapprovedMaterials = (rawMaterials ?? []) as MaterialWithSubject[]

  // Fetch unapproved subject ratings (only those with text)
  const { data: rawSubjectRatings } = await supabase
    .from('subject_ratings')
    .select('*, subject:subject_id(name, faculty)')
    .not('comment', 'is', null)
    .eq('comment_is_approved', false)
    .order('created_at', { ascending: true })
    .limit(queueItemLimit)
    
  let unapprovedSubjectRatings = (rawSubjectRatings ?? []) as SubjectCommentQueueItem[]

  // Fetch unapproved teacher ratings (only those with text)
  const { data: rawTeacherRatings } = await supabase
    .from('teacher_ratings')
    .select('*, teacher:teacher_id(name, faculty)')
    .not('review', 'is', null)
    .eq('comment_is_approved', false)
    .order('created_at', { ascending: true })
    .limit(queueItemLimit)
    
  let unapprovedTeacherRatings = (rawTeacherRatings ?? []) as TeacherCommentQueueItem[]

  // Fetch unresolved feedback
  const { data: rawFeedback } = await supabase
    .from('feedback')
    .select('*')
    .neq('status', 'resolved')
    .limit(queueItemLimit)
  const unresolvedFeedback = (rawFeedback ?? []) as FeedbackItem[]

  // Fetch unapproved teachers
  const { data: rawTeachers } = await supabase
    .from('teachers')
    .select('*')
    .eq('is_approved', false)
    .order('created_at', { ascending: true })
    .limit(queueItemLimit)

  let unapprovedTeachers = (rawTeachers ?? []) as TeacherItem[]

  // Filter by faculty if selected
  if (facultyFilter) {
    proposals = proposals.filter((p) => {
      const data = p.data as { faculty?: string }
      return data.faculty === facultyFilter
    })
    
    unapprovedMaterials = unapprovedMaterials.filter((m) => m.subject?.faculty === facultyFilter)
    unapprovedSubjectRatings = unapprovedSubjectRatings.filter((r) => r.subject?.faculty === facultyFilter)
    unapprovedTeacherRatings = unapprovedTeacherRatings.filter((r) => r.teacher?.faculty === facultyFilter)
    unapprovedTeachers = unapprovedTeachers.filter((t) => t.faculty === facultyFilter)
  }

  const matchesQuery = (...values: Array<string | null | undefined>) => {
    if (!query) return true
    return values.some((value) => value?.toLowerCase().includes(query))
  }

  proposals = proposals.filter((proposal) =>
    matchesQuery(
      String(proposal.data.name ?? ''),
      String(proposal.data.short_tag ?? ''),
      String(proposal.note ?? ''),
      proposal.proposed_by,
      proposal.proposed_by_email
    )
  )

  unapprovedMaterials = unapprovedMaterials.filter((material) =>
    matchesQuery(material.title, material.subject?.name, material.file_path)
  )

  unapprovedSubjectRatings = unapprovedSubjectRatings.filter((rating) =>
    matchesQuery(rating.comment, rating.subject?.name)
  )

  unapprovedTeacherRatings = unapprovedTeacherRatings.filter((rating) =>
    matchesQuery(rating.review, rating.teacher?.name)
  )

  unapprovedTeachers = unapprovedTeachers.filter((teacher) =>
    matchesQuery(teacher.name, teacher.slug, teacher.department, teacher.faculty)
  )

  // Combine ratings for UI
  const unapprovedComments = [
    ...unapprovedSubjectRatings.map((r) => ({
      id: r.id,
      type: "subject" as const,
      comment: r.comment ?? '',
      created_at: r.created_at,
      targetName: r.subject?.name || "Neznámý předmět",
      overall_rating: r.overall_rating
    })),
    ...unapprovedTeacherRatings.map((r) => ({
      id: r.id,
      type: "teacher" as const,
      comment: r.review ?? '',
      created_at: r.created_at,
      targetName: r.teacher?.name || "Neznámý učitel",
      overall_rating: r.rating
    }))
  ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  const filteredFeedback = unresolvedFeedback.filter((feedback) =>
    matchesQuery(feedback.message, feedback.source_label, feedback.source_type, feedback.type)
  )

  // For 'edit' proposals, fetch current subject data to show diff
  const subjectIds = proposals
    .filter((p) => p.type === 'edit' && p.subject_id)
    .map((p) => p.subject_id as string)

  const { data: currentSubjects } = subjectIds.length
    ? await supabase.from('subjects').select('*').in('id', subjectIds)
    : { data: [] }

  const subjectsMap = Object.fromEntries(
    (currentSubjects ?? []).map((s) => {
      const subject = s as Record<string, unknown>
      return [subject['id'] as string, subject]
    })
  )

  const proposalsWithEmail = proposals.map((p) => ({
    ...p,
    proposed_by_email: undefined as string | undefined,
  }))

  const queueCounts: Record<Exclude<QueueKey, 'all'>, number> = {
    proposals: proposalsWithEmail.length,
    materials: unapprovedMaterials.length,
    comments: unapprovedComments.length,
    feedback: filteredFeedback.length,
    teachers: unapprovedTeachers.length,
  }

  const isQueueVisible = (queueKey: Exclude<QueueKey, 'all'>) => queueFilter === 'all' || queueFilter === queueKey

  const allDone =
    proposalsWithEmail.length === 0 &&
    unapprovedMaterials.length === 0 &&
    unapprovedComments.length === 0 &&
    filteredFeedback.length === 0 &&
    unapprovedTeachers.length === 0

  const queueLinks: Array<{ key: QueueKey; label: string; count?: number }> = [
    { key: 'all', label: 'Vše' },
    { key: 'proposals', label: 'Návrhy', count: queueCounts.proposals },
    { key: 'materials', label: 'Materiály', count: queueCounts.materials },
    { key: 'comments', label: 'Komentáře', count: queueCounts.comments },
    { key: 'feedback', label: 'Feedback', count: queueCounts.feedback },
    { key: 'teachers', label: 'Učitelé', count: queueCounts.teachers },
  ]

  const buildQueueHref = (nextQueue: QueueKey) => {
    const params = new URLSearchParams()
    if (facultyFilter) params.set('faculty', facultyFilter)
    if (query) params.set('q', query)
    if (nextQueue !== 'all') params.set('queue', nextQueue)
    const qs = params.toString()
    return qs ? `/admin?${qs}` : '/admin'
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Admin panel</h1>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Link href="/admin/subjects" className="text-sm text-primary hover:underline font-medium">
            Správa předmětů →
          </Link>
          <Link href="/admin/ucitele" className="text-sm text-primary hover:underline font-medium">
            Správa vyučujících →
          </Link>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Filtrovat podle fakulty</h2>
        <FacultyFilter />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Návrhy</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{queueCounts.proposals}</p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Materiály</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{queueCounts.materials}</p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Komentáře</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{queueCounts.comments}</p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Feedback</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{queueCounts.feedback}</p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Učitelé</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{queueCounts.teachers}</p>
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap gap-2">
          {queueLinks.map((queue) => {
            const isActive = queueFilter === queue.key
            return (
              <Link
                key={queue.key}
                href={buildQueueHref(queue.key)}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <span>{queue.label}</span>
                {queue.count !== undefined && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-foreground">{queue.count}</span>
                )}
              </Link>
            )
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
          {queueFilter !== 'all' && <input type="hidden" name="queue" value={queueFilter} />}
          <button
            type="submit"
            className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            Filtrovat frontu
          </button>
        </form>
      </div>

      <MaterialStorageAudit />

      {allDone ? (
        <div className="glass-card p-12 text-center space-y-3 mt-8">
          <div className="text-4xl">🎉</div>
          <p className="text-muted-foreground">Vše je vyřízeno! Žádné úkoly k řešení pro tuto volbu.</p>
        </div>
      ) : (
        <div className="space-y-12">
          {/* Návrhy */}
          {isQueueVisible('proposals') && proposalsWithEmail.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border/50 pb-2">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <span>📝</span> Návrhy předmětů
                </h2>
                <span className="text-sm text-muted-foreground">{proposalsWithEmail.length} {proposalsWithEmail.length === 1 ? 'návrh' : proposalsWithEmail.length < 5 ? 'návrhy' : 'návrhů'}</span>
              </div>
              <div className="space-y-4">
                {proposalsWithEmail.map((proposal) => (
                  <ProposalCard
                    key={proposal.id}
                    proposal={proposal}
                    currentSubjectData={
                      proposal.type === 'edit' && proposal.subject_id
                        ? subjectsMap[proposal.subject_id] ?? null
                        : null
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {/* Materiály */}
          {isQueueVisible('materials') && unapprovedMaterials.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border/50 pb-2">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <span>📚</span> Nové materiály
                </h2>
                <span className="text-sm text-muted-foreground">{unapprovedMaterials.length} {unapprovedMaterials.length === 1 ? 'materiál' : unapprovedMaterials.length < 5 ? 'materiály' : 'materiálů'}</span>
              </div>
              <div className="space-y-4">
                {unapprovedMaterials.map((material) => (
                  <MaterialApprovalCard
                    key={material.id}
                    material={material}
                    subjectName={material.subject?.name}
                    subjectSlug={material.subject?.slug}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Komentáře */}
          {isQueueVisible('comments') && unapprovedComments.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border/50 pb-2">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <span>💬</span> Nové komentáře
                </h2>
                <span className="text-sm text-muted-foreground">{unapprovedComments.length} {unapprovedComments.length === 1 ? 'komentář' : unapprovedComments.length < 5 ? 'komentáře' : 'komentářů'}</span>
              </div>
              <div className="space-y-4">
                {unapprovedComments.map((comment) => (
                  <RatingApprovalCard
                    key={comment.id}
                    rating={comment}
                  />
                ))}
              </div>
            </div>
          )}
          {/* Feedback */}
          {isQueueVisible('feedback') && filteredFeedback.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border/50 pb-2">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <span>💡</span> Zpětná vazba
                </h2>
                <span className="text-sm text-muted-foreground">{filteredFeedback.length} {filteredFeedback.length === 1 ? 'zpráva' : filteredFeedback.length < 5 ? 'zprávy' : 'zpráv'}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredFeedback.map((feedback) => (
                  <FeedbackApprovalCard
                    key={feedback.id}
                    feedback={feedback}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Učitelé */}
          {isQueueVisible('teachers') && unapprovedTeachers.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border/50 pb-2">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <span>🧑‍🏫</span> Noví učitelé
                </h2>
                <span className="text-sm text-muted-foreground">{unapprovedTeachers.length} {unapprovedTeachers.length === 1 ? 'učitel' : unapprovedTeachers.length < 5 ? 'učitelé' : 'učitelů'}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {unapprovedTeachers.map((teacher) => (
                  <TeacherApprovalCard
                    key={teacher.id}
                    teacher={teacher}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

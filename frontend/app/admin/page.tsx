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

export const metadata: Metadata = {
  title: 'Admin panel',
  description: 'Správa návrhů předmětů.',
}

export default async function AdminPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const searchParams = await props.searchParams
  const facultyFilter = searchParams.faculty as string | undefined

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
    
  let proposals = (rawProposals ?? []) as SubjectProposal[]

  // Fetch unapproved materials
  let materialsQuery = supabase
    .from('subject_materials')
    .select('*, subject:subject_id(name, faculty)')
    .eq('is_approved', false)
    .order('created_at', { ascending: true })
    
  const { data: rawMaterials } = await materialsQuery
  let unapprovedMaterials: any[] = rawMaterials || []

  // Fetch unapproved subject ratings (only those with text)
  const { data: rawSubjectRatings } = await supabase
    .from('subject_ratings')
    .select('*, subject:subject_id(name, faculty)')
    .not('comment', 'is', null)
    .eq('comment_is_approved', false)
    .order('created_at', { ascending: true })
    
  let unapprovedSubjectRatings: any[] = rawSubjectRatings || []

  // Fetch unapproved teacher ratings (only those with text)
  const { data: rawTeacherRatings } = await supabase
    .from('teacher_ratings')
    .select('*, teacher:teacher_id(name, faculty)')
    .not('review', 'is', null)
    .eq('comment_is_approved', false)
    .order('created_at', { ascending: true })
    
  let unapprovedTeacherRatings: any[] = rawTeacherRatings || []

  // Fetch unresolved feedback
  const { data: rawFeedback } = await (supabase.from('feedback') as any)
    .select('*')
    .eq('is_resolved', false)
    .order('created_at', { ascending: true })

  let unresolvedFeedback: any[] = rawFeedback || []

  // Filter by faculty if selected
  if (facultyFilter) {
    proposals = proposals.filter((p) => {
      const data = p.data as any
      return data.faculty === facultyFilter
    })
    
    unapprovedMaterials = unapprovedMaterials.filter(m => (m.subject as any)?.faculty === facultyFilter)
    unapprovedSubjectRatings = unapprovedSubjectRatings.filter(r => (r.subject as any)?.faculty === facultyFilter)
    unapprovedTeacherRatings = unapprovedTeacherRatings.filter(r => (r.teacher as any)?.faculty === facultyFilter)
  }

  // Combine ratings for UI
  const unapprovedComments = [
    ...unapprovedSubjectRatings.map((r: any) => ({
      id: r.id,
      type: "subject" as const,
      comment: r.comment,
      created_at: r.created_at,
      targetName: r.subject?.name || "Neznámý předmět",
      overall_rating: r.overall_rating
    })),
    ...unapprovedTeacherRatings.map((r: any) => ({
      id: r.id,
      type: "teacher" as const,
      comment: r.review,
      created_at: r.created_at,
      targetName: r.teacher?.name || "Neznámý učitel",
      overall_rating: r.rating
    }))
  ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

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

  const allDone = proposalsWithEmail.length === 0 && unapprovedMaterials.length === 0 && unapprovedComments.length === 0 && unresolvedFeedback.length === 0;

  return (
    <div className="container mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Admin panel</h1>
        </div>
        <Link href="/admin/subjects" className="text-sm text-primary hover:underline font-medium">
          Správa existujících předmětů →
        </Link>
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Filtrovat podle fakulty</h2>
        <FacultyFilter />
      </div>

      {allDone ? (
        <div className="glass-card p-12 text-center space-y-3 mt-8">
          <div className="text-4xl">🎉</div>
          <p className="text-muted-foreground">Vše je vyřízeno! Žádné úkoly k řešení pro tuto volbu.</p>
        </div>
      ) : (
        <div className="space-y-12">
          {/* Návrhy */}
          {proposalsWithEmail.length > 0 && (
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
          {unapprovedMaterials.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border/50 pb-2">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <span>📚</span> Nové materiály
                </h2>
                <span className="text-sm text-muted-foreground">{unapprovedMaterials.length} {unapprovedMaterials.length === 1 ? 'materiál' : unapprovedMaterials.length < 5 ? 'materiály' : 'materiálů'}</span>
              </div>
              <div className="space-y-4">
                {unapprovedMaterials.map((material: any) => (
                  <MaterialApprovalCard
                    key={material.id}
                    material={material}
                    subjectName={material.subject?.name}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Komentáře */}
          {unapprovedComments.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border/50 pb-2">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <span>💬</span> Nové komentáře
                </h2>
                <span className="text-sm text-muted-foreground">{unapprovedComments.length} {unapprovedComments.length === 1 ? 'komentář' : unapprovedComments.length < 5 ? 'komentáře' : 'komentářů'}</span>
              </div>
              <div className="space-y-4">
                {unapprovedComments.map((comment: any) => (
                  <RatingApprovalCard
                    key={comment.id}
                    rating={comment}
                  />
                ))}
              </div>
            </div>
          )}
          {/* Feedback */}
          {unresolvedFeedback.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border/50 pb-2">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <span>💡</span> Zpětná vazba
                </h2>
                <span className="text-sm text-muted-foreground">{unresolvedFeedback.length} {unresolvedFeedback.length === 1 ? 'zpráva' : unresolvedFeedback.length < 5 ? 'zprávy' : 'zpráv'}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {unresolvedFeedback.map((feedback: any) => (
                  <FeedbackApprovalCard
                    key={feedback.id}
                    feedback={feedback}
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

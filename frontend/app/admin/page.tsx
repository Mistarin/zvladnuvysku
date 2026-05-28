import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProposalCard, type SubjectProposal } from '@/components/subject/proposal-card'
import { MaterialApprovalCard } from '@/components/admin/material-approval-card'
import { ShieldAlert, ClipboardList } from 'lucide-react'
import Link from 'next/link'
import { FacultyFilter } from '@/components/admin/faculty-filter'

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

  // Check admin/moderator role from user_metadata or app_metadata
  const role =
    (user.app_metadata?.role as string | undefined) ??
    (user.user_metadata?.role as string | undefined)

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

  // Check current tab
  const currentTab = searchParams.tab === 'materials' ? 'materials' : 'proposals'

  // Fetch pending proposals
  let query = (supabase as unknown as {
    from: (t: string) => {
      select: (s: string) => {
        eq: (k: string, v: string) => {
          order: (col: string, opts: { ascending: boolean }) => Promise<{ data: unknown[] | null }>
        }
      }
    }
  })
    .from('subject_proposals')
    .select('*')
    .eq('status', 'pending')

  const { data: rawProposals } = await query.order('created_at', { ascending: true })
  let proposals = (rawProposals ?? []) as SubjectProposal[]

  // Fetch unapproved materials
  const { data: rawMaterials } = await supabase
    .from('subject_materials')
    .select('*, subject:subject_id(name)')
    .eq('is_approved', false)
    .order('created_at', { ascending: true })

  const unapprovedMaterials = rawMaterials || []

  // Filter by faculty if selected
  if (facultyFilter) {
    proposals = proposals.filter((p) => {
      const data = p.data as any
      return data.faculty === facultyFilter
    })
  }

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

  // Fetch proposer emails from profiles (best effort — may not be available with anon key)
  const proposalsWithEmail = proposals.map((p) => ({
    ...p,
    proposed_by_email: undefined as string | undefined,
  }))

  return (
    <div className="container mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Admin panel</h1>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-2 border-b border-border">
        <Link 
          href="/admin" 
          className={`px-4 py-2 text-sm font-semibold transition-colors ${currentTab === 'proposals' ? 'text-primary border-b-2 border-primary -mb-px' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Čekající návrhy {proposalsWithEmail.length > 0 && `(${proposalsWithEmail.length})`}
        </Link>
        <Link 
          href="/admin?tab=materials" 
          className={`px-4 py-2 text-sm font-semibold transition-colors ${currentTab === 'materials' ? 'text-primary border-b-2 border-primary -mb-px' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Nové materiály {unapprovedMaterials.length > 0 && `(${unapprovedMaterials.length})`}
        </Link>
        <Link href="/admin/subjects" className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          Správa předmětů
        </Link>
      </div>
      
      {currentTab === 'proposals' && (
        <>
          <FacultyFilter />

          {proposalsWithEmail.length === 0 ? (
            <div className="glass-card p-12 text-center space-y-3">
              <div className="text-4xl">✅</div>
              <p className="text-muted-foreground">Žádné čekající návrhy. Vše vyřízeno!</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {proposalsWithEmail.length} {proposalsWithEmail.length === 1 ? 'návrh' : proposalsWithEmail.length < 5 ? 'návrhy' : 'návrhů'}
              </p>
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
          )}
        </>
      )}

      {currentTab === 'materials' && (
        <div className="space-y-4 pt-2">
          {unapprovedMaterials.length === 0 ? (
            <div className="glass-card p-12 text-center space-y-3">
              <div className="text-4xl">📚</div>
              <p className="text-muted-foreground">Žádné nové materiály ke schválení.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {unapprovedMaterials.length} {unapprovedMaterials.length === 1 ? 'materiál čeká' : unapprovedMaterials.length < 5 ? 'materiály čekají' : 'materiálů čeká'} na schválení
              </p>
              {unapprovedMaterials.map((material: any) => (
                <MaterialApprovalCard
                  key={material.id}
                  material={material}
                  subjectName={material.subject?.name}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

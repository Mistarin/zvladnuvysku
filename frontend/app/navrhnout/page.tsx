import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SubjectProposalForm, type InitialSubjectProposal, type SubjectDetails } from '@/components/subject/subject-proposal-form'
import type { SubjectProposalRecord } from '@/lib/types/database'

export const metadata: Metadata = {
  title: 'Navrhnout předmět',
  description: 'Navrhni nový předmět nebo uprav informace o existujícím předmětu.',
}

type PageProps = {
  searchParams?: Promise<{ proposal?: string | string[] }>
}

type ProposalData = {
  name?: string
  short_tag?: string
  description?: string
  target_audience?: string
  real_requirements?: string
  difficulty?: number
  time_intensity?: number
  attendance_type?: string
  exam_from_home?: boolean
  credits?: number
  semester?: string
  faculty?: string
  year?: number
  teachers?: Array<{ id?: string; name?: string; faculty?: string | null; department?: string | null }>
  material_group_title?: string | null
  materials?: Array<{ title?: string; file_path?: string; size_bytes?: number; page_count?: number | null }>
}

export default async function NavrhnoutPage({ searchParams }: PageProps) {
  let hasDisplayName = false
  let initialProposal: InitialSubjectProposal | null = null

  try {
    const resolvedSearchParams = await searchParams
    const rawProposalId = resolvedSearchParams?.proposal
    const proposalId = Array.isArray(rawProposalId) ? rawProposalId[0] : rawProposalId
    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) {
      console.error('[navrhnout] Failed to load authenticated user:', userError.message)
    }

    if (!user) redirect('/prihlaseni?redirect_to=/navrhnout')

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('user_id', user.id)
      .maybeSingle()

    if (profileError) {
      console.error('[navrhnout] Failed to load profile:', profileError.message)
    }

    hasDisplayName = Boolean((profile as { display_name?: string | null } | null)?.display_name?.trim())

    if (proposalId) {
      const { data: proposal, error: proposalError } = await supabase
        .from('subject_proposals')
        .select('*')
        .eq('id', proposalId)
        .eq('proposed_by', user.id)
        .eq('status', 'pending')
        .maybeSingle()

      if (proposalError) {
        console.error('[navrhnout] Failed to load pending proposal:', proposalError.message)
      }

      if (!proposal) {
        redirect('/moje-aktivita')
      }

      const typedProposal = proposal as SubjectProposalRecord
      const proposalData = normalizeProposalData(typedProposal.data)
      let subjectLabel = ''
      let originalSubject: SubjectDetails | null = null

      if (typedProposal.subject_id) {
        const { data: subject, error: subjectError } = await supabase
          .from('subjects')
          .select('name, short_tag, description, target_audience, real_requirements, difficulty, time_intensity, attendance_type, exam_from_home, credits, semester, faculty, year')
          .eq('id', typedProposal.subject_id)
          .maybeSingle()

        if (subjectError) {
          console.error('[navrhnout] Failed to load proposal subject:', subjectError.message)
        }

        if (subject) {
          const typedSubject = subject as SubjectDetails
          subjectLabel = `${typedSubject.short_tag ?? ''} · ${typedSubject.name ?? ''}`.replace(/^ · | · $/g, '')
          originalSubject = typedSubject
        }
      }

      initialProposal = {
        id: typedProposal.id,
        type: typedProposal.type,
        subjectId: typedProposal.subject_id,
        subjectLabel,
        form: {
          name: proposalData.name ?? '',
          short_tag: proposalData.short_tag ?? '',
          description: proposalData.description ?? '',
          target_audience: proposalData.target_audience ?? '',
          real_requirements: proposalData.real_requirements ?? '',
          difficulty: proposalData.difficulty ?? 3,
          time_intensity: proposalData.time_intensity ?? 3,
          attendance_type: proposalData.attendance_type ?? '',
          exam_from_home: proposalData.exam_from_home ?? false,
          credits: proposalData.credits ? String(proposalData.credits) : '',
          semester: proposalData.semester ?? '',
          faculty: proposalData.faculty ?? '',
          year: proposalData.year ? String(proposalData.year) : '',
          note: typedProposal.note ?? '',
        },
        teachers: normalizeProposalTeachers(proposalData.teachers),
        materialGroupTitle: proposalData.material_group_title ?? '',
        originalSubject,
      }
    }
  } catch (error) {
    if (isNextFrameworkControlFlowError(error)) {
      throw error
    }

    console.error('[navrhnout] Server render failed:', error)
    return <NavrhnoutRenderFallback />
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-2 mb-8">
        <h1 className="text-3xl font-bold text-foreground">Navrhnout předmět</h1>
        <p className="text-muted-foreground">
          Chybí ti tady nějaký předmět, nebo máš lepší informace? Pošli nám návrh a moderátor ho brzy zkontroluje.
        </p>
      </div>
      <SubjectProposalForm hasDisplayName={hasDisplayName} initialProposal={initialProposal} />
    </div>
  )
}

function normalizeProposalData(data: unknown): ProposalData {
  if (!isRecord(data)) {
    return {}
  }

  return data as ProposalData
}

function normalizeProposalTeachers(teachers: ProposalData['teachers']) {
  if (!Array.isArray(teachers)) {
    return []
  }

  return teachers.flatMap((teacher) => {
    if (!teacher || typeof teacher.name !== 'string' || !teacher.name.trim()) {
      return []
    }

    return [{
      id: typeof teacher.id === 'string' ? teacher.id : undefined,
      name: teacher.name.trim(),
      faculty: typeof teacher.faculty === 'string' ? teacher.faculty : null,
      department: typeof teacher.department === 'string' ? teacher.department : null,
    }]
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNextFrameworkControlFlowError(error: unknown) {
  if (typeof error !== 'object' || error === null || !('digest' in error) || typeof error.digest !== 'string') {
    return false
  }

  return (
    error.digest === 'DYNAMIC_SERVER_USAGE' ||
    error.digest.startsWith('NEXT_REDIRECT') ||
    error.digest.startsWith('NEXT_NOT_FOUND') ||
    error.digest.startsWith('NEXT_HTTP_ERROR_FALLBACK')
  )
}

function NavrhnoutRenderFallback() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-16 text-center sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-foreground">Návrh teď nejde načíst</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Nepodařilo se bezpečně ověřit přihlášení nebo profil. Zkus stránku obnovit, případně se znovu přihlásit.
        </p>
        <a
          href="/prihlaseni?redirect_to=/navrhnout"
          className="mt-6 inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Přihlásit znovu
        </a>
      </div>
    </div>
  )
}

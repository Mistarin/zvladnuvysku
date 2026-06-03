'use client'

import { useEffect, useState } from 'react'
import { Check, UserPlus } from 'lucide-react'
import {
  getSubjectDetailsForProposal,
  submitSubjectProposal,
} from '@/app/actions/contributions'
import { WelcomeDisplayNameModal } from '@/components/layout/welcome-display-name-modal'
import { normalizeDepartmentName } from '@/lib/department-name'
import { FACULTIES } from '@/lib/faculties'
import { getSubjectCache, searchInCache, type SubjectCacheEntry } from '@/lib/subject-cache'
import { getTeacherCache, searchTeachersInCache, type TeacherCacheEntry } from '@/lib/teacher-cache'

interface SubjectSearchResult {
  id: string
  name: string
  short_tag: string
}

interface TeacherSearchResult {
  id: string
  name: string
  faculty: string
  department: string | null
}

export interface SubjectDetails {
  name: string | null
  short_tag: string | null
  description: string | null
  target_audience: string | null
  real_requirements: string | null
  difficulty: number | null
  time_intensity: number | null
  attendance_type: string | null
  exam_from_home: boolean | null
  credits: number | null
  semester: string | null
  faculty: string | null
  year: number | null
}

const subjectDetailsCache = new Map<string, SubjectDetails>()

const SEMESTER_OPTIONS = [
  { value: 'zimní', label: '❄️ Zimní' },
  { value: 'letní', label: '☀️ Letní' },
  { value: 'oba', label: '🔄 Oba semestry' },
]

const ATTENDANCE_OPTIONS = [
  { value: 'volná', label: 'Volná docházka' },
  { value: 'povinná', label: 'Povinná (vše)' },
  { value: 'povinné přednášky', label: 'Povinné přednášky' },
  { value: 'povinná cvičení', label: 'Povinná cvičení' },
]

const DESCRIPTION_TEMPLATE = `- Řeší se hlavně...
- Výuka probíhá...
- Zakončení je...
- Tématikou je...
- Výuka probíhá...
- Zakončení je formou...`

const TARGET_AUDIENCE_TEMPLATE = `- Hodí se pro studenty, kteří...
- Nedává moc smysl, pokud...`

const REQUIREMENTS_TEMPLATE = `- Reálně se hodí umět...
- Počítej s tím, že...`

const DEFAULT_FORM = {
  name: '', short_tag: '', description: DESCRIPTION_TEMPLATE,
  target_audience: TARGET_AUDIENCE_TEMPLATE,
  real_requirements: REQUIREMENTS_TEMPLATE,
  difficulty: 3, time_intensity: 3,
  attendance_type: '',
  exam_from_home: false,
  credits: '', semester: '', faculty: '', year: '', note: '',
}

const FIELD_LABELS: Record<string, string> = {
  name: 'Název',
  short_tag: 'Zkratka',
  description: 'Popis',
  target_audience: 'Pro koho je předmět',
  real_requirements: 'Reálné požadavky',
  difficulty: 'Obtížnost',
  time_intensity: 'Časová náročnost',
  attendance_type: 'Docházka',
  exam_from_home: 'Zkouška z domova',
  credits: 'Kredity',
  semester: 'Semestr',
  faculty: 'Fakulta',
  year: 'Ročník',
}

const SUBMIT_TIMEOUT_MS = 30000
const MAX_PROPOSAL_MATERIALS = 8

type ProposalUploadItem = {
  id: string
  file: File
  pageCount: string
}

function createSubmissionToken() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1 block whitespace-nowrap text-xs font-medium text-muted-foreground">
      {children}{required && <span className="text-destructive ml-0.5">*</span>}
    </label>
  )
}

function Input({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 transition-all"
    />
  )
}

function Select({ ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 transition-all"
    />
  )
}

function Textarea({ hint, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { hint?: string }) {
  return (
    <div>
      <textarea
        {...props}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 transition-all font-mono"
      />
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  )
}

function normalizeDiffValue(value: string | number | boolean | null | undefined) {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (value === null || value === undefined) return ''
  return String(value)
}

function formatDiffValue(value: string | number | boolean | null | undefined) {
  if (typeof value === 'boolean') return value ? 'Ano' : 'Ne'
  if (value === null || value === undefined || value === '') return '—'
  return String(value)
}

interface SubjectProposalFormProps {
  hasPublicProfileIdentity: boolean
  initialDisplayName: string
  initialFaculty: string | null
  initialProposal?: InitialSubjectProposal | null
}

export type InitialSubjectProposal = {
  id: string
  type: 'new' | 'edit'
  subjectId: string | null
  subjectLabel: string
  form: Partial<typeof DEFAULT_FORM>
  teachers: Array<{ id?: string; name: string; faculty?: string | null; department?: string | null }>
  materialGroupTitle?: string
  originalSubject?: SubjectDetails | null
}

function getInitialForm(initialProposal?: InitialSubjectProposal | null) {
  if (!initialProposal) {
    return DEFAULT_FORM
  }

  return {
    ...DEFAULT_FORM,
    ...initialProposal.form,
    difficulty: Number(initialProposal.form.difficulty ?? DEFAULT_FORM.difficulty),
    time_intensity: Number(initialProposal.form.time_intensity ?? DEFAULT_FORM.time_intensity),
    exam_from_home: Boolean(initialProposal.form.exam_from_home ?? DEFAULT_FORM.exam_from_home),
  }
}

function getInitialTeachers(initialProposal?: InitialSubjectProposal | null) {
  return initialProposal?.teachers.map((teacher) => ({
    id: teacher.id,
    name: teacher.name,
    faculty: teacher.faculty ?? '',
    department: normalizeDepartmentName(teacher.department) ?? '',
  })) ?? []
}

function isSameTeacher(
  left: { id?: string; name: string; faculty: string; department: string },
  right: { id?: string; name: string; faculty: string; department: string },
) {
  if (left.id && right.id) {
    return left.id === right.id
  }

  return (
    left.name.trim().localeCompare(right.name.trim(), 'cs', { sensitivity: 'base' }) === 0 &&
    left.faculty === right.faculty &&
    left.department.trim().localeCompare(right.department.trim(), 'cs', { sensitivity: 'base' }) === 0
  )
}

export function SubjectProposalForm({
  hasPublicProfileIdentity: initialHasPublicProfileIdentity,
  initialDisplayName,
  initialFaculty,
  initialProposal,
}: SubjectProposalFormProps) {
  const [type, setType] = useState<'new' | 'edit'>(initialProposal?.type ?? 'new')
  const [subjectSearch, setSubjectSearch] = useState(initialProposal?.subjectLabel ?? '')
  const [subjectId, setSubjectId] = useState<string | null>(initialProposal?.subjectId ?? null)
  const [originalSubject, setOriginalSubject] = useState<SubjectDetails | null>(initialProposal?.originalSubject ?? null)
  const [searchResults, setSearchResults] = useState<SubjectSearchResult[]>([])
  const [isLoadingSubject, setIsLoadingSubject] = useState(false)
  const [subjectCache, setSubjectCache] = useState<SubjectCacheEntry[]>([])
  const [teacherCache, setTeacherCache] = useState<TeacherCacheEntry[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submissionToken, setSubmissionToken] = useState(createSubmissionToken)
  const [hasPublicProfileIdentity, setHasPublicProfileIdentity] = useState(initialHasPublicProfileIdentity)
  const [showDisplayNameModal, setShowDisplayNameModal] = useState(false)

  const [selectedTeachers, setSelectedTeachers] = useState<{ id?: string, name: string, faculty: string, department: string }[]>(() =>
    getInitialTeachers(initialProposal),
  )
  const [teacherSearch, setTeacherSearch] = useState('')
  const [teacherSearchResults, setTeacherSearchResults] = useState<TeacherSearchResult[]>([])
  const [isAddingNewTeacher, setIsAddingNewTeacher] = useState(false)
  const [newTeacherFaculty, setNewTeacherFaculty] = useState(initialProposal?.form.faculty ?? initialFaculty ?? '')
  const [newTeacherDepartment, setNewTeacherDepartment] = useState('')

  const [form, setForm] = useState(() => getInitialForm(initialProposal))

  const set = (k: keyof typeof form, v: string | number | boolean) =>
    setForm((f) => ({ ...f, [k]: v }))

  useEffect(() => {
    getSubjectCache().then(setSubjectCache).catch((cacheError) => {
      console.error('Nepodařilo se načíst cache předmětů:', cacheError)
    })
    getTeacherCache().then(setTeacherCache).catch((cacheError) => {
      console.error('Nepodařilo se načíst cache vyučujících:', cacheError)
    })
  }, [])

  const searchSubjects = async (q: string) => {
    setSubjectSearch(q)
    if (q.length < 2) { setSearchResults([]); return }

    const entries = subjectCache.length > 0 ? subjectCache : await getSubjectCache().catch(() => [])
    setSearchResults(
      searchInCache(entries, q, 6).map((subject) => ({
        id: subject.id,
        name: subject.name,
        short_tag: subject.short_tag,
      }))
    )
  }

  const [materials, setMaterials] = useState<ProposalUploadItem[]>([])
  const [materialGroupTitle, setMaterialGroupTitle] = useState(initialProposal?.materialGroupTitle ?? '')

  const applySubjectToForm = (subject: SubjectDetails) => {
    setOriginalSubject(subject)
    setForm({
      name: subject.name ?? '',
      short_tag: subject.short_tag ?? '',
      description: subject.description ?? '',
      target_audience: subject.target_audience ?? '',
      real_requirements: subject.real_requirements ?? '',
      difficulty: subject.difficulty ?? 3,
      time_intensity: subject.time_intensity ?? 3,
      attendance_type: subject.attendance_type ?? '',
      exam_from_home: subject.exam_from_home ?? false,
      credits: subject.credits ? String(subject.credits) : '',
      semester: subject.semester ?? '',
      faculty: subject.faculty ?? '',
      year: subject.year ? String(subject.year) : '',
      note: '',
    })
  }

  const loadSubjectDetails = async (selectedSubjectId: string) => {
    const cachedDetails = subjectDetailsCache.get(selectedSubjectId)
    if (cachedDetails) {
      applySubjectToForm(cachedDetails)
      return
    }

    setIsLoadingSubject(true)
    setError(null)
    const result = await getSubjectDetailsForProposal(selectedSubjectId)
    setIsLoadingSubject(false)

    if (!result.success || !result.data) {
      setError(result.success ? 'Nepodařilo se načíst data vybraného předmětu.' : result.error)
      return
    }

    const details = result.data as SubjectDetails
    subjectDetailsCache.set(selectedSubjectId, details)
    applySubjectToForm(details)
  }

  const diffEntries = type === 'edit' && originalSubject
    ? (Object.entries({
        name: form.name,
        short_tag: form.short_tag,
        description: form.description,
        target_audience: form.target_audience,
        real_requirements: form.real_requirements,
        difficulty: form.difficulty,
        time_intensity: form.time_intensity,
        attendance_type: form.attendance_type,
        exam_from_home: form.exam_from_home,
        credits: form.credits,
        semester: form.semester,
        faculty: form.faculty,
        year: form.year,
      }) as [keyof SubjectDetails, string | number | boolean][])
        .filter(([key, value]) => normalizeDiffValue(value) !== normalizeDiffValue(originalSubject[key]))
    : []

  const searchTeachers = async (q: string) => {
    setTeacherSearch(q)
    if (q.length < 2) { setTeacherSearchResults([]); return }

    const entries = teacherCache.length > 0 ? teacherCache : await getTeacherCache().catch(() => [])
    setTeacherSearchResults(
      searchTeachersInCache(entries, q, 6).map((teacher) => ({
        id: teacher.id,
        name: teacher.name,
        faculty: teacher.faculty,
        department: teacher.department,
      }))
    )
  }

  const teacherDepartmentOptions = Array.from(
    new Set(
      teacherCache
        .filter((teacher) => teacher.faculty === newTeacherFaculty)
        .map((teacher) => normalizeDepartmentName(teacher.department))
        .filter((department): department is string => Boolean(department)),
    ),
  ).sort((left, right) => left.localeCompare(right, 'cs'))

  const normalizedNewTeacherDepartment = normalizeDepartmentName(newTeacherDepartment) ?? ''
  const canAddNewTeacher = Boolean(teacherSearch.trim() && newTeacherFaculty && normalizedNewTeacherDepartment)
  const shouldShowTeacherEmptyState = teacherSearch.trim().length >= 2 && teacherSearchResults.length === 0 && !isAddingNewTeacher

  const addTeacherSelection = (teacher: { id?: string; name: string; faculty: string; department: string }) => {
    setSelectedTeachers((previous) => (
      previous.some((current) => isSameTeacher(current, teacher))
        ? previous
        : [...previous, teacher]
    ))
  }

  const resetTeacherComposer = () => {
    setIsAddingNewTeacher(false)
    setNewTeacherFaculty(form.faculty || initialFaculty || '')
    setNewTeacherDepartment('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (type === 'edit' && !subjectId) { setError('Vyber předmět, který chceš upravit.'); return }
    if (type === 'new' && (!form.name.trim() || !form.short_tag.trim())) {
      setError('U nového předmětu vyplň název i zkratku.')
      return
    }
    if (materials.length > MAX_PROPOSAL_MATERIALS) {
      setError(`Najednou lze přiložit maximálně ${MAX_PROPOSAL_MATERIALS} PDF souborů.`)
      return
    }
    const invalidDepartment = selectedTeachers.find((teacher) => !teacher.id && teacher.department && !/^[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]/.test(teacher.department))
    if (invalidDepartment) {
      setError('Název katedry musí začínat velkým písmenem.')
      return
    }
    if (!hasPublicProfileIdentity) {
      setShowDisplayNameModal(true)
      return
    }
    setIsSubmitting(true)
    setError(null)
    const payload = {
      proposalId: initialProposal?.id ?? null,
      type,
      subjectId,
      submissionToken,
      form,
      teachers: selectedTeachers,
      materialGroupTitle: materialGroupTitle.trim() || null,
      materialFiles: materials.map((item) => ({
        name: item.file.name,
        size: item.file.size,
        pageCount: item.pageCount.trim() ? Number(item.pageCount) : null,
      })),
    }

    const formData = new FormData()
    formData.set('payload', JSON.stringify(payload))
    materials.forEach((item, index) => formData.set(`material:${index}`, item.file))

    try {
      const result = await Promise.race([
        submitSubjectProposal(formData),
        new Promise<{ success: false; error: string }>((resolve) => {
          setTimeout(() => {
            resolve({
              success: false,
              error: 'Odeslání trvá příliš dlouho. Zkus to prosím znovu. Pokud nahráváš PDF, ověř, že bucket `study_materials` v Supabase existuje a upload neblokuje RLS.',
            })
          }, SUBMIT_TIMEOUT_MS)
        }),
      ])

      if (!result.success) { setError(result.error); return }
      setSuccess(true)
      setSubmissionToken(createSubmissionToken())
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Nepodařilo se odeslat návrh.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="glass-card p-8 text-center space-y-3">
        <h2 className="text-xl font-semibold text-foreground">
          {initialProposal ? 'Návrh upraven!' : 'Návrh odeslán!'}
        </h2>
        <p className="text-muted-foreground text-sm">Moderátor ho brzy zkontroluje.</p>
      </div>
    )
  }

  return (
    <>
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Typ návrhu */}
      <div className="glass-card rounded-[1.75rem] p-7 sm:p-8 space-y-5">
        <div>
          <h2 className="font-semibold text-foreground">Typ návrhu</h2>
          {initialProposal ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Upravuješ čekající návrh z Moje aktivita. Po uložení zůstane ve stavu čeká na schválení.
            </p>
          ) : null}
        </div>
        <div className="flex gap-3">
          {[{ v: 'new' as const, label: 'Nový předmět' }, { v: 'edit' as const, label: 'Úprava existujícího' }].map(({ v, label }) => (
            <button key={v} type="button" onClick={() => {
              setType(v)
              setSubjectId(null)
              setOriginalSubject(null)
              setSubjectSearch('')
              setSearchResults([])
              setSelectedTeachers([])
              setTeacherSearch('')
              setTeacherSearchResults([])
              setIsAddingNewTeacher(false)
              setNewTeacherFaculty('')
              setNewTeacherDepartment('')
              setMaterials([])
              setMaterialGroupTitle('')
              setError(null)
              setForm(DEFAULT_FORM)
            }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${type === v ? 'accent-gradient text-white border-transparent' : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted'}`}>
              {label}
            </button>
          ))}
        </div>

        {type === 'edit' && (
          <div className="space-y-2 relative">
            <FieldLabel required>Vyber předmět</FieldLabel>
            <Input placeholder="Hledej podle názvu nebo zkratky..." value={subjectId ? searchResults.find(s => s.id === subjectId)?.name ?? subjectSearch : subjectSearch}
              onChange={(e) => { setSubjectId(null); searchSubjects(e.target.value) }} />
            {searchResults.length > 0 && !subjectId && (
              <div className="absolute z-10 w-full mt-1 rounded-xl border border-border bg-popover shadow-xl overflow-hidden">
                {searchResults.map((s) => (
                  <button key={s.id} type="button" onClick={async () => {
                    setSubjectId(s.id)
                    setSubjectSearch(s.name)
                    setSearchResults([])
                    await loadSubjectDetails(s.id)
                  }}
                    className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted transition-colors flex items-center gap-2">
                    <span className="font-mono text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">{s.short_tag}</span>
                    <span>{s.name}</span>
                  </button>
                ))}
              </div>
            )}
            {subjectId && (
              <p className="text-xs text-muted-foreground">
                {isLoadingSubject ? 'Načítám aktuální data předmětu…' : 'Formulář byl předvyplněn aktuálními daty. Uprav, co je potřeba.'}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Data předmětu */}
      <div className="glass-card rounded-[1.75rem] p-7 sm:p-8 space-y-5">
        <div>
          <h2 className="font-semibold text-foreground">
            {type === 'new' ? 'Informace o předmětu' : 'Nové/opravené informace'}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">{type === 'edit' ? 'Po výběru předmětu se načtou aktuální údaje, které můžeš rovnou upravit.' : 'Vyplň co nejvíce informací.'}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <FieldLabel required={type === 'new'}>Název předmětu</FieldLabel>
            <Input placeholder="Algoritmizace I" value={form.name} onChange={(e) => set('name', e.target.value)} />
          </div>
          <div>
            <FieldLabel required={type === 'new'}>Zkratka (short_tag)</FieldLabel>
            <Input placeholder="ALG1" value={form.short_tag} onChange={(e) => set('short_tag', e.target.value)} />
          </div>
        </div>

        <div>
          <FieldLabel>Popis předmětu</FieldLabel>
          <Textarea
            rows={4}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            hint="Každý řádek začíná pomlčkou (-). Dodržuj formát šablony výše."
          />
        </div>

        <div>
          <FieldLabel>Pro koho je předmět</FieldLabel>
          <Textarea
            rows={3}
            value={form.target_audience}
            onChange={(e) => set('target_audience', e.target.value)}
            hint="Popiš, kdo z předmětu nejvíce získá a kdo ho naopak nemusí chodit."
          />
        </div>

        <div>
          <FieldLabel>Reálné požadavky (zkušenosti studentů)</FieldLabel>
          <Textarea
            rows={3}
            value={form.real_requirements}
            onChange={(e) => set('real_requirements', e.target.value)}
            hint="Co ve skutečnosti potřebuješ — ne co píše syllabus."
          />
        </div>

        <div className="grid grid-cols-1 gap-4 2xl:grid-cols-4">
          <div className="space-y-2 sm:col-span-2 2xl:col-span-2">
            <div>
              <FieldLabel>Náročnost předmětu</FieldLabel>
              <p className="text-xs text-muted-foreground">
                Vyplň obě hodnoty společně: jak těžká je látka a kolik času typicky bere.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel>Obtížnost (1–5)</FieldLabel>
                <Input type="number" min={1} max={5} value={form.difficulty} onChange={(e) => set('difficulty', Number(e.target.value))} />
              </div>
              <div>
                <FieldLabel>Časová náročnost (1–5)</FieldLabel>
                <Input type="number" min={1} max={5} value={form.time_intensity} onChange={(e) => set('time_intensity', Number(e.target.value))} />
              </div>
            </div>
          </div>
          <div>
            <FieldLabel>Kredity</FieldLabel>
            <Input type="number" min={1} max={30} placeholder="5" value={form.credits} onChange={(e) => set('credits', e.target.value)} />
          </div>
          <div>
            <FieldLabel>Ročník</FieldLabel>
            <Input type="number" min={1} max={5} placeholder="1" value={form.year} onChange={(e) => set('year', e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          <div>
            <FieldLabel>Semestr</FieldLabel>
            <Select value={form.semester} onChange={(e) => set('semester', e.target.value)}>
              <option value="">– vybrat –</option>
              {SEMESTER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </div>
          <div>
            <FieldLabel>Fakulta</FieldLabel>
            <Select value={form.faculty} onChange={(e) => set('faculty', e.target.value)}>
              <option value="">– vybrat –</option>
              {FACULTIES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </div>
          <div className="lg:col-span-2 2xl:col-span-1">
            <FieldLabel>Docházka</FieldLabel>
            <div className="space-y-4">
              <Select value={form.attendance_type} onChange={(e) => set('attendance_type', e.target.value)}>
                <option value="">– vybrat –</option>
                {ATTENDANCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
              <div className="flex justify-start">
                <label className="flex w-full max-w-md cursor-pointer items-center justify-start gap-3">
                  <input
                    type="checkbox"
                    checked={form.exam_from_home}
                    onChange={(e) => set('exam_from_home', e.target.checked)}
                    className="peer sr-only"
                  />
                  <span className="flex w-full items-center justify-start gap-3 rounded-2xl border-2 border-border bg-background px-5 py-3 text-left transition-all peer-checked:border-emerald-500/30 peer-checked:bg-emerald-500/10">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-border bg-background text-sm text-transparent transition-all peer-checked:border-emerald-500 peer-checked:bg-emerald-500 peer-checked:text-white">
                      <Check className="h-4 w-4" strokeWidth={3} />
                    </span>
                    <span className="whitespace-nowrap text-base font-semibold text-foreground">Zkouška z domova</span>
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Učitelé */}
        <div className="border-t border-border pt-4 mt-2">
          <FieldLabel>Vyučující předmětu</FieldLabel>
          <div className="space-y-3">
            {selectedTeachers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedTeachers.map((t, i) => (
                  <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted text-sm border border-border">
                    <span className="font-mono text-[10px] bg-background px-1 rounded text-muted-foreground">{t.faculty}</span>
                    <span>{t.name}</span>
                    {t.department && (
                      <span className="text-[10px] text-muted-foreground">· {t.department}</span>
                    )}
                    <button type="button" onClick={() => setSelectedTeachers(prev => prev.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive ml-1">
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="relative space-y-2">
              <Input
                placeholder="Hledat učitele nebo napsat nové jméno..."
                value={teacherSearch}
                onChange={(e) => searchTeachers(e.target.value)}
              />
              {teacherSearchResults.length > 0 && !isAddingNewTeacher && (
                <div className="absolute z-10 w-full mt-1 rounded-xl border border-border bg-popover shadow-xl overflow-hidden">
                  {teacherSearchResults.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        addTeacherSelection({
                          ...t,
                          department: t.department ?? '',
                        })
                        setTeacherSearch('')
                        setTeacherSearchResults([])
                      }}
                      className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted transition-colors flex items-center gap-2"
                    >
                      <span className="font-mono text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">{t.faculty}</span>
                      <span>{t.name}</span>
                      {t.department && <span className="text-xs text-muted-foreground">· {t.department}</span>}
                    </button>
                  ))}
                </div>
              )}

              {shouldShowTeacherEmptyState && (
                <p className="text-xs text-muted-foreground">Nenalezen žádný schválený vyučující pro tento dotaz.</p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  Když vyučující neexistuje, můžeš ho rovnou založit bez ztráty rozepsaného návrhu.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setNewTeacherFaculty((currentFaculty) => currentFaculty || form.faculty || initialFaculty || '')
                    setIsAddingNewTeacher(true)
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Nevidíš vyučujícího? Přidat nového
                </button>
              </div>
            </div>

            {isAddingNewTeacher && (
              <div className="rounded-lg border border-border bg-muted/50 p-3 space-y-3">
                <div className="space-y-1">
                  <h4 className="text-sm font-medium">Nový vyučující</h4>
                  <p className="text-xs text-muted-foreground">
                    Jméno se bere z pole výše. Tady už jen doplň fakultu a katedru.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <FieldLabel>Jméno a příjmení (s tituly)</FieldLabel>
                    <Input value={teacherSearch} readOnly placeholder="Napiš jméno do pole výše" />
                  </div>
                  <div>
                    <FieldLabel>Fakulta</FieldLabel>
                    <Select value={newTeacherFaculty} onChange={e => setNewTeacherFaculty(e.target.value)}>
                      <option value="">– vybrat –</option>
                      {FACULTIES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </Select>
                  </div>
                </div>
                <div>
                  <FieldLabel>Katedra</FieldLabel>
                  <Input
                    list="teacher-department-options"
                    placeholder="Např. Katedra pedagogiky a andragogiky"
                    value={newTeacherDepartment}
                    onChange={e => setNewTeacherDepartment(e.target.value)}
                    onBlur={e => setNewTeacherDepartment(normalizeDepartmentName(e.target.value) ?? '')}
                  />
                  <datalist id="teacher-department-options">
                    {teacherDepartmentOptions.map((department) => (
                      <option key={department} value={department} />
                    ))}
                  </datalist>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Pole přijímá existující i novou katedru. Víceslovné názvy jsou podporované.
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={resetTeacherComposer}
                    className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Zpět k vyhledávání
                  </button>
                  <button
                    type="button"
                    disabled={!canAddNewTeacher}
                    onClick={() => {
                      if (!canAddNewTeacher) {
                        return
                      }

                      addTeacherSelection({
                        name: teacherSearch.trim(),
                        faculty: newTeacherFaculty,
                        department: normalizedNewTeacherDepartment,
                      })
                      setTeacherSearch('')
                      setTeacherSearchResults([])
                      resetTeacherComposer()
                    }}
                    className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-md disabled:opacity-50"
                  >
                    Přidat učitele
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Materiály */}
      {type === 'edit' && subjectId && (
        <div className="glass-card p-6 space-y-4">
          <div>
            <h2 className="font-semibold text-foreground">Náhled změn</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tohle se oproti aktuálním datům změní po schválení moderátorem.
            </p>
          </div>

          {diffEntries.length === 0 && selectedTeachers.length === 0 && materials.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Zatím jsi nic nezměnil.
            </p>
          ) : (
            <div className="space-y-3">
              {diffEntries.map(([key, value]) => (
                <div key={key} className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                    {FIELD_LABELS[key] ?? key}
                  </p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <div>
                      <p className="text-[11px] text-muted-foreground">Aktuálně</p>
                      <p className="text-sm text-foreground/70">{formatDiffValue(originalSubject?.[key] ?? null)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Nově</p>
                      <p className="text-sm font-medium text-foreground">{formatDiffValue(value)}</p>
                    </div>
                  </div>
                </div>
              ))}
              {selectedTeachers.length > 0 && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">
                  Přidá se {selectedTeachers.length} {selectedTeachers.length === 1 ? 'vyučující' : selectedTeachers.length < 5 ? 'vyučující' : 'vyučujících'}.
                </div>
              )}
              {materials.length > 0 && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">
                  Přidá se {materials.length} {materials.length === 1 ? 'materiál' : materials.length < 5 ? 'materiály' : 'materiálů'} k moderaci.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Materiály */}
      <div className="glass-card p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-foreground">Studijní materiály</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Volitelně nahraj PDF materiály (výpisky, testy) pro tento předmět.</p>
        </div>
        
        <div className="space-y-3">
          <input
            type="file"
            accept="application/pdf"
            multiple
            className="hidden"
            id="proposal-materials-upload"
            onChange={(e) => {
              if (e.target.files) {
                const remainingSlots = MAX_PROPOSAL_MATERIALS - materials.length;
                if (remainingSlots <= 0) {
                  setError(`Najednou lze přiložit maximálně ${MAX_PROPOSAL_MATERIALS} PDF souborů.`);
                  e.target.value = '';
                  return;
                }

                const newFiles = Array.from(e.target.files).slice(0, remainingSlots);
                const validFiles = newFiles.filter(f => f.size <= 2 * 1024 * 1024);
                if (newFiles.length !== validFiles.length) {
                  setError("Některé soubory byly přeskočeny, protože přesahují limit 2 MB.");
                } else if (e.target.files.length > remainingSlots) {
                  setError(`Přidáno jen ${remainingSlots} souborů. Najednou lze přiložit maximálně ${MAX_PROPOSAL_MATERIALS}.`);
                }
                setMaterials(prev => [
                  ...prev,
                  ...validFiles.map((file) => ({
                    id: typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
                      ? crypto.randomUUID()
                      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
                    file,
                    pageCount: '',
                  })),
                ]);
                e.target.value = '';
              }
            }}
          />
          <label 
            htmlFor="proposal-materials-upload"
            className="inline-flex items-center justify-center w-full px-4 py-6 border-2 border-dashed border-border rounded-xl cursor-pointer hover:bg-muted/50 transition-colors"
          >
            <div className="text-center">
              <span className="text-2xl opacity-80">📄</span>
              <p className="mt-2 text-sm font-medium text-foreground">Vybrat PDF soubory</p>
              <p className="text-xs text-muted-foreground mt-1">Maximálně 2 MB na soubor</p>
            </div>
          </label>

          {(materials.length > 1 || materialGroupTitle) && (
            <div>
              <FieldLabel>Název složky / skupiny</FieldLabel>
              <Input
                value={materialGroupTitle}
                onChange={(e) => setMaterialGroupTitle(e.target.value)}
                placeholder="např. Vše ke zkoušce"
                maxLength={120}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Pokud přidáš více PDF, po schválení se uloží do jedné skupiny pod tímto názvem.
              </p>
            </div>
          )}

          {materials.length > 0 && (
            <div className="space-y-2 mt-4">
              {materials.map((item) => (
                <div key={item.id} className="rounded-lg bg-muted/30 border border-border p-3 text-sm space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 truncate">
                      <span>📄</span>
                      <span className="truncate">{item.file.name}</span>
                      <span className="text-muted-foreground text-xs">({(item.file.size / 1024 / 1024).toFixed(1)} MB)</span>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setMaterials(prev => prev.filter((current) => current.id !== item.id))}
                      className="text-muted-foreground hover:text-destructive p-1"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="sm:max-w-[180px]">
                    <FieldLabel>Počet stran</FieldLabel>
                    <Input
                      type="number"
                      min={1}
                      max={9999}
                      value={item.pageCount}
                      onChange={(e) => {
                        const nextValue = e.target.value
                        setMaterials((prev) => prev.map((current) =>
                          current.id === item.id ? { ...current, pageCount: nextValue } : current,
                        ))
                      }}
                      placeholder="např. 18"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Poznámka moderátorovi */}
      <div className="glass-card p-6 space-y-3">
        <h2 className="font-semibold text-foreground">Poznámka pro moderátora</h2>
        <Textarea placeholder="Proč navrhuješ tuto změnu, kde jsi informace zjistil/a..." rows={3}
          value={form.note} onChange={(e) => set('note', e.target.value)} />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="rounded-xl border border-red-500/40 bg-red-500/5 p-4 text-sm space-y-2">
        <p className="font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
          ⚠️ Materiály jsou moderované
        </p>
        <ul className="text-muted-foreground space-y-1 list-disc list-inside text-xs">
          <li>Vyhni se AI slopu a odfláknutým materiálům. Takové vracíme ke kontrole.</li>
          <li>Radši přilož víc stran pohromadě než několik drobných PDF zvlášť.</li>
          <li>XP se počítají přímo z bodů: 1 bod = 10 XP, 2 body = 20 XP, 3 body = 30 XP a 4 body = 40 XP.</li>
        </ul>
        <a href="/jak-to-funguje" target="_blank" className="text-xs text-primary hover:underline">Jak fungují body? →</a>
      </div>

      <button type="submit" disabled={isSubmitting}
        className="w-full py-3 rounded-xl font-medium text-sm accent-gradient text-white hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
        {isSubmitting ? 'Odesílám...' : 'Odeslat návrh'}
      </button>
    </form>
    <WelcomeDisplayNameModal
      open={showDisplayNameModal}
      onOpenChange={setShowDisplayNameModal}
      initialDisplayName={initialDisplayName}
      initialFaculty={initialFaculty}
      onCompleted={() => {
        setHasPublicProfileIdentity(true)
      }}
    />
    </>
  )
}

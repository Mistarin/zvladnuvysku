'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// NOTE: Run this SQL in Supabase before using this form:
// CREATE TABLE subject_proposals (
//   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
//   type text NOT NULL CHECK (type IN ('new', 'edit')),
//   subject_id uuid REFERENCES subjects(id),
//   data jsonb NOT NULL DEFAULT '{}',
//   note text,
//   proposed_by uuid NOT NULL REFERENCES auth.users(id),
//   status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
//   rejection_reason text,
//   reviewed_by uuid REFERENCES auth.users(id),
//   reviewed_at timestamptz,
//   created_at timestamptz NOT NULL DEFAULT now()
// );

interface SubjectProposalFormProps {
  userId: string
}

const SEMESTER_OPTIONS = [
  { value: 'zimní', label: '❄️ Zimní' },
  { value: 'letní', label: '☀️ Letní' },
  { value: 'oba', label: '🔄 Oba semestry' },
]

// Ostravská univerzita faculties
const FACULTY_OPTIONS = [
  { value: 'PřF', label: 'PřF — Přírodovědecká fakulta' },
  { value: 'FF', label: 'FF — Filozofická fakulta' },
  { value: 'PdF', label: 'PdF — Pedagogická fakulta' },
  { value: 'LF', label: 'LF — Lékařská fakulta' },
  { value: 'FSS', label: 'FSS — Fakulta sociálních studií' },
  { value: 'FU', label: 'FU — Fakulta umění' },
]

const ATTENDANCE_OPTIONS = [
  { value: 'volná', label: '🟢 Volná docházka' },
  { value: 'povinná', label: '🔴 Povinná docházka' },
  { value: 'povinné_přednášky', label: '🟠 Povinné přednášky' },
  { value: 'povinné_cvičení', label: '🟡 Povinné cvičení' },
]

const DESCRIPTION_TEMPLATE = `- Předmět se zabývá...
- Výuka probíhá formou...
- Zakončení je...`

const TARGET_AUDIENCE_TEMPLATE = `- Vhodné pro...
- Nevhodné pro...`

const REQUIREMENTS_TEMPLATE = `- Znalost...
- Schopnost...`

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-medium text-muted-foreground mb-1">
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

export function SubjectProposalForm({ userId }: SubjectProposalFormProps) {
  const [type, setType] = useState<'new' | 'edit'>('new')
  const [subjectSearch, setSubjectSearch] = useState('')
  const [subjectId, setSubjectId] = useState<string | null>(null)
  const [searchResults, setSearchResults] = useState<{ id: string; name: string; short_tag: string }[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '', short_tag: '', description: DESCRIPTION_TEMPLATE,
    target_audience: TARGET_AUDIENCE_TEMPLATE,
    real_requirements: REQUIREMENTS_TEMPLATE,
    difficulty: 3, time_intensity: 3,
    attendance_type: '',
    credits: '', semester: '', faculty: '', year: '', note: '',
  })

  const set = (k: keyof typeof form, v: string | number | boolean) =>
    setForm((f) => ({ ...f, [k]: v }))

  const searchSubjects = async (q: string) => {
    setSubjectSearch(q)
    if (q.length < 2) { setSearchResults([]); return }
    const supabase = createClient()
    const { data } = await supabase
      .from('subjects')
      .select('id, name, short_tag')
      .or(`name.ilike.%${q}%,short_tag.ilike.%${q}%`)
      .limit(6)
    setSearchResults(data ?? [])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (type === 'edit' && !subjectId) { setError('Vyber předmět, který chceš upravit.'); return }
    setIsSubmitting(true)
    setError(null)

    const supabase = createClient()
    const proposalData = {
      name: form.name || undefined, short_tag: form.short_tag || undefined,
      description: form.description || undefined, target_audience: form.target_audience || undefined,
      real_requirements: form.real_requirements || undefined,
      difficulty: form.difficulty, time_intensity: form.time_intensity,
      attendance_type: form.attendance_type || undefined,
      credits: form.credits ? Number(form.credits) : undefined,
      semester: form.semester || undefined, faculty: form.faculty || undefined,
      year: form.year ? Number(form.year) : undefined,
    }

    const { error: dbError } = await supabase.from('subject_proposals' as never).insert({
      type, subject_id: type === 'edit' ? subjectId : null,
      data: proposalData, note: form.note || null, proposed_by: userId,
    } as never)

    setIsSubmitting(false)
    if (dbError) { setError('Nepodařilo se odeslat návrh. Zkus to prosím znovu.'); return }
    setSuccess(true)
  }

  if (success) {
    return (
      <div className="glass-card p-8 text-center space-y-3">
        <div className="text-4xl">🎉</div>
        <h2 className="text-xl font-semibold text-foreground">Návrh odeslán!</h2>
        <p className="text-muted-foreground text-sm">Moderátor ho brzy zkontroluje.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Typ návrhu */}
      <div className="glass-card p-6 space-y-4">
        <h2 className="font-semibold text-foreground">Typ návrhu</h2>
        <div className="flex gap-3">
          {[{ v: 'new' as const, label: 'Nový předmět' }, { v: 'edit' as const, label: 'Úprava existujícího' }].map(({ v, label }) => (
            <button key={v} type="button" onClick={() => { setType(v); setSubjectId(null); setSubjectSearch(''); }}
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
                  <button key={s.id} type="button" onClick={() => { setSubjectId(s.id); setSubjectSearch(s.name); setSearchResults([]) }}
                    className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted transition-colors flex items-center gap-2">
                    <span className="font-mono text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">{s.short_tag}</span>
                    <span>{s.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Data předmětu */}
      <div className="glass-card p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-foreground">
            {type === 'new' ? 'Informace o předmětu' : 'Nové/opravené informace'}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">{type === 'edit' ? 'Vyplň jen pole, která chceš změnit.' : 'Vyplň co nejvíce informací.'}</p>
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

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <FieldLabel>Obtížnost (1–5)</FieldLabel>
            <Input type="number" min={1} max={5} value={form.difficulty} onChange={(e) => set('difficulty', Number(e.target.value))} />
          </div>
          <div>
            <FieldLabel>Časová náročnost (1–5)</FieldLabel>
            <Input type="number" min={1} max={5} value={form.time_intensity} onChange={(e) => set('time_intensity', Number(e.target.value))} />
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
              {FACULTY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </div>
          <div>
            <FieldLabel>Docházka</FieldLabel>
            <Select value={form.attendance_type} onChange={(e) => set('attendance_type', e.target.value)}>
              <option value="">– vybrat –</option>
              {ATTENDANCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </div>
        </div>
      </div>

      {/* Poznámka moderátorovi */}
      <div className="glass-card p-6 space-y-3">
        <h2 className="font-semibold text-foreground">Poznámka pro moderátora</h2>
        <Textarea placeholder="Proč navrhuješ tuto změnu, kde jsi informace zjistil/a..." rows={3}
          value={form.note} onChange={(e) => set('note', e.target.value)} />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <button type="submit" disabled={isSubmitting}
        className="w-full py-3 rounded-xl font-medium text-sm accent-gradient text-white hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
        {isSubmitting ? 'Odesílám...' : 'Odeslat návrh'}
      </button>
    </form>
  )
}

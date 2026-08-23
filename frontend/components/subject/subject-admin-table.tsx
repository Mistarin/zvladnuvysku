'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2, Check, X, Loader2 } from 'lucide-react'
import { deleteSubject, updateSubject } from '@/app/admin/actions'
import { filterDepartmentsByFaculty, sortDepartments, type DepartmentOption } from '@/lib/departments'
import { FACULTIES } from '@/lib/faculties'

interface SubjectRow {
  id: string
  name: string
  short_tag: string
  faculty: string | null
  semester: string | null
  difficulty: number | null
  credits: number | null
  slug: string
  department: string | null
  department_id: string | null
  department_ref?: { id: string; name: string; faculty: string } | null
}

interface Props {
  subjects: SubjectRow[]
  departments: DepartmentOption[]
}

function EditRow({
  subject,
  departments,
  onDone,
}: {
  subject: SubjectRow
  departments: DepartmentOption[]
  onDone: () => void
}) {
  const [form, setForm] = useState({
    name: subject.name,
    short_tag: subject.short_tag,
    faculty: subject.faculty ?? '',
    semester: subject.semester ?? '',
    difficulty: subject.difficulty ?? '',
    credits: subject.credits ?? '',
    department_id: subject.department_id ?? subject.department_ref?.id ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const availableDepartments = useMemo(
    () => sortDepartments(filterDepartmentsByFaculty(departments, form.faculty)),
    [departments, form.faculty],
  )

  const handleSave = async () => {
    setSaving(true)
    setError(null)

    const selectedDepartment = availableDepartments.find((department) => department.id === form.department_id) ?? null
    const result = await updateSubject(subject.id, {
      name: form.name,
      short_tag: form.short_tag,
      faculty: form.faculty || null,
      semester: form.semester || null,
      difficulty: form.difficulty !== '' ? Number(form.difficulty) : null,
      credits: form.credits !== '' ? Number(form.credits) : null,
      department_id: selectedDepartment?.id ?? null,
      department: selectedDepartment?.name ?? null,
    })

    setSaving(false)
    if (result.success) {
      onDone()
    } else {
      setError(result.error)
    }
  }

  const inputCls =
    'w-full rounded-lg border border-border bg-background px-2 py-1 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary/40'

  return (
    <>
      <td className="px-4 py-3">
        <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className={inputCls} />
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      </td>
      <td className="px-4 py-3 hidden sm:table-cell">
        <input value={form.short_tag} onChange={(event) => setForm((current) => ({ ...current, short_tag: event.target.value }))} className={inputCls} />
      </td>
      <td className="px-4 py-3 hidden md:table-cell">
        <select
          value={form.faculty}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              faculty: event.target.value,
              department_id: '',
            }))
          }
          className={inputCls}
        >
          <option value="">…</option>
          {FACULTIES.map((faculty) => (
            <option key={faculty.value} value={faculty.value}>
              {faculty.label}
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-3 hidden md:table-cell">
        <select value={form.department_id} onChange={(event) => setForm((current) => ({ ...current, department_id: event.target.value }))} className={inputCls}>
          <option value="">…</option>
          {availableDepartments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-3 hidden md:table-cell">
        <select value={form.semester} onChange={(event) => setForm((current) => ({ ...current, semester: event.target.value }))} className={inputCls}>
          <option value="">…</option>
          <option value="zimní">Zimní</option>
          <option value="letní">Letní</option>
          <option value="oba">Oba</option>
        </select>
      </td>
      <td className="px-4 py-3 hidden lg:table-cell">
        <input
          type="number"
          min={1}
          max={5}
          value={form.difficulty}
          onChange={(event) => setForm((current) => ({ ...current, difficulty: event.target.value }))}
          className={`${inputCls} w-16`}
        />
      </td>
      <td className="px-4 py-3 hidden lg:table-cell">
        <input
          type="number"
          min={1}
          max={30}
          value={form.credits}
          onChange={(event) => setForm((current) => ({ ...current, credits: event.target.value }))}
          className={`${inputCls} w-16`}
        />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button onClick={handleSave} disabled={saving} className="rounded-lg bg-primary/10 p-1.5 text-primary transition-colors hover:bg-primary/20 disabled:opacity-50">
            <Check className="h-4 w-4" />
          </button>
          <button onClick={onDone} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
      </td>
    </>
  )
}

function SubjectRowComp({ subject, departments }: { subject: SubjectRow; departments: DepartmentOption[] }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [deleting, startDeleting] = useTransition()
  const [deleted, setDeleted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    if (!confirm(`Opravdu smazat "${subject.name}"? Tato akce je nevratná.`)) return

    startDeleting(async () => {
      const result = await deleteSubject(subject.id)
      if (result.success) {
        setDeleted(true)
        router.refresh()
      } else {
        setError(result.error)
      }
    })
  }

  if (deleted) return null

  const departmentName = subject.department_ref?.name ?? subject.department ?? '…'

  return (
    <tr className="border-b border-border/50 transition-colors hover:bg-muted/30 last:border-0">
      {editing ? (
        <EditRow subject={subject} departments={departments} onDone={() => {
          setEditing(false)
          router.refresh()
        }} />
      ) : (
        <>
          <td className="px-4 py-3">
            <span className="text-sm font-medium text-foreground">{subject.name}</span>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </td>
          <td className="px-4 py-3 hidden sm:table-cell">
            <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-xs font-semibold text-primary/80">{subject.short_tag}</span>
          </td>
          <td className="px-4 py-3 hidden md:table-cell text-sm text-muted-foreground">{subject.faculty ?? '…'}</td>
          <td className="px-4 py-3 hidden md:table-cell text-sm text-muted-foreground">{departmentName}</td>
          <td className="px-4 py-3 hidden md:table-cell text-sm text-muted-foreground">{subject.semester ?? '…'}</td>
          <td className="px-4 py-3 hidden lg:table-cell text-center text-sm">{subject.difficulty ?? '…'}</td>
          <td className="px-4 py-3 hidden lg:table-cell text-center text-sm">{subject.credits ?? '…'}</td>
          <td className="px-4 py-3">
            <div className="flex items-center gap-2">
              <button onClick={() => setEditing(true)} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </button>
            </div>
          </td>
        </>
      )}
    </tr>
  )
}

export function SubjectAdminTable({ subjects, departments }: Props) {
  const [search, setSearch] = useState('')

  const filtered = subjects.filter((subject) =>
    subject.name.toLowerCase().includes(search.toLowerCase()) ||
    subject.short_tag.toLowerCase().includes(search.toLowerCase()) ||
    (subject.department_ref?.name ?? subject.department ?? '').toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="space-y-4">
      <input
        type="text"
        placeholder="Hledat předmět, zkratku nebo katedru…"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="w-full max-w-sm rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary/40 focus:ring-1 focus:ring-primary/40"
      />

      <div className="w-full overflow-x-auto rounded-xl border border-border">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              {['Název', 'Zkratka', 'Fakulta', 'Katedra', 'Semestr', 'Obtíž.', 'Kr.', 'Akce'].map((heading, index) => (
                <th
                  key={heading}
                  className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground ${
                    index >= 2 && index <= 4 ? 'hidden md:table-cell' : ''
                  } ${index >= 5 && index <= 6 ? 'hidden lg:table-cell' : ''}`}
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  Žádné předměty
                </td>
              </tr>
            ) : (
              filtered.map((subject) => <SubjectRowComp key={subject.id} subject={subject} departments={departments} />)
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

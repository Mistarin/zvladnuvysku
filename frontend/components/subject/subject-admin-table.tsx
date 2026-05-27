'use client'

import { useState } from 'react'
import { Pencil, Trash2, Check, X } from 'lucide-react'
import { deleteSubject, updateSubject } from '@/app/admin/actions'

interface SubjectRow {
  id: string
  name: string
  short_tag: string
  faculty: string | null
  semester: string | null
  difficulty: number | null
  credits: number | null
  slug: string
}

interface Props {
  subjects: SubjectRow[]
}

function EditRow({ subject, onDone }: { subject: SubjectRow; onDone: () => void }) {
  const [form, setForm] = useState({
    name: subject.name,
    short_tag: subject.short_tag,
    faculty: subject.faculty ?? '',
    semester: subject.semester ?? '',
    difficulty: subject.difficulty ?? '',
    credits: subject.credits ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    const result = await updateSubject(subject.id, {
      name: form.name,
      short_tag: form.short_tag,
      faculty: form.faculty || null,
      semester: form.semester || null,
      difficulty: form.difficulty !== '' ? Number(form.difficulty) : null,
      credits: form.credits !== '' ? Number(form.credits) : null,
    })
    setSaving(false)
    if (result.success) {
      onDone()
    } else {
      setError(result.error)
    }
  }

  const inputCls = "w-full rounded-lg border border-border bg-background px-2 py-1 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary/40"

  return (
    <>
      <td className="px-4 py-3">
        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      </td>
      <td className="px-4 py-3 hidden sm:table-cell">
        <input value={form.short_tag} onChange={e => setForm(f => ({ ...f, short_tag: e.target.value }))} className={inputCls} />
      </td>
      <td className="px-4 py-3 hidden md:table-cell">
        <input value={form.faculty} onChange={e => setForm(f => ({ ...f, faculty: e.target.value }))} className={inputCls} />
      </td>
      <td className="px-4 py-3 hidden md:table-cell">
        <select value={form.semester} onChange={e => setForm(f => ({ ...f, semester: e.target.value }))} className={inputCls}>
          <option value="">—</option>
          <option value="zimní">Zimní</option>
          <option value="letní">Letní</option>
          <option value="oba">Oba</option>
        </select>
      </td>
      <td className="px-4 py-3 hidden lg:table-cell">
        <input type="number" min={1} max={5} value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))} className={`${inputCls} w-16`} />
      </td>
      <td className="px-4 py-3 hidden lg:table-cell">
        <input type="number" min={1} max={30} value={form.credits} onChange={e => setForm(f => ({ ...f, credits: e.target.value }))} className={`${inputCls} w-16`} />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button onClick={handleSave} disabled={saving} className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50">
            <Check className="w-4 h-4" />
          </button>
          <button onClick={onDone} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
      </td>
    </>
  )
}

function SubjectRowComp({ subject }: { subject: SubjectRow }) {
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleted, setDeleted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    if (!confirm(`Opravdu smazat "${subject.name}"? Tato akce je nevratná.`)) return
    setDeleting(true)
    const result = await deleteSubject(subject.id)
    if (result.success) {
      setDeleted(true)
    } else {
      setError(result.error)
      setDeleting(false)
    }
  }

  if (deleted) return null

  return (
    <tr className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
      {editing ? (
        <EditRow subject={subject} onDone={() => setEditing(false)} />
      ) : (
        <>
          <td className="px-4 py-3">
            <span className="font-medium text-foreground text-sm">{subject.name}</span>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </td>
          <td className="px-4 py-3 hidden sm:table-cell">
            <span className="font-mono text-xs font-semibold text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded">{subject.short_tag}</span>
          </td>
          <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">{subject.faculty ?? '—'}</td>
          <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">{subject.semester ?? '—'}</td>
          <td className="px-4 py-3 text-sm text-center hidden lg:table-cell">{subject.difficulty ?? '—'}</td>
          <td className="px-4 py-3 text-sm text-center hidden lg:table-cell">{subject.credits ?? '—'}</td>
          <td className="px-4 py-3">
            <div className="flex items-center gap-2">
              <button onClick={() => setEditing(true)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={handleDelete} disabled={deleting} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </td>
        </>
      )}
    </tr>
  )
}

export function SubjectAdminTable({ subjects }: Props) {
  const [search, setSearch] = useState('')

  const filtered = subjects.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.short_tag.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <input
        type="text"
        placeholder="Hledat předmět nebo zkratku…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full max-w-sm rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 transition-all"
      />

      <div className="w-full overflow-x-auto rounded-xl border border-border">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              {['Název', 'Zkratka', 'Fakulta', 'Semestr', 'Obtíž.', 'Kr.', 'Akce'].map((h, i) => (
                <th key={h} className={`px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider ${i >= 2 && i <= 3 ? 'hidden md:table-cell' : ''} ${i >= 4 && i <= 5 ? 'hidden lg:table-cell' : ''}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">Žádné předměty</td>
              </tr>
            ) : (
              filtered.map(s => <SubjectRowComp key={s.id} subject={s} />)
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

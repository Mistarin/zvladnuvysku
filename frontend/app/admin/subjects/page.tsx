import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminAutoRefresh } from '@/components/admin/admin-auto-refresh'
import { SubjectAdminTable } from '@/components/subject/subject-admin-table'
import { ShieldAlert } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Správa předmětů … Admin',
}

export default async function AdminSubjectsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/prihlaseni')

  const role = user.app_metadata?.role as string | undefined

  const isAdmin = role === 'admin' || role === 'moderator'

  if (!isAdmin) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-24 text-center space-y-4">
        <ShieldAlert className="w-16 h-16 text-destructive/60 mx-auto" />
        <h1 className="text-2xl font-bold text-foreground">Přístup odepřen</h1>
        <p className="text-muted-foreground">Tato stránka je dostupná pouze pro administrátory a moderátory.</p>
      </div>
    )
  }

  const [{ data: subjects }, { data: departments }] = await Promise.all([
    supabase
    .from('subjects')
    .select('id, name, short_tag, faculty, semester, difficulty, credits, slug, department, department_id, department_ref:department_id(id, name, faculty)')
    .order('name', { ascending: true }),
    supabase
      .from('departments')
      .select('id, name, faculty, slug')
      .order('faculty')
      .order('name', { ascending: true }),
  ])

  return (
    <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <AdminAutoRefresh />
      {/* Nav tabs */}
      <div className="flex items-center gap-4 border-b border-white/5 pb-4">
        <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Čekající návrhy
        </Link>
        <Link href="/admin/materialy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          Správa materiálů
        </Link>
        <Link href="/admin/katedry" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          Správa kateder
        </Link>
        <span className="text-sm font-semibold text-foreground">Správa předmětů</span>
      </div>

      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">Správa předmětů</h1>
        <p className="text-muted-foreground text-sm">{subjects?.length ?? 0} předmětů v databázi</p>
      </div>

      <SubjectAdminTable subjects={(subjects as never[]) ?? []} departments={(departments as never[]) ?? []} />
    </div>
  )
}

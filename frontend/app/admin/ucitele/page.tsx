import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TeacherList } from './teacher-list'
import { ShieldAlert, Users } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Správa vyučujících | Admin panel',
  description: 'Správa databáze vyučujících na ZvládnuVýšku.',
}

export default async function AdminTeachersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/prihlaseni')

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

  const { data: teachers, error } = await supabase
    .from('teachers')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    console.error("Error fetching teachers:", error)
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center gap-3 border-b border-border pb-4">
        <div className="p-2.5 bg-primary/10 rounded-xl">
          <Users className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Správa vyučujících
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Přidávejte, upravujte nebo odstraňujte profily vyučujících.
          </p>
        </div>
      </div>

      <TeacherList initialTeachers={teachers || []} />
    </div>
  )
}

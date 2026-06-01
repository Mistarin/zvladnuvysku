import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SubjectProposalForm } from '@/components/subject/subject-proposal-form'

export const metadata: Metadata = {
  title: 'Navrhnout předmět',
  description: 'Navrhni nový předmět nebo uprav informace o existujícím předmětu.',
}

export default async function NavrhnoutPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/prihlaseni')
  const profile = (
    await supabase
      .from('profiles')
      .select('display_name')
      .eq('user_id', user.id)
      .maybeSingle()
  ).data ?? null
  const hasDisplayName = Boolean((profile as { display_name?: string | null } | null)?.display_name?.trim())

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-2 mb-8">
        <h1 className="text-3xl font-bold text-foreground">Navrhnout předmět</h1>
        <p className="text-muted-foreground">
          Chybí ti tady nějaký předmět, nebo máš lepší informace? Pošli nám návrh a moderátor ho brzy zkontroluje.
        </p>
      </div>
      <SubjectProposalForm hasDisplayName={hasDisplayName} />
    </div>
  )
}

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

  return (
    <div className="container mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-2 mb-8">
        <h1 className="text-3xl font-bold text-foreground">Navrhnout předmět</h1>
        <p className="text-muted-foreground">
          Chybí ti tady nějaký předmět, nebo máš lepší informace? Pošli nám návrh a moderátor ho brzy zkontroluje.
        </p>
      </div>
      <SubjectProposalForm userId={user.id} />
    </div>
  )
}

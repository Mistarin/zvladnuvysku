import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SubjectProposalForm } from '@/components/subject/subject-proposal-form'

export const metadata: Metadata = {
  title: 'Navrhnout předmět',
  description: 'Navrhni nový předmět nebo uprav informace o existujícím předmětu.',
}

export default async function NavrhnoutPage() {
  let hasDisplayName = false

  try {
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
      <SubjectProposalForm hasDisplayName={hasDisplayName} />
    </div>
  )
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

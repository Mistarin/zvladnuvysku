import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { EmailLoginForm } from '@/components/auth/email-login-form'

export const metadata: Metadata = {
  title: 'Přihlášení',
  description: 'Přihlaste se svým školním účtem Ostravské univerzity (@osu.cz).',
}

export default async function PrihlaseniPage() {
  // Pokud je už přihlášen — přesměruj
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/')

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl accent-gradient flex items-center justify-center text-white font-bold text-xl mx-auto">
            ZV
          </div>
          <h1 className="text-2xl font-bold text-foreground">Přihlásit se</h1>
          <p className="text-sm text-muted-foreground">
            Pouze pro studenty Ostravské univerzity
          </p>
        </div>

        {/* Login card */}
        <div className="glass-card p-6 space-y-5">
          <EmailLoginForm />

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">@osu.cz</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <p className="text-xs text-center text-muted-foreground leading-relaxed">
            Zadej svůj školní email. Zašleme ti jednorázový odkaz pro přihlášení, nepotřebuješ žádné heslo.
          </p>
        </div>

        {/* Info */}
        <div className="rounded-xl border border-border bg-muted/30 p-4 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground text-sm">K čemu slouží přihlášení?</p>
          <ul className="space-y-0.5 list-disc list-inside">
            <li>Hodnocení předmětů</li>
            <li>Vytváření a ukládání flashcardů</li>
            <li>Sledování pokroku studia</li>
          </ul>
        </div>

      </div>
    </div>
  )
}

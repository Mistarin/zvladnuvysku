import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { EmailLoginForm } from '@/components/auth/email-login-form'
import { resolvePostAuthRedirect } from '@/lib/auth/post-auth'
import { getRequestOrigin } from '@/lib/server-origin'

export const metadata: Metadata = {
  title: 'Přihlášení',
  description: 'Přihlaste se svým školním účtem Ostravské univerzity (@osu.cz).',
}

interface PageProps {
  searchParams: Promise<{ redirect_to?: string }>
}

export default async function PrihlaseniPage({ searchParams }: PageProps) {
  // Pokud je už přihlášen — přesměruj
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { redirect_to } = await searchParams
  if (user) {
    const origin = await getRequestOrigin()
    redirect(resolvePostAuthRedirect(redirect_to ?? null, origin))
  }

  return (
    <div className="min-h-[calc(100dvh-56px)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">

        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Zpět na hlavní stránku
        </Link>

        {/* Header */}
        <div className="text-center space-y-2">
          <Image
            src="/logo-v2.png"
            alt="ZvládnuVýšku"
            width={72}
            height={72}
            className="mx-auto"
            priority
          />
          <h1 className="text-2xl font-bold text-foreground">Přihlásit se</h1>
          <p className="text-sm text-muted-foreground">
            Pouze pro studenty Ostravské univerzity
          </p>
        </div>

        {/* Login card */}
        <div className="glass-card p-6 space-y-5">
          <EmailLoginForm redirectTo={redirect_to} />

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">@osu.cz</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <p className="text-xs text-center text-muted-foreground leading-relaxed">
            Zadej svůj školní email. Zašleme ti jednorázový odkaz pro přihlášení, nepotřebuješ žádné heslo.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-muted/30 p-4 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground text-sm">K čemu slouží přihlášení?</p>
          <ul className="space-y-0.5 list-disc list-inside">
            <li>Hodnocení předmětů</li>
            <li>Vytváření a ukládání kartiček</li>
            <li>Sledování pokroku studia</li>
          </ul>
        </div>

      </div>
    </div>
  )
}

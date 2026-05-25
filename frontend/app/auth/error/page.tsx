import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Chyba přihlášení',
  description: 'Přihlášení se nezdařilo.',
}

const REASONS: Record<string, { title: string; desc: string }> = {
  not_ou_student: {
    title: 'Přístup jen pro studenty OU',
    desc: 'ZvládnuVýšku je určen výhradně pro studenty Ostravské univerzity. Přihlaš se prosím svým školním účtem @osu.cz.',
  },
  exchange_failed: {
    title: 'Přihlášení selhalo',
    desc: 'Nastala chyba při ověřování tvého účtu. Zkus to prosím znovu.',
  },
  no_code: {
    title: 'Neplatný odkaz',
    desc: 'Přihlašovací odkaz je neplatný nebo vypršel. Zkus se přihlásit znovu.',
  },
}

interface PageProps {
  searchParams: Promise<{ reason?: string; email?: string }>
}

export default async function AuthErrorPage({ searchParams }: PageProps) {
  const { reason = 'exchange_failed', email } = await searchParams
  const { title, desc } = REASONS[reason] ?? REASONS.exchange_failed

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto text-3xl">
          🔒
        </div>

        {/* Text */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          <p className="text-muted-foreground leading-relaxed">{desc}</p>
          {email && reason === 'not_ou_student' && (
            <p className="text-sm text-muted-foreground/70 mt-2">
              Přihlášen jako:{' '}
              <span className="font-mono text-destructive">{email}</span>
            </p>
          )}
        </div>

        {/* Hint pro not_ou_student */}
        {reason === 'not_ou_student' && (
          <div className="rounded-xl border border-border bg-muted/50 p-4 text-sm text-left space-y-1">
            <p className="font-medium text-foreground">Jak se přihlásit správně:</p>
            <ol className="list-decimal list-inside text-muted-foreground space-y-1">
              <li>Odhlás se z osobního Microsoft účtu</li>
              <li>Klikni znovu na &ldquo;Přihlásit přes Microsoft&rdquo;</li>
              <li>Vyber nebo zadej svůj <strong>@osu.cz</strong> email</li>
            </ol>
          </div>
        )}

        {/* CTA */}
        <Link
          href="/prihlaseni"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium text-sm accent-gradient text-white hover:opacity-90 transition-all"
        >
          Zkusit znovu
        </Link>
      </div>
    </div>
  )
}

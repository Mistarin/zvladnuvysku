import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { verifyMagicLink } from './actions'

export const metadata: Metadata = {
  title: 'Přihlášení',
  robots: { index: false },
}

interface Props {
  searchParams: Promise<{
    token_hash?: string
    type?: string
    redirect_to?: string
  }>
}

export default async function ConfirmPage({ searchParams }: Props) {
  const params = await searchParams
  const { token_hash, type, redirect_to } = params

  // If required params are missing, show error state
  const isValid = Boolean(token_hash && type)

  return (
    <div className="min-h-[calc(100dvh-56px)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div className="space-y-3">
          <Image
            src="/logo-v2.png"
            alt="ZvládnuVýšku"
            width={64}
            height={64}
            className="mx-auto"
            priority
          />
          <h1 className="text-2xl font-bold text-foreground">
            {isValid ? 'Dokončit přihlášení' : 'Neplatný odkaz'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isValid
              ? 'Klikni na tlačítko níže pro dokončení přihlášení.'
              : 'Přihlašovací odkaz je neplatný, vypršel nebo byl již použit.'}
          </p>
        </div>

        <div className="glass-card p-6 space-y-5">
          {isValid ? (
            <form action={verifyMagicLink}>
              <input type="hidden" name="token_hash" value={token_hash} />
              <input type="hidden" name="type" value={type} />
              {redirect_to && (
                <input type="hidden" name="redirect_to" value={redirect_to} />
              )}
              <button
                type="submit"
                className="w-full py-3 px-6 rounded-xl font-semibold text-white text-sm transition-all"
                style={{
                  background: 'linear-gradient(135deg, #769722, #5a7319)',
                }}
              >
                Přihlásit se →
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-destructive">
                Odkaz je platný pouze 10 minut a lze ho použít jen jednou.
              </p>
              <Link
                href="/prihlaseni"
                className="block w-full py-3 px-6 rounded-xl font-semibold text-white text-sm text-center transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #769722, #5a7319)' }}
              >
                Poslat nový odkaz →
              </Link>
            </div>
          )}
        </div>

        {isValid && (
          <p className="text-xs text-muted-foreground">
            Odkaz je platný 10 minut a lze ho použít pouze jednou.
          </p>
        )}

        <Link href="/prihlaseni" className="block text-xs text-muted-foreground hover:text-foreground transition-colors">
          ← Zpět na přihlášení
        </Link>
      </div>
    </div>
  )
}

'use client'

import { useEffect } from 'react'

export default function NavrhnoutError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[navrhnout] Route error boundary:', error)
  }, [error])

  return (
    <div className="container mx-auto max-w-2xl px-4 py-16 text-center sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-border bg-card p-8 ">
        <h1 className="text-2xl font-bold text-foreground">Návrh se nepodařilo načíst</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Stránka narazila na chybu při načítání. Zkus to znovu, nebo se odhlaš a přihlaš.
        </p>
        {error.digest ? (
          <p className="mt-3 font-mono text-xs text-muted-foreground">Digest: {error.digest}</p>
        ) : null}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Zkusit znovu
          </button>
          <a
            href="/prihlaseni?redirect_to=/navrhnout"
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            Přihlásit znovu
          </a>
        </div>
      </div>
    </div>
  )
}

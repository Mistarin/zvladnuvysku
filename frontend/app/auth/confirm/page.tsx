import type { Metadata } from 'next'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { verifyMagicLink } from './actions'

export const metadata: Metadata = {
  title: 'Potvrdit přihlášení',
  description: 'Dokončení přihlášení do ZvládnuVýšku.',
  robots: {
    index: false,
    follow: false,
  },
}

type PageProps = {
  searchParams: Promise<{
    token_hash?: string
    type?: string
    redirect_to?: string
  }>
}

export default async function ConfirmAuthPage({ searchParams }: PageProps) {
  const { token_hash: tokenHash, type, redirect_to: redirectTo } = await searchParams

  if (!tokenHash || !type) {
    redirect('/auth/error?reason=invalid_link')
  }

  return (
    <div className="flex min-h-[calc(100vh-56px)] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center ">
        <Image
          src="/logo-v2.png"
          alt="ZvládnuVýšku"
          width={64}
          height={64}
          className="mx-auto"
          priority
        />
        <h1 className="mt-6 text-2xl font-bold text-foreground">Dokončit přihlášení</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Pro bezpečné dokončení klikni na tlačítko níže. Samotné otevření emailu přihlašovací odkaz nepoužije.
        </p>

        <form action={verifyMagicLink} className="mt-7">
          <input type="hidden" name="token_hash" value={tokenHash} />
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="redirect_to" value={redirectTo ?? '/'} />
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Přihlásit se
          </button>
        </form>

        <p className="mt-4 text-xs text-muted-foreground">
          Odkaz je jednorázový a platí jen krátce.
        </p>
      </div>
    </div>
  )
}

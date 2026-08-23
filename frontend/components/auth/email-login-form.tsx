'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'

interface EmailLoginFormProps {
  redirectTo?: string
}

type FormStatus = 'idle' | 'loading' | 'code' | 'verifying' | 'error'

function getSafeRedirect(rawRedirectTo?: string) {
  if (!rawRedirectTo || !rawRedirectTo.startsWith('/') || rawRedirectTo.startsWith('//')) {
    return '/'
  }

  return rawRedirectTo
}

export function EmailLoginForm({ redirectTo }: EmailLoginFormProps) {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [status, setStatus] = useState<FormStatus>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const [isPendingResend, startResendTransition] = useTransition()

  const startCooldown = () => {
    setCooldown(60)
    const interval = window.setInterval(() => {
      setCooldown((current) => {
        if (current <= 1) {
          window.clearInterval(interval)
          return 0
        }
        return current - 1
      })
    }, 1000)
  }

  const sendCode = async (emailToSend: string) => {
    const supabase = createClient()
    return supabase.auth.signInWithOtp({
      email: emailToSend,
      options: { shouldCreateUser: true },
    })
  }

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault()

    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedEmail) return

    if (!trimmedEmail.endsWith('@osu.cz')) {
      setStatus('error')
      setErrorMessage('Použij prosím svůj školní email s koncovkou @osu.cz')
      return
    }

    setStatus('loading')
    setErrorMessage('')
    const { error } = await sendCode(trimmedEmail)

    if (error) {
      console.error(error)
      setStatus('error')
      setErrorMessage(error.message.includes('rate_limit')
        ? 'Příliš mnoho pokusů. Zkus to prosím znovu za chvíli.'
        : 'Nepodařilo se odeslat kód. Zkus to znovu.')
      return
    }

    setEmail(trimmedEmail)
    setStatus('code')
    startCooldown()
  }

  const handleVerify = async (event: React.FormEvent) => {
    event.preventDefault()

    const normalizedCode = code.replace(/\D/g, '').slice(0, 6)
    if (normalizedCode.length !== 6) {
      setStatus('error')
      setErrorMessage('Zadej šestimístný kód z emailu.')
      return
    }

    setStatus('verifying')
    setErrorMessage('')
    const supabase = createClient()
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: normalizedCode,
      type: 'email',
    })

    if (error) {
      setStatus('error')
      setErrorMessage(error.message.includes('expired')
        ? 'Kód vypršel. Pošli si nový kód.'
        : 'Kód není platný. Zkontroluj ho a zkus to znovu.')
      return
    }

    window.location.assign(getSafeRedirect(redirectTo))
  }

  const handleResend = () => {
    if (cooldown > 0 || isPendingResend) return

    startResendTransition(async () => {
      const { error } = await sendCode(email)
      if (error) {
        setStatus('error')
        setErrorMessage(error.message.includes('rate_limit')
          ? 'Příliš mnoho pokusů. Zkus to prosím znovu za chvíli.'
          : 'Nepodařilo se odeslat kód. Zkus to znovu.')
        return
      }

      setStatus('code')
      setCode('')
      startCooldown()
    })
  }

  if (status === 'code' || status === 'verifying' || (status === 'error' && email && code)) {
    return (
      <form onSubmit={handleVerify} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="otp-code" className="text-sm font-medium text-foreground">
            Přihlašovací kód
          </label>
          <input
            id="otp-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            value={code}
            onChange={(event) => {
              setCode(event.target.value.replace(/\D/g, '').slice(0, 6))
              if (status === 'error') setStatus('code')
            }}
            placeholder="123456"
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-center font-mono text-xl tracking-[0.35em] text-foreground placeholder:text-muted-foreground/50 outline-none transition-colors focus:border-primary/40 focus:ring-2 focus:ring-primary/40"
            disabled={status === 'verifying'}
            autoFocus
            aria-describedby="otp-hint"
          />
          <p id="otp-hint" className="text-xs leading-5 text-muted-foreground">
            Kód jsme poslali na <span className="font-medium text-foreground">{email}</span>. Platí 10 minut.
          </p>
        </div>

        {status === 'error' && errorMessage ? (
          <p className="text-sm text-destructive" role="alert" aria-live="polite">{errorMessage}</p>
        ) : null}

        <button
          type="submit"
          disabled={status === 'verifying' || code.length !== 6}
          className="w-full rounded-xl px-6 py-3.5 text-sm font-medium primary-action text-white transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === 'verifying' ? 'Ověřuji kód…' : 'Potvrdit kód'}
        </button>

        <div className="flex flex-col gap-2 pt-1">
          <button
            type="button"
            onClick={handleResend}
            disabled={cooldown > 0 || isPendingResend || status === 'verifying'}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPendingResend ? 'Odesílám…' : cooldown > 0 ? `Nový kód za ${cooldown}s` : 'Poslat nový kód'}
          </button>
          <button
            type="button"
            onClick={() => { setStatus('idle'); setEmail(''); setCode(''); setErrorMessage('') }}
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Zadat jiný email
          </button>
        </div>
      </form>
    )
  }

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium text-foreground">
          Školní email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value)
            if (status === 'error') setStatus('idle')
          }}
          placeholder="jmeno.prijmeni@osu.cz"
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary/40 focus:ring-2 focus:ring-primary/40"
          disabled={status === 'loading'}
        />
      </div>

      {status === 'error' && errorMessage ? (
        <p className="text-sm text-destructive" role="alert" aria-live="polite">{errorMessage}</p>
      ) : null}

      <button
        type="submit"
        disabled={status === 'loading' || !email.trim()}
        className="flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-medium primary-action text-white transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === 'loading' ? 'Odesílám kód…' : 'Odeslat přihlašovací kód'}
      </button>
    </form>
  )
}

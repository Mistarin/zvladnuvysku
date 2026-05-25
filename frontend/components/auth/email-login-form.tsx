'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function EmailLoginForm() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const trimmedEmail = email.trim()
    if (!trimmedEmail) return
    
    if (!trimmedEmail.endsWith('@osu.cz')) {
      setStatus('error')
      setErrorMessage('Použij prosím svůj školní email s koncovkou @osu.cz')
      return
    }

    setStatus('loading')
    const supabase = createClient()
    
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmedEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      console.error(error)
      setStatus('error')
      setErrorMessage(error.message.includes('rate_limit') 
        ? 'Příliš mnoho pokusů. Zkus to prosím znovu za chvíli.' 
        : 'Nepodařilo se odeslat email. Zkus to znovu.')
    } else {
      setStatus('success')
    }
  }

  if (status === 'success') {
    return (
      <div className="text-center py-4 space-y-3">
        <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-2xl mx-auto mb-2">
          ✉️
        </div>
        <p className="font-medium text-foreground">Odkaz odeslán!</p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Zkontroluj svou schránku <span className="font-mono text-foreground">{email}</span> a klikni na přihlašovací odkaz.
        </p>
        <p className="text-xs text-muted-foreground mt-4">
          Někdy může email spadnout do spamu.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium text-foreground">
          Školní email
        </label>
        <div className="relative">
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (status === 'error') setStatus('idle')
            }}
            placeholder="jmeno.prijmeni@osu.cz"
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/40 focus:border-primary/40 outline-none transition-all"
            disabled={status === 'loading'}
          />
        </div>
      </div>

      {status === 'error' && (
        <p className="text-sm text-destructive">{errorMessage}</p>
      )}

      <button
        type="submit"
        disabled={status === 'loading' || !email.trim()}
        className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-medium text-sm accent-gradient text-white hover:opacity-90 transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {status === 'loading' ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Odesílám...</span>
          </>
        ) : (
          <span>Odeslat přihlašovací odkaz</span>
        )}
      </button>
    </form>
  )
}

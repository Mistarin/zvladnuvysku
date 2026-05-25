'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function MicrosoftLoginButton() {
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async () => {
    setIsLoading(true)
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        scopes: 'email profile openid',
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    // isLoading zůstane true — stránka se přesměruje
  }

  return (
    <button
      onClick={handleLogin}
      disabled={isLoading}
      id="microsoft-login-btn"
      className="
        w-full flex items-center justify-center gap-3
        px-6 py-3.5 rounded-xl font-medium text-sm
        bg-card border border-border
        hover:bg-muted hover:border-border/80
        transition-all duration-150
        disabled:opacity-60 disabled:cursor-not-allowed
      "
    >
      {isLoading ? (
        <>
          <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <span>Přihlašuji...</span>
        </>
      ) : (
        <>
          {/* Microsoft logo SVG */}
          <svg width="20" height="20" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
            <rect x="1" y="1" width="9" height="9" fill="#f25022" />
            <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
            <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
            <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
          </svg>
          <span>Přihlásit se přes Microsoft</span>
        </>
      )}
    </button>
  )
}

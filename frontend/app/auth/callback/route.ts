import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/types/database'

const ALLOWED_DOMAIN = 'osu.cz'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const rawNext = searchParams.get('next')
  const next = rawNext?.startsWith('/') ? rawNext : '/moje-aktivita'

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/error?reason=no_code`)
  }

  const cookieStore = await cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user) {
    console.error('Auth callback error:', error)
    return NextResponse.redirect(`${origin}/auth/error?reason=exchange_failed`)
  }

  // Ověření @osu.cz domény — split na @ aby se zabránilo bypass přes fake-osu.cz
  const email = data.user.email ?? ''
  const emailDomain = email.split('@')[1]?.toLowerCase()
  if (emailDomain !== ALLOWED_DOMAIN) {
    // Odhlásíme uživatele — session nesmí zůstat
    await supabase.auth.signOut()
    return NextResponse.redirect(
      `${origin}/auth/error?reason=not_ou_student&email=${encodeURIComponent(email)}`
    )
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('user_id', data.user.id)
    .maybeSingle()

  const displayName = (profile as { display_name?: string | null } | null)?.display_name?.trim()
  const response = NextResponse.redirect(`${origin}${next}`)

  if (!displayName) {
    response.cookies.set('needs_display_name', '1', {
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    })
  } else {
    response.cookies.delete('needs_display_name')
  }

  // Vše OK — přesměrovat na cílovou stránku
  return response
}

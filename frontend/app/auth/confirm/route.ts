import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { EmailOtpType } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'
import { buildPostAuthRedirectResponse, isAllowedSchoolEmail, resolvePostAuthRedirect } from '@/lib/auth/post-auth'
import { getRequestOrigin } from '@/lib/server-origin'

const ALLOWED_EMAIL_TYPES = new Set<EmailOtpType>([
  'signup',
  'invite',
  'magiclink',
  'recovery',
  'email_change',
  'email',
])

function parseEmailOtpType(type: string | null): EmailOtpType | null {
  if (!type || !ALLOWED_EMAIL_TYPES.has(type as EmailOtpType)) {
    return null
  }

  return type as EmailOtpType
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const origin = await getRequestOrigin()
  const tokenHash = searchParams.get('token_hash')
  const type = parseEmailOtpType(searchParams.get('type'))
  const redirectPath = resolvePostAuthRedirect(searchParams.get('redirect_to'), origin)

  if (!tokenHash || !type) {
    return NextResponse.redirect(`${origin}/auth/error?reason=invalid_link`)
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

  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  })

  if (error || !data.user) {
    console.error('Auth confirm error:', error)
    return NextResponse.redirect(`${origin}/auth/error?reason=verify_failed`)
  }

  const email = data.user.email ?? ''
  if (!isAllowedSchoolEmail(email)) {
    await supabase.auth.signOut()
    return NextResponse.redirect(
      `${origin}/auth/error?reason=not_ou_student&email=${encodeURIComponent(email)}`
    )
  }

  return buildPostAuthRedirectResponse({
    supabase,
    userId: data.user.id,
    origin,
    redirectPath,
  })
}

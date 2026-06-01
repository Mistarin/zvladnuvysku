'use server'

import { redirect } from 'next/navigation'
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

export async function verifyMagicLink(formData: FormData) {
  const tokenHash = formData.get('token_hash') as string | null
  const type = parseEmailOtpType(formData.get('type') as string | null)
  const rawRedirectTo = formData.get('redirect_to') as string | null

  const origin = await getRequestOrigin()
  const redirectPath = resolvePostAuthRedirect(rawRedirectTo, origin)

  if (!tokenHash || !type) {
    redirect(`/auth/error?reason=invalid_link`)
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

    // If user is already logged in (link already used but session exists), proceed normally
    const {
      data: { user: existingUser },
    } = await supabase.auth.getUser()

    if (existingUser && isAllowedSchoolEmail(existingUser.email ?? '')) {
      // Already logged in — redirect to destination
      redirect(redirectPath || '/')
    }

    redirect(`/auth/error?reason=verify_failed`)
  }

  const email = data.user.email ?? ''
  if (!isAllowedSchoolEmail(email)) {
    await supabase.auth.signOut()
    redirect(`/auth/error?reason=not_ou_student&email=${encodeURIComponent(email)}`)
  }

  // buildPostAuthRedirectResponse sets a cookie and redirects — but since we're in a
  // server action, we redirect directly and set the cookie separately.
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('user_id', data.user.id)
    .maybeSingle()

  const displayName = (profile as { display_name?: string | null } | null)?.display_name?.trim()

  if (!displayName) {
    cookieStore.set('needs_display_name', '1', {
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    })
  } else {
    cookieStore.delete('needs_display_name')
  }

  redirect(redirectPath || '/')
}

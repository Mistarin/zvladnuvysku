import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'

const ALLOWED_DOMAIN = 'osu.cz'

export function isAllowedSchoolEmail(email: string) {
  return email.split('@')[1]?.toLowerCase() === ALLOWED_DOMAIN
}

export function resolvePostAuthRedirect(rawRedirectTo: string | null, origin: string) {
  if (!rawRedirectTo) {
    return '/'
  }

  if (rawRedirectTo.startsWith('/')) {
    return rawRedirectTo
  }

  try {
    const redirectUrl = new URL(rawRedirectTo)

    if (redirectUrl.origin !== origin) {
      return '/'
    }

    return `${redirectUrl.pathname}${redirectUrl.search}${redirectUrl.hash}` || '/'
  } catch {
    return '/'
  }
}

export async function buildPostAuthRedirectResponse({
  supabase,
  userId,
  origin,
  redirectPath,
}: {
  supabase: SupabaseClient<Database>
  userId: string
  origin: string
  redirectPath: string
}) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('user_id', userId)
    .maybeSingle()

  const displayName = (profile as { display_name?: string | null } | null)?.display_name?.trim()
  const response = NextResponse.redirect(new URL(redirectPath, origin))

  if (!displayName) {
    response.cookies.set('needs_display_name', '1', {
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    })
  } else {
    response.cookies.delete('needs_display_name')
  }

  return response
}

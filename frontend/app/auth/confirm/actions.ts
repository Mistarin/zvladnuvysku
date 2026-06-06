'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { EmailOtpType } from '@supabase/supabase-js'
import { hasCompletedPublicProfileSetup } from '@/lib/legal-consent'
import { createClient } from '@/lib/supabase/server'
import { isAllowedSchoolEmail, resolvePostAuthRedirect } from '@/lib/auth/post-auth'
import { getRequestOrigin } from '@/lib/server-origin'

const ALLOWED_EMAIL_TYPES = new Set<EmailOtpType>([
  'signup',
  'invite',
  'magiclink',
  'recovery',
  'email_change',
  'email',
])

function parseEmailOtpType(type: FormDataEntryValue | null): EmailOtpType | null {
  if (typeof type !== 'string' || !ALLOWED_EMAIL_TYPES.has(type as EmailOtpType)) {
    return null
  }

  return type as EmailOtpType
}

function getStringValue(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value : null
}

async function setPostAuthDisplayNameCookie(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, faculty, secondary_faculty, legal_accepted_at, legal_accepted_version')
    .eq('user_id', userId)
    .maybeSingle()

  const cookieStore = await cookies()

  if (!hasCompletedPublicProfileSetup(profile)) {
    cookieStore.set('needs_display_name', '1', {
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    })
  } else {
    cookieStore.delete('needs_display_name')
  }
}

export async function verifyMagicLink(formData: FormData) {
  const origin = await getRequestOrigin()
  const tokenHash = getStringValue(formData.get('token_hash'))
  const type = parseEmailOtpType(formData.get('type'))
  const redirectPath = resolvePostAuthRedirect(getStringValue(formData.get('redirect_to')), origin)

  if (!tokenHash || !type) {
    redirect('/auth/error?reason=invalid_link')
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  })

  if (error || !data.user) {
    console.error('[auth/confirm] verifyOtp failed:', error?.message ?? 'missing user')

    const {
      data: { user: existingUser },
    } = await supabase.auth.getUser()

    if (existingUser && isAllowedSchoolEmail(existingUser.email ?? '')) {
      await setPostAuthDisplayNameCookie(supabase, existingUser.id)
      redirect(redirectPath)
    }

    redirect('/auth/error?reason=verify_failed')
  }

  const email = data.user.email ?? ''
  if (!isAllowedSchoolEmail(email)) {
    await supabase.auth.signOut()
    redirect(`/auth/error?reason=not_ou_student&email=${encodeURIComponent(email)}`)
  }

  await setPostAuthDisplayNameCookie(supabase, data.user.id)
  redirect(redirectPath)
}

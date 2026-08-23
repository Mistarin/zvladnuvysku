'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import type { Feedback } from '@/lib/types/database'
import { escapeEmailHtml, sendBrevoEmail } from '@/lib/brevo'

type SubmitFeedbackInput = {
  type: Feedback['type']
  message: string
  sourceType?: Feedback['source_type']
  sourceId?: string | null
  sourceLabel?: string | null
}

type ActionResult = { success: true } | { success: false; error: string }

// ---------------------------------------------------------------------------
// In-memory sliding window rate limiter (per Next.js server instance)
// Sufficient protection against casual spam without requiring Redis.
//
// Anon users:          max 3 submissions per 10 minutes per IP
// Authenticated users: max 10 submissions per 60 minutes per user ID
// ---------------------------------------------------------------------------
const rateLimitStore = new Map<string, number[]>()

function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now()
  const timestamps = (rateLimitStore.get(key) ?? []).filter((t) => now - t < windowMs)
  if (timestamps.length >= maxRequests) return false // blocked
  rateLimitStore.set(key, [...timestamps, now])
  return true // allowed
}

async function getClientIp(): Promise<string> {
  const headerStore = await headers()
  return (
    headerStore.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headerStore.get('x-real-ip') ??
    'unknown'
  )
}

export async function submitFeedback(input: SubmitFeedbackInput): Promise<ActionResult> {
  const message = input.message.trim()

  if (!message) {
    return { success: false, error: 'Zpráva nesmí být prázdná.' }
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Rate limiting … check before hitting the database
    if (user) {
      // Authenticated: 10 per hour per user
      if (!checkRateLimit(`user:${user.id}`, 10, 60 * 60 * 1000)) {
        return { success: false, error: 'Příliš mnoho zpráv. Zkus to znovu za hodinu.' }
      }
    } else {
      // Anonymous: 3 per 10 minutes per IP
      const ip = await getClientIp()
      if (!checkRateLimit(`anon:${ip}`, 3, 10 * 60 * 1000)) {
        return { success: false, error: 'Příliš mnoho zpráv. Zkus to znovu za chvíli.' }
      }
    }

    const { error } = await supabase.from('feedback').insert({
      type: input.type,
      message,
      user_id: user?.id ?? null,
      status: 'new',
      is_resolved: false,
      source_type: input.sourceType ?? 'general',
      source_id: input.sourceId ?? null,
      source_label: input.sourceLabel ?? null,
    } as never)

    if (error) {
      return { success: false, error: `Nepodařilo se odeslat zprávu: ${error.message}` }
    }

    const senderLabel = user?.email ?? 'anonymní návštěvník'
    const sourceLabel = input.sourceLabel?.trim() || 'Obecný feedback'
    const safeMessage = escapeEmailHtml(message).replace(/\n/g, '<br>')
    const safeSender = escapeEmailHtml(senderLabel)
    const safeSource = escapeEmailHtml(sourceLabel)

    try {
      await sendBrevoEmail({
        subject: `[ZvládnuVýšku] Nový feedback: ${sourceLabel}`,
        htmlContent: `
          <h2>Nový feedback</h2>
          <p><strong>Zdroj:</strong> ${safeSource}</p>
          <p><strong>Odesílatel:</strong> ${safeSender}</p>
          <p>${safeMessage}</p>
        `,
        textContent: `Nový feedback\n\nZdroj: ${sourceLabel}\nOdesílatel: ${senderLabel}\n\n${message}`,
      })
    } catch (notificationError) {
      console.error('Brevo feedback notification failed:', notificationError)
    }

    revalidatePath('/admin')
    if (user) {
      revalidatePath('/moje-aktivita')
    }
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Nepodařilo se odeslat zprávu.',
    }
  }
}

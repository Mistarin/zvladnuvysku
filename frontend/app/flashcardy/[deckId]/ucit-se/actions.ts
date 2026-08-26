'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { calculateNextReview, type SM2Result } from '@/lib/sm2'
import type { CardProgress, Database } from '@/lib/types/database'

export async function saveCardReview(
  cardId: string,
  quality: 0 | 1 | 2 | 3 | 4 | 5
): Promise<SM2Result> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/prihlaseni')
  }

  // Preferred path: single atomic RPC that reads and advances SM-2 state in
  // one statement, so concurrent study sessions cannot lose updates.
  const { data: rpcResult, error: rpcError } = await supabase
    .rpc('record_card_review', { p_card_id: cardId, p_quality: quality })
    .maybeSingle()

  // Depending on PostgREST serialization the jsonb result arrives either
  // unwrapped or nested under the function name — handle both.
  const rowData = (Array.isArray(rpcResult) ? rpcResult[0] : rpcResult) as
    | Record<string, unknown>
    | { record_card_review: Record<string, unknown> }
    | null
  const candidate =
    rowData && typeof rowData === 'object' && 'nextInterval' in rowData
      ? rowData
      : (rowData as { record_card_review?: Record<string, unknown> } | null)?.record_card_review

  const payload = candidate as Record<string, unknown> | undefined

  if (!rpcError && payload && 'nextInterval' in payload) {
    return {
      nextInterval: Number(payload.nextInterval),
      nextEaseFactor: Number(payload.nextEaseFactor),
      nextRepetitions: Number(payload.nextRepetitions),
      nextStatus: String(payload.nextStatus) as 'new' | 'learning' | 'review',
      dueDate: String(payload.dueDate),
    }
  }

  if (rpcError && !String(rpcError.message).includes('schema cache')) {
    console.error('[saveCardReview] record_card_review failed:', rpcError.message)
  }

  // Fallback for environments where the RPC migration has not been applied yet.
  const { data: existingRaw } = await supabase
    .from('card_progress')
    .select('*')
    .eq('user_id' as never, user.id)
    .eq('card_id' as never, cardId)
    .single()

  const existing = existingRaw as CardProgress | null
  const easeFactor = existing?.ease_factor ?? 2.5
  const intervalDays = existing?.interval_days ?? 0
  const repetitions = existing?.repetitions ?? 0

  const result = calculateNextReview(quality, easeFactor, intervalDays, repetitions)

  const upsertData: Database['public']['Tables']['card_progress']['Insert'] = {
    user_id: user.id,
    card_id: cardId,
    ease_factor: result.nextEaseFactor,
    interval_days: result.nextInterval,
    repetitions: result.nextRepetitions,
    due_date: result.dueDate,
    status: result.nextStatus as 'new' | 'learning' | 'review',
    last_reviewed_at: new Date().toISOString(),
  }

  await supabase.from('card_progress').upsert(upsertData as never, { onConflict: 'user_id,card_id' })

  return result
}

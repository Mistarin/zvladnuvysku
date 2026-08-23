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

  // Fetch existing progress or use defaults
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

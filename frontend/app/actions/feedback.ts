'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Feedback } from '@/lib/types/database'

type SubmitFeedbackInput = {
  type: Feedback['type']
  message: string
  sourceType?: Feedback['source_type']
  sourceId?: string | null
  sourceLabel?: string | null
}

type ActionResult = { success: true } | { success: false; error: string }

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

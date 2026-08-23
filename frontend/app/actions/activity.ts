'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type ActionResult = { success: true } | { success: false; error: string }

type ActivityAcknowledgementInput = {
  itemType: string
  itemId: string
  stateToken: string
}

function normalizeInput(input: ActivityAcknowledgementInput) {
  return {
    itemType: input.itemType.trim(),
    itemId: input.itemId.trim(),
    stateToken: input.stateToken.trim(),
  }
}

function validateInput(input: ReturnType<typeof normalizeInput>) {
  if (!input.itemType || !input.itemId || !input.stateToken) {
    return 'Neplatná položka aktivity.'
  }

  if (input.itemType.length > 64 || input.itemId.length > 128 || input.stateToken.length > 512) {
    return 'Položka aktivity má neplatný formát.'
  }

  return null
}

export async function markActivityItemRead(input: ActivityAcknowledgementInput): Promise<ActionResult> {
  const normalized = normalizeInput(input)
  const validationError = validateInput(normalized)

  if (validationError) {
    return { success: false, error: validationError }
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Pro tuhle akci je potřeba se přihlásit.' }
    }

    const { error } = await supabase.from('activity_acknowledgements').insert({
      user_id: user.id,
      item_type: normalized.itemType,
      item_id: normalized.itemId,
      state_token: normalized.stateToken,
    } as never)

    if (error && error.code !== '23505') {
      return { success: false, error: `Nepodařilo se uložit stav: ${error.message}` }
    }

    revalidatePath('/moje-aktivita')
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Nepodařilo se uložit stav aktivity.',
    }
  }
}

export async function markActivityItemUnread(input: ActivityAcknowledgementInput): Promise<ActionResult> {
  const normalized = normalizeInput(input)
  const validationError = validateInput(normalized)

  if (validationError) {
    return { success: false, error: validationError }
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Pro tuhle akci je potřeba se přihlásit.' }
    }

    const { error } = await supabase
      .from('activity_acknowledgements')
      .delete()
      .eq('user_id' as never, user.id)
      .eq('item_type' as never, normalized.itemType)
      .eq('item_id' as never, normalized.itemId)
      .eq('state_token' as never, normalized.stateToken)

    if (error) {
      return { success: false, error: `Nepodařilo se změnit stav: ${error.message}` }
    }

    revalidatePath('/moje-aktivita')
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Nepodařilo se změnit stav aktivity.',
    }
  }
}

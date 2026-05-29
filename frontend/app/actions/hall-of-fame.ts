'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type ActionResult = { success: true } | { success: false; error: string }

export async function upsertDisplayName(displayName: string): Promise<ActionResult> {
  const trimmed = displayName.trim()

  if (trimmed.length < 2 || trimmed.length > 40) {
    return { success: false, error: 'Veřejné jméno musí mít 2 až 40 znaků.' }
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Pro nastavení jména je potřeba se přihlásit.' }
    }

    const { error } = await supabase
      .from('profiles')
      .upsert(
        {
          user_id: user.id,
          display_name: trimmed,
        } as never,
        {
          onConflict: 'user_id',
        }
      )

    if (error) {
      return { success: false, error: `Nepodařilo se uložit jméno: ${error.message}` }
    }

    revalidatePath('/')
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Neznámá chyba při ukládání jména.',
    }
  }
}
